package group7.joblink.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyOtpRequest(
        @NotBlank
        @Email
        String email,

        @NotBlank
        @Pattern(
                regexp = "[0-9]{6}",
                message = "OTP phải gồm 6 chữ số"
        )
        String otp
) {
}