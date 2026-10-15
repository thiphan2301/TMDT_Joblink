package group7.joblink.dto;

public record LoginResponse(
        String token,
        UserResponse user,
        String message
) {
}