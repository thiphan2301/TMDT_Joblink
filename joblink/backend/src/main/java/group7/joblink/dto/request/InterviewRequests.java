package group7.joblink.dto.request;

import java.time.LocalDateTime;

// Body các API mời phỏng vấn / từ chối / phản hồi lịch phỏng vấn.
public final class InterviewRequests {

    private InterviewRequests() {
    }

    // Nhà tuyển dụng mời phỏng vấn. scheduledAt dạng "2026-11-10T09:30" (giờ Việt Nam).
    public record InviteRequest(
        LocalDateTime scheduledAt,
        String location,
        String notes
    ) {
    }

    // Nhà tuyển dụng từ chối hồ sơ; reason có thể bỏ trống.
    public record RejectRequest(
        String reason
    ) {
    }

    // Ứng viên phản hồi lời mời: "accepted" hoặc "declined".
    public record RespondRequest(
        String response
    ) {
    }
}
