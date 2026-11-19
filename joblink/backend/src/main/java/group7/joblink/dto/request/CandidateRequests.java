package group7.joblink.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Dữ liệu gửi lên cho khu vực ứng viên.
public final class CandidateRequests {

    private CandidateRequests() {
    }

    public record AssistantChatRequest(
        @NotBlank
        @Size(max = 500)
        String message
    ) {
    }
}
