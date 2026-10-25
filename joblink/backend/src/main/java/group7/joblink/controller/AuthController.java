package group7.joblink.controller;

import group7.joblink.dto.*;
import group7.joblink.dto.request.FacebookLoginRequest;
import group7.joblink.dto.request.GoogleLoginRequest;
import group7.joblink.dto.response.AuthUserResponse;
import group7.joblink.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest body) {
        // Chưa tạo user cho tới khi verify-otp thành công.
        return ResponseEntity.ok(authService.register(body));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<RegisterResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest body) {
        return ResponseEntity.ok(authService.verifyOtp(body.email(), body.otp()));
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<RegisterResponse> resendOtp(@Valid @RequestBody ResendOtpRequest body) {
        return ResponseEntity.ok(authService.resendOtp(body.email()));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest body,
                                               HttpServletRequest request) {
        AuthService.PasswordLogin loggedIn = authService.loginUser(body);
        startSession(request, loggedIn.userId());
        // Vẫn trả JWT + user cho Login.jsx hiện tại.
        return ResponseEntity.ok(loggedIn.response());
    }

    @PostMapping("/google")
    public AuthUserResponse loginWithGoogle(@Valid @RequestBody GoogleLoginRequest body,
                                            HttpServletRequest request) {
        if (body.credential() == null || body.credential().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu Google ID token");
        }
        AuthUserResponse user = authService.loginWithGoogle(body.credential(), body.role());
        startSession(request, user.id());
        return user;
    }

    @PostMapping("/facebook")
    public AuthUserResponse loginWithFacebook(@Valid @RequestBody FacebookLoginRequest body,
                                              HttpServletRequest request) {
        if (body.accessToken() == null || body.accessToken().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu access token Facebook");
        }
        AuthUserResponse user = authService.loginWithFacebook(body.accessToken(), body.role());
        startSession(request, user.id());
        return user;
    }

    @GetMapping("/me")
    public AuthUserResponse me(HttpServletRequest request) {
        Integer id = getSessionUserId(request);
        try {
            return authService.getCurrentUser(id);
        } catch (ResponseStatusException e) {
            HttpSession session = request.getSession(false);
            if (session != null) session.invalidate();
            throw e;
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        return ResponseEntity.noContent().build();
    }

    private Integer getSessionUserId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        Object value = session == null ? null : session.getAttribute(AuthService.SESSION_USER_ID);
        if (!(value instanceof Integer id)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập");
        }
        return id;
    }

    private void startSession(HttpServletRequest request, Integer userId) {
        HttpSession previous = request.getSession(false);
        if (previous != null) previous.invalidate();
        request.getSession(true).setAttribute(AuthService.SESSION_USER_ID, userId);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleError(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
                .body(Map.of("message", ex.getReason() == null ? "Yêu cầu không thành công" : ex.getReason()));
    }
}
