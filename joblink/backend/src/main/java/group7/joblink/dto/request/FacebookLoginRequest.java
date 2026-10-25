package group7.joblink.dto.request;

// accessToken: access token Facebook SDK trả về cho frontend sau khi đăng nhập.
// role: vai trò khi đăng ký mới ("candidate" hoặc "employer"), có thể bỏ trống.
public record FacebookLoginRequest(
    String accessToken,
    String role
) {
}
