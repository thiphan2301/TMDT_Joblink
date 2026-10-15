package group7.joblink.controller;

import group7.joblink.dto.request.UpdateProfileRequest;
import group7.joblink.dto.response.ProfileResponse;
import group7.joblink.service.ProfileService;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

// Thông tin cá nhân của ứng viên đang đăng nhập.
@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public ProfileResponse getMyProfile(HttpServletRequest request) {
        return profileService.getProfile(CurrentUser.requireId(request));
    }

    @PutMapping
    public ProfileResponse updateMyProfile(
            @RequestBody UpdateProfileRequest body,
            HttpServletRequest request) {

        return profileService.updateProfile(
                CurrentUser.requireId(request),
                body);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleProfileError(
            ResponseStatusException exception) {

        String message = exception.getReason() == null
                ? "Không thể cập nhật hồ sơ."
                : exception.getReason();

        return ResponseEntity
                .status(exception.getStatusCode())
                .body(Map.of("message", message));
    }

    // JSON sai định dạng (VD: ngày sinh không đúng yyyy-MM-dd).
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> handleInvalidBody() {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", "Dữ liệu gửi lên không hợp lệ."));
    }
}
