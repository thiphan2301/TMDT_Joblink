package group7.joblink.dto.request;

// credential: ID token Google trả về cho frontend.
// role: vai trò khi đăng ký mới ("candidate" hoặc "employer"), có thể bỏ trống.
public record GoogleLoginRequest(
    String credential,
    String role
) {
}
