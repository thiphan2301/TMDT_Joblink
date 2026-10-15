package group7.joblink.controller;

import group7.joblink.dto.request.GoogleLoginRequest;
import group7.joblink.dto.response.AuthUserResponse;
import group7.joblink.service.AuthService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

// Đăng nhập lưu bằng HttpSession: sau khi đăng nhập, server giữ id người dùng
// trong session (cookie JSESSIONID). Controller khác lấy người dùng hiện tại qua
// CurrentUser.requireId(request).
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/google")
    public AuthUserResponse loginWithGoogle(
            @RequestBody GoogleLoginRequest body,
            HttpServletRequest request) {

        if (body.credential() == null || body.credential().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Thiếu thông tin đăng nhập Google."
            );
        }

        AuthUserResponse user =
                authService.loginWithGoogle(body.credential(), body.role());

        startSession(request, user.id());

        return user;
    }

    @GetMapping("/me")
    public AuthUserResponse getCurrentUser(HttpServletRequest request) {
        Integer userId = CurrentUser.requireId(request);

        try {
            return authService.getCurrentUser(userId);
        } catch (ResponseStatusException exception) {
            // Tài khoản bị xóa hoặc bị khóa: hủy phiên hiện tại.
            request.getSession().invalidate();
            throw exception;
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);

        if (session != null) {
            session.invalidate();
        }

        return ResponseEntity.noContent().build();
    }

    // Luôn tạo session mới khi đăng nhập để không dùng lại session id cũ.
    private void startSession(HttpServletRequest request, Integer userId) {
        HttpSession oldSession = request.getSession(false);

        if (oldSession != null) {
            oldSession.invalidate();
        }

        request.getSession(true)
                .setAttribute(AuthService.SESSION_USER_ID, userId);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleAuthError(
            ResponseStatusException exception) {

        String message = exception.getReason() == null
                ? "Không thể đăng nhập."
                : exception.getReason();

        return ResponseEntity
                .status(exception.getStatusCode())
                .body(Map.of("message", message));
    }
}
