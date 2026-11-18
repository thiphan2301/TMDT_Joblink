package group7.joblink.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CandidateTokenPurchaseRequest(
        @NotNull @Positive Integer packageId
) {
}
