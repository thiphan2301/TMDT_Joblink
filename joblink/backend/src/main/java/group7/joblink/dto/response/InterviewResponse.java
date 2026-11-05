package group7.joblink.dto.response;

import group7.joblink.entity.InterviewInvitation;

import java.time.LocalDateTime;

// Lời mời phỏng vấn của một đơn. status: pending (chờ ứng viên phản hồi),
// accepted (ứng viên xác nhận tham gia), declined (ứng viên từ chối lịch).
public record InterviewResponse(
    Integer id,
    Integer applicationId,
    LocalDateTime scheduledAt,
    String location,
    String notes,
    String status
) {

    public static InterviewResponse from(InterviewInvitation invitation) {
        return new InterviewResponse(
                invitation.getId(),
                invitation.getApplication().getId(),
                invitation.getScheduledAt(),
                invitation.getLocation(),
                invitation.getNotes(),
                invitation.getStatus().name()
        );
    }
}
