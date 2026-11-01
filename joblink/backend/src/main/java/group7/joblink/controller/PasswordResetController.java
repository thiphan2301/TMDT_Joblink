package group7.joblink.controller;

import group7.joblink.service.PasswordResetService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class PasswordResetController {
    private final PasswordResetService service;
    public PasswordResetController(PasswordResetService service) { this.service = service; }
    public record ForgotRequest(@NotBlank @Email @Size(max = 255) String email) {}
    public record ResetRequest(@NotBlank @Size(max = 100) String token,
                               @NotBlank @Size(max = 72) String password) {}

    @PostMapping("/forgot-password")
    public Map<String, String> forgot(@Valid @RequestBody ForgotRequest body) {
        service.request(body.email());
        return Map.of("message", "Nếu email có tài khoản đang hoạt động, liên kết đặt lại mật khẩu sẽ được gửi. Hãy kiểm tra cả thư rác; chờ ít nhất 1 phút trước khi gửi lại.");
    }

    @PostMapping("/reset-password")
    public Map<String, String> reset(@Valid @RequestBody ResetRequest body) {
        service.reset(body.token(), body.password());
        return Map.of("message", "Đổi mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.");
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> error(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> mailError() {
        return ResponseEntity.status(503).body(Map.of("message", "Hiện chưa gửi được email. Vui lòng thử lại sau."));
    }
}
