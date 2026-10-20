package group7.joblink.dto.request;

// Admin đặt lại mật khẩu cho một tài khoản: mật khẩu mới dạng thô,
// service sẽ băm BCrypt trước khi lưu (không bao giờ lưu dạng thô).
public record AdminPasswordRequest(
    String newPassword
) {
}
