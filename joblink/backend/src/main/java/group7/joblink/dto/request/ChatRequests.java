package group7.joblink.dto.request;

// Dữ liệu gửi lên cho chat realtime.
public final class ChatRequests {

    private ChatRequests() {
    }

    // Mở (hoặc lấy lại) cuộc trò chuyện với một người dùng khác.
    // partnerId: id của đối phương (ứng viên hoặc nhà tuyển dụng);
    // jobId: tin tuyển dụng liên quan, có thể bỏ trống.
    public record OpenConversationRequest(
        Integer partnerId,
        Integer jobId
    ) {
    }

    // Gửi tin nhắn qua REST (đường dự phòng khi WebSocket chưa nối được).
    public record SendMessageRequest(
        String content
    ) {
    }
}
