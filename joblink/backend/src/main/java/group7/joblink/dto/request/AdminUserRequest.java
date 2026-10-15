package group7.joblink.dto.request;

// Dữ liệu admin gửi lên khi thêm / sửa người dùng.
// password chỉ dùng khi tạo mới (để trống -> mật khẩu mặc định "123456" ở service).
public record AdminUserRequest(
    String fullName,
    String email,
    String role,
    String password
) {
}
