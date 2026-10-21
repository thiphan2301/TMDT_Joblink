package group7.joblink.dto.request;

// Dữ liệu gửi lên cho khu vực ứng viên.
public final class CandidateRequests {

    private CandidateRequests() {
    }

    public record AssistantChatRequest(
        String message
    ) {
    }
}
