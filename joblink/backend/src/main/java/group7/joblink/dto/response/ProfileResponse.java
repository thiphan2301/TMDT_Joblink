package group7.joblink.dto.response;

import java.time.LocalDate;
import java.util.List;

// Thông tin cá nhân của ứng viên đang đăng nhập.
public record ProfileResponse(
    Integer userId,
    String email,
    String fullName,
    String phone,
    LocalDate dob,
    String address,
    String avatar,
    String summary,
    boolean searchable,
    List<String> skills
) {
}
