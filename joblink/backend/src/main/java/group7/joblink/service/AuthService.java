
package group7.joblink.service;

import group7.joblink.dto.*;
import group7.joblink.dto.response.AuthUserResponse;
import group7.joblink.entity.CandidateProfile;
import group7.joblink.entity.SocialAccount;
import group7.joblink.entity.User;
import group7.joblink.repository.CandidateProfileRepository;
import group7.joblink.repository.SocialAccountRepository;
import group7.joblink.repository.UserRepository;
import group7.joblink.security.JwtService;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Locale;

@Service
public class AuthService {

    public static final String SESSION_USER_ID = "userId";

    private static final int AVATAR_MAX_LENGTH = 500;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwtService;
    private final OtpService otpService;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final FacebookTokenVerifier facebookTokenVerifier;
    private final CandidateProfileRepository candidateProfiles;
    private final SocialAccountRepository socialAccounts;

    public AuthService(
            UserRepository users,
            PasswordEncoder encoder,
            JwtService jwtService,
            OtpService otpService,
            GoogleTokenVerifier googleTokenVerifier,
            FacebookTokenVerifier facebookTokenVerifier,
            CandidateProfileRepository candidateProfiles,
            SocialAccountRepository socialAccounts
    ) {
        this.users = users;
        this.encoder = encoder;
        this.jwtService = jwtService;
        this.otpService = otpService;
        this.googleTokenVerifier = googleTokenVerifier;
        this.facebookTokenVerifier = facebookTokenVerifier;
        this.candidateProfiles = candidateProfiles;
        this.socialAccounts = socialAccounts;
    }

    // ======================================
    // ĐĂNG KÝ EMAIL VÀ OTP
    // ======================================

    public RegisterResponse register(RegisterRequest body) {
        return otpService.startRegistration(body);
    }

    public RegisterResponse verifyOtp(String email, String otp) {
        return otpService.verify(email, otp);
    }

    public RegisterResponse resendOtp(String email) {
        return otpService.resend(email);
    }

    // ======================================
    // ĐĂNG NHẬP EMAIL + PASSWORD
    // ======================================

    public LoginResponse login(LoginRequest body) {
        return loginUser(body).response();
    }

    public record PasswordLogin(
            Integer userId,
            LoginResponse response
    ) {}

    public PasswordLogin loginUser(LoginRequest body) {

        String email = normalizeEmail(body.email());

        User user = users.findByEmail(email)
                .orElseThrow(() -> err(
                        HttpStatus.UNAUTHORIZED,
                        "Email hoặc mật khẩu không chính xác"
                ));

        ensureActive(user);

        if (body.password() == null
                || user.getPasswordHash() == null
                || !encoder.matches(
                body.password(),
                user.getPasswordHash()
        )) {
            throw err(
                    HttpStatus.UNAUTHORIZED,
                    "Email hoặc mật khẩu không chính xác"
            );
        }

        String token = jwtService.generateToken(user);

        // Enum -> String
        UserResponse view = new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getRole().name()
        );

        LoginResponse response = new LoginResponse(
                token,
                view,
                "Đăng nhập thành công"
        );

