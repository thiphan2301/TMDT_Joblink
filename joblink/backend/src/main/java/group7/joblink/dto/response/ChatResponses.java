package group7.joblink.dto.response;

import java.time.LocalDateTime;

// Dữ liệu trả về cho chat realtime (dùng chung cho ứng viên và nhà
// tuyển dụng — "partner" luôn là phía còn lại của cuộc trò chuyện).
public final class ChatResponses {

    private ChatResponses() {
    }

    public record ConversationRow(
            Integer id,
            Integer candidateId,
            Integer employerId,
            Integer jobId,
            String jobTitle,
            Integer partnerId,
            String partnerName,
            String partnerAvatar,
            String lastMessage,
            LocalDateTime lastMessageAt,
            long unread,
            LocalDateTime createdAt
    ) {
    }

    public record MessageRow(
            Integer id,
            Integer conversationId,
            Integer senderId,
            boolean mine,          // tin này do chính người đang xem gửi
            String content,
            boolean read,
            LocalDateTime sentAt,
            String imageUrl        // ảnh đính kèm (tin chữ thì null)
    ) {
    }

    // Ngữ cảnh tuyển dụng của một cuộc trò chuyện (panel bên phải
    // trang Tin nhắn của ứng viên): tin tuyển dụng gắn với cuộc trò
    // chuyện, trạng thái đơn của ứng viên và lịch phỏng vấn sắp tới.
    // Các trường tin/đơn/lịch đều null khi chưa có dữ liệu tương ứng.
    public record ConversationContext(
            Integer jobId,
            String jobTitle,
            String companyName,
            java.math.BigDecimal salaryMin,
            java.math.BigDecimal salaryMax,
            String salaryUnit,
            String location,
            String applicationStatus,
            LocalDateTime appliedAt,
            LocalDateTime nextInterviewAt,
            String nextInterviewLocation,
            String nextInterviewNotes
    ) {
    }
}