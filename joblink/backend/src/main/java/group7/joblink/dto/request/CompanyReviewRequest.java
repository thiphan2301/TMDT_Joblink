package group7.joblink.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record CompanyReviewRequest (
        @Min(1)
        @Max(5)
        int rating,

        @NotBlank
        String content
){}