        return new PasswordLogin(user.getId(), response);
    }

    // ======================================
    // ĐĂNG NHẬP GOOGLE
    // ======================================

    @Transactional
    public AuthUserResponse loginWithGoogle(
            String credential,
            String requestedRole
    ) {

        GoogleTokenVerifier.GoogleProfile profile =
                googleTokenVerifier.verify(credential);

        if (profile.email() == null || !profile.emailVerified()) {
            throw err(
                    HttpStatus.UNAUTHORIZED,
                    "Email Google chưa xác minh"
            );
        }

        return loginWithSocial(
                SocialAccount.Provider.google,
                new SocialProfile(
                        profile.googleId(),
                        profile.email(),
                        profile.name(),
                        profile.picture()
                ),
                requestedRole
        );
    }

    // ======================================
    // ĐĂNG NHẬP FACEBOOK
    // ======================================

    @Transactional
    public AuthUserResponse loginWithFacebook(
            String accessToken,
            String requestedRole
    ) {

        FacebookTokenVerifier.FacebookProfile profile =
                facebookTokenVerifier.verify(accessToken);

        // Email Facebook có thể trống: chỉ bắt buộc khi
        // cần tạo hoặc liên kết tài khoản lần đầu.
        return loginWithSocial(
                SocialAccount.Provider.facebook,
                new SocialProfile(
                        profile.facebookId(),
                        profile.email(),
                        profile.name(),
                        profile.picture()
                ),
                requestedRole
        );
    }

    // Thông tin chung của tài khoản Google/Facebook đã xác thực.
    private record SocialProfile(
            String providerUserId,
            String email,
            String name,
            String picture
    ) {}

    // Đã liên kết thì đăng nhập luôn; chưa thì liên kết theo email
    // (hoặc tạo tài khoản mới nếu email chưa có trong hệ thống).
    private AuthUserResponse loginWithSocial(
            SocialAccount.Provider provider,
            SocialProfile profile,
            String requestedRole
    ) {

        User user = socialAccounts
                .findByProviderAndProviderUserId(
                        provider,
                        profile.providerUserId()
                )
                .map(SocialAccount::getUser)
                .orElseGet(() -> linkSocialAccount(
                        provider,
                        profile,
                        requestedRole
                ));

        ensureActive(user);

        return toResponse(user);
    }

    // ======================================
    // LẤY USER HIỆN TẠI
    // ======================================

    @Transactional(readOnly = true)
    public AuthUserResponse getCurrentUser(Integer userId) {

        User user = users.findById(userId)
                .orElseThrow(() -> err(
                        HttpStatus.UNAUTHORIZED,
                        "Phiên đăng nhập không hợp lệ"
                ));

        ensureActive(user);

        return toResponse(user);
    }

    // ======================================
    // LIÊN KẾT TÀI KHOẢN GOOGLE / FACEBOOK
    // ======================================

    private User linkSocialAccount(
            SocialAccount.Provider provider,
            SocialProfile profile,
            String requestedRole
    ) {

        if (profile.email() == null || profile.email().isBlank()) {
            throw err(
                    HttpStatus.BAD_REQUEST,
                    "Tài khoản " + providerName(provider)
                            + " chưa chia sẻ email. Vui lòng cho phép JobLink xem email"
                            + " hoặc đăng ký bằng email."
            );
        }

        String email = normalizeEmail(profile.email());

        User user = users.findByEmail(email)
                .orElseGet(() -> createSocialUser(
                        profile,
                        email,
                        requestedRole
                ));

        if (socialAccounts.existsByUser_IdAndProvider(
                user.getId(),
                provider
        )) {
            throw err(
                    HttpStatus.CONFLICT,
                    "Email đã liên kết với tài khoản "
                            + providerName(provider) + " khác"
            );
        }

        socialAccounts.save(new SocialAccount(
                user,
                provider,
                profile.providerUserId()
        ));

        return user;
    }

    private String providerName(SocialAccount.Provider provider) {
        return provider == SocialAccount.Provider.facebook
                ? "Facebook"
                : "Google";
    }

    // ======================================
    // TẠO TÀI KHOẢN GOOGLE / FACEBOOK
    // ======================================

    private User createSocialUser(
            SocialProfile profile,
            String email,
            String role
    ) {

        User user = new User();

        user.setEmail(email);

        // String -> Enum
        user.setRole(
                "employer".equalsIgnoreCase(role)
                        ? User.Role.employer
                        : User.Role.candidate
        );

        user.setStatus(User.Status.active);

        // Giữ tương thích nếu password_hash
        // trong database đang là NOT NULL.
        byte[] secret = new byte[32];
        RANDOM.nextBytes(secret);

        String randomPassword = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(secret);

        user.setPasswordHash(
                encoder.encode(randomPassword)
        );

        users.saveAndFlush(user);

        // Chỉ tạo CandidateProfile cho ứng viên
        if (user.getRole() == User.Role.candidate) {

            String fullName =
                    profile.name() == null
                            || profile.name().isBlank()
                            ? email.substring(0, email.indexOf('@'))
                            : profile.name().trim();

            String avatar =
                    profile.picture() != null
                            && profile.picture().length() <= AVATAR_MAX_LENGTH
                            ? profile.picture()
                            : null;

            candidateProfiles.save(
                    new CandidateProfile(
                            user.getId(),
                            fullName,
                            avatar
                    )
            );
        }

        return user;
    }

    // ======================================
    // CHUYỂN USER -> AUTH RESPONSE
    // ======================================

    private AuthUserResponse toResponse(User user) {

        CandidateProfile profile =
                user.getRole() == User.Role.candidate
                        ? candidateProfiles.findById(user.getId())
                        .orElse(null)
                        : null;

        return new AuthUserResponse(
                user.getId(),
                user.getEmail(),
                user.getRole().name(),
                profile == null ? null : profile.getFullName(),
                profile == null ? null : profile.getAvatar()
        );
    }

    // ======================================
    // KIỂM TRA TÀI KHOẢN
    // ======================================

    private void ensureActive(User user) {

        if (user.getStatus() != User.Status.active) {
            throw err(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản đã bị khóa"
            );
        }
    }

    private String normalizeEmail(String email) {

        if (email == null || email.isBlank()) {
            throw err(
                    HttpStatus.BAD_REQUEST,
                    "Email không hợp lệ"
            );
        }

        return email.trim().toLowerCase(Locale.ROOT);
    }

    private ResponseStatusException err(
            HttpStatus status,
            String message
    ) {
        return new ResponseStatusException(
                status,
                message
        );
    }
}
