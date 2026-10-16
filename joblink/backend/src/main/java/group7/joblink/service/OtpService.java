
package group7.joblink.service;

import group7.joblink.dto.RegisterRequest;
import group7.joblink.dto.RegisterResponse;
import group7.joblink.entity.EmailOtp;
import group7.joblink.entity.User;
import group7.joblink.repository.EmailOtpRepository;
import group7.joblink.repository.UserRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;

@Service
public class OtpService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private static final Duration RESEND_COOLDOWN =
            Duration.ofSeconds(60);

    private static final int MAX_ATTEMPTS = 5;
    private static final int MAX_SENDS = 5;

    private final Duration otpLifetime;

    private final EmailOtpRepository otpRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public OtpService(
            EmailOtpRepository otpRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService,
            @Value("${app.otp.expiration-minutes:5}")
            long expirationMinutes
    ) {
        if (expirationMinutes < 1 || expirationMinutes > 30) {
            throw new IllegalArgumentException(
                    "Thời gian OTP phải từ 1 đến 30 phút"
            );
        }

        this.otpLifetime = Duration.ofMinutes(expirationMinutes);
        this.otpRepository = otpRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw error(
                    HttpStatus.BAD_REQUEST,
                    "Email không hợp lệ"
            );
        }

        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static ResponseStatusException error(
            HttpStatus status,
            String message
    ) {
        return new ResponseStatusException(status, message);
    }

    private String generateOtp() {
        return String.format(
                Locale.ROOT,
                "%06d",
                RANDOM.nextInt(1_000_000)
        );
    }

    // ==================================
    // BƯỚC 1: ĐĂNG KÝ VÀ GỬI OTP
    // ==================================

    @Transactional
    public RegisterResponse startRegistration(
            RegisterRequest request
    ) {
        String email = normalizeEmail(request.email());

        String role = request.role() == null
                ? ""
                : request.role().trim().toLowerCase(Locale.ROOT);

        if (!role.equals("candidate")
                && !role.equals("employer")) {
            throw error(
                    HttpStatus.BAD_REQUEST,
                    "Vai trò không hợp lệ"
            );
        }

        if (request.password() == null
                || request.password().length() < 8) {
            throw error(
                    HttpStatus.BAD_REQUEST,
                    "Mật khẩu phải có ít nhất 8 ký tự"
            );
        }

        if (userRepository.existsByEmail(email)) {
            throw error(
                    HttpStatus.CONFLICT,
                    "Email này đã được đăng ký"
            );
        }

        Instant now = Instant.now();

        EmailOtp pending = otpRepository
                .findLockedByEmail(email)
                .orElse(null);

        if (pending != null) {
            if (now.isBefore(
                    pending.getLastSentAt().plus(RESEND_COOLDOWN)
            )) {
                throw error(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Vui lòng đợi 60 giây trước khi gửi OTP mới"
                );
            }

            if (now.isAfter(
                    pending.getLastSentAt().plus(
                            Duration.ofHours(24)
                    )
            )) {
                pending.setSendCount(0);
            }

            if (pending.getSendCount() >= MAX_SENDS) {
                throw error(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Đã vượt quá số lượt gửi OTP cho phép"
                );
            }
        } else {
            pending = new EmailOtp();
            pending.setEmail(email);
            pending.setSendCount(0);
        }

        String code = generateOtp();

        pending.setPasswordHash(
                passwordEncoder.encode(request.password())
        );
        pending.setRole(role);
        pending.setOtpHash(passwordEncoder.encode(code));
        pending.setExpiresAt(now.plus(otpLifetime));
        pending.setLastSentAt(now);
        pending.setAttempts(0);
        pending.setSendCount(pending.getSendCount() + 1);

        otpRepository.saveAndFlush(pending);

        emailService.sendOtp(email, code);

        return new RegisterResponse(
                "Mã OTP đã gửi đến email. "
                + "Mã có hiệu lực "
                + otpLifetime.toMinutes()
                + " phút."
        );
    }

    // ==================================
    // BƯỚC 2: XÁC THỰC OTP
    // ==================================

    @Transactional(
            noRollbackFor = ResponseStatusException.class
    )
    public RegisterResponse verify(
            String emailInput,
            String code
    ) {
        String email = normalizeEmail(emailInput);

        EmailOtp pending = otpRepository
                .findLockedByEmail(email)
                .orElseThrow(() -> error(
                        HttpStatus.BAD_REQUEST,
                        "Không tìm thấy yêu cầu xác thực"
                ));

        if (!Instant.now().isBefore(pending.getExpiresAt())) {
            throw error(
                    HttpStatus.BAD_REQUEST,
                    "OTP đã hết hạn. Vui lòng gửi lại mã"
            );
        }

        if (pending.getAttempts() >= MAX_ATTEMPTS) {
            throw error(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Nhập sai quá nhiều lần. Vui lòng gửi lại OTP"
            );
        }

        if (code == null
                || !code.matches("[0-9]{6}")
                || !passwordEncoder.matches(
                        code,
                        pending.getOtpHash()
                )) {

            pending.setAttempts(pending.getAttempts() + 1);
            otpRepository.save(pending);

            throw error(
                    HttpStatus.BAD_REQUEST,
                    "Mã OTP không chính xác"
            );
        }

        if (userRepository.existsByEmail(email)) {
            throw error(
                    HttpStatus.CONFLICT,
                    "Email đã có tài khoản"
            );
        }

        User user = new User();

        user.setEmail(email);
        user.setPasswordHash(pending.getPasswordHash());
        user.setRole(
                User.Role.valueOf(pending.getRole())
        );

        user.setStatus(User.Status.active);

        userRepository.saveAndFlush(user);

        // OTP chỉ được dùng một lần.
        otpRepository.delete(pending);

        return new RegisterResponse(
                "Xác thực email thành công! Vui lòng đăng nhập."
        );
    }

    // ==================================
    // BƯỚC 3: GỬI LẠI OTP
    // ==================================

    @Transactional
    public RegisterResponse resend(String emailInput) {

        String email = normalizeEmail(emailInput);

        EmailOtp pending = otpRepository
                .findLockedByEmail(email)
                .orElseThrow(() -> error(
                        HttpStatus.BAD_REQUEST,
                        "Không tìm thấy yêu cầu đăng ký"
                ));

        if (userRepository.existsByEmail(email)) {
            throw error(
                    HttpStatus.CONFLICT,
                    "Email đã có tài khoản"
            );
        }

        Instant now = Instant.now();

        if (now.isBefore(
                pending.getLastSentAt().plus(RESEND_COOLDOWN)
        )) {
            throw error(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Vui lòng đợi 60 giây trước khi gửi lại"
            );
        }

        if (now.isAfter(
                pending.getLastSentAt().plus(
                        Duration.ofHours(24)
                )
        )) {
            pending.setSendCount(0);
        }

        if (pending.getSendCount() >= MAX_SENDS) {
            throw error(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Đã vượt quá số lượt gửi OTP cho phép"
            );
        }

        String code = generateOtp();

        pending.setOtpHash(passwordEncoder.encode(code));
        pending.setExpiresAt(now.plus(otpLifetime));
        pending.setLastSentAt(now);
        pending.setAttempts(0);
        pending.setSendCount(pending.getSendCount() + 1);

        otpRepository.saveAndFlush(pending);

        emailService.sendOtp(email, code);

        return new RegisterResponse(
                "Đã gửi lại OTP. Mã có hiệu lực "
                + otpLifetime.toMinutes()
                + " phút."
        );
    }
}
