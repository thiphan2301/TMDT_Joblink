
package group7.joblink.controller;

import group7.joblink.dto.LoginRequest;
import group7.joblink.dto.LoginResponse;
import group7.joblink.dto.RegisterRequest;
import group7.joblink.dto.RegisterResponse;
import group7.joblink.dto.VerifyOtpRequest;
import group7.joblink.dto.ResendOtpRequest;
import group7.joblink.service.AuthService;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // Gửi OTP tới email đăng ký
    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        return ResponseEntity.ok(
                authService.register(request)
        );
    }

    // Xác thực OTP rồi tạo tài khoản
    @PostMapping("/verify-otp")
    public ResponseEntity<RegisterResponse> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request
    ) {
        return ResponseEntity.ok(
                authService.verifyOtp(
                        request.email(),
                        request.otp()
                )
        );
    }

    // Gửi lại OTP
    @PostMapping("/resend-otp")
    public ResponseEntity<RegisterResponse> resendOtp(
            @Valid @RequestBody ResendOtpRequest request
    ) {
        return ResponseEntity.ok(
                authService.resendOtp(request.email())
        );
    }

    // Đăng nhập
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request
    ) {
        return ResponseEntity.ok(
                authService.login(request)
        );
    }
}
