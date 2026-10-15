package group7.joblink.dto.request;

import java.time.LocalDate;
import java.util.List;

// Dữ liệu ứng viên gửi lên khi cập nhật thông tin cá nhân.
// dob dạng "yyyy-MM-dd"; skills là danh sách tên kỹ năng.
public record UpdateProfileRequest(
    String fullName,
    String phone,
    LocalDate dob,
    String address,
    String summary,
    Boolean searchable,
    List<String> skills
) {
}
