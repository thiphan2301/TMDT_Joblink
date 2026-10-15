
package group7.joblink.service;

import group7.joblink.dto.LoginRequest;
import group7.joblink.dto.LoginResponse;
import group7.joblink.dto.RegisterRequest;
import group7.joblink.dto.RegisterResponse;
import group7.joblink.dto.UserResponse;
import group7.joblink.entity.User;
import group7.joblink.repository.UserRepository;
import group7.joblink.security.JwtService;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final OtpService otpService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            OtpService otpService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.otpService = otpService;
    }

    // Đăng ký: chỉ gửi OTP
    public RegisterResponse register(RegisterRequest request) {
        return otpService.startRegistration(request);
    }

    // Kiểm tra OTP và tạo tài khoản
    public RegisterResponse verifyOtp(String email, String otp) {
        return otpService.verify(email, otp);
    }

    // Gửi lại OTP
    public RegisterResponse resendOtp(String email) {
        return otpService.resend(email);
    }

    // Đăng nhập bình thường
    public LoginResponse login(LoginRequest request) {

        String email = request.email()
                .trim()
                .toLowerCase(Locale.ROOT);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Email hoặc mật khẩu không chính xác"
                ));

        if (!"active".equalsIgnoreCase(user.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản đã bị khóa"
            );
        }

        if (!passwordEncoder.matches(
                request.password(),
                user.getPasswordHash()
        )) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Email hoặc mật khẩu không chính xác"
            );
        }

        String token = jwtService.generateToken(user);

        UserResponse userResponse = new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getRole()
        );

        return new LoginResponse(
                token,
                userResponse,
                "Đăng nhập thành công"
        );
    }
}
