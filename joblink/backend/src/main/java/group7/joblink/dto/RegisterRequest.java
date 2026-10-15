
package group7.joblink.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record RegisterRequest(

        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        String email,

        @NotBlank(message = "Mật khẩu không được để trống")
        @Pattern(
                regexp = "^(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$",
                message = "Mật khẩu phải có ít nhất 8 ký tự, một chữ hoa, một chữ số và một ký tự đặc biệt"
        )
        String password,

        @NotBlank(message = "Vui lòng chọn vai trò")
        @Pattern(
                regexp = "^(candidate|employer)$",
                message = "Vai trò không hợp lệ"
        )
        String role
) {
}
