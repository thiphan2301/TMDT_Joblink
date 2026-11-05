package group7.joblink.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CompanyReviewRequest (
        @Min(1)
        @Max(5)
        Integer rating,

        @NotBlank(message = "Nội dung đánh giá không được để trống.")
        @Size(max = 5000, message = "Nội dung đánh giá không được vượt quá 5000 ký tự.")
        String content
){}
