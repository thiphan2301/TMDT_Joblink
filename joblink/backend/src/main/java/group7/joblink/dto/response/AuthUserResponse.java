package group7.joblink.dto.response;

// Thông tin người dùng đang đăng nhập trả về frontend.
// fullName, avatar chỉ có với ứng viên (lấy từ candidate_profiles).
public record AuthUserResponse(
    Integer id,
    String email,
    String role,
    String fullName,
    String avatar
) {
}
