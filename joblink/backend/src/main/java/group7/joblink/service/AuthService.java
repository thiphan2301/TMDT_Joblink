
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

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    // ================= ĐĂNG KÝ =================

    public RegisterResponse register(RegisterRequest request) {

        String email = request.email()
                .trim()
                .toLowerCase(Locale.ROOT);

        // Kiểm tra email đã tồn tại
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email này đã được đăng ký"
            );
        }

        String role = request.role()
                .trim()
                .toLowerCase(Locale.ROOT);

        // Chỉ cho phép đăng ký ứng viên hoặc nhà tuyển dụng
        if (!role.equals("candidate")
                && !role.equals("employer")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Vai trò đăng ký không hợp lệ"
            );
        }

        // Tạo tài khoản mới
        User user = new User();
        user.setEmail(email);

        // Mã hóa mật khẩu trước khi lưu database
        user.setPasswordHash(
                passwordEncoder.encode(request.password())
        );

        user.setRole(role);
        user.setStatus("active");

        userRepository.save(user);

        return new RegisterResponse(
                "Đăng ký thành công! Vui lòng đăng nhập."
        );
    }

    // ================= ĐĂNG NHẬP =================

    public LoginResponse login(LoginRequest request) {

        String email = request.email()
                .trim()
                .toLowerCase(Locale.ROOT);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Email hoặc mật khẩu không chính xác"
                ));

        // Kiểm tra trạng thái tài khoản
        if (!"active".equalsIgnoreCase(user.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản đã bị khóa"
            );
        }

        // Kiểm tra mật khẩu BCrypt
        if (!passwordEncoder.matches(
                request.password(),
                user.getPasswordHash()
        )) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Email hoặc mật khẩu không chính xác"
            );
        }

        // Tạo JWT khi đăng nhập thành công
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
