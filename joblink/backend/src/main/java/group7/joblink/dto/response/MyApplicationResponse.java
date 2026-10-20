package group7.joblink.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

// Một đơn ứng tuyển của ứng viên đang đăng nhập, kèm lịch sử trạng thái
// và lời mời phỏng vấn (nếu có).
// status: pending | viewed | invited | rejected | hired
public record MyApplicationResponse(
    Integer id,
    String status,
    LocalDateTime appliedAt,
    LocalDateTime updatedAt,

    Integer jobId,
    String jobTitle,
    String jobLocation,
    BigDecimal salaryMin,
    BigDecimal salaryMax,
    String salaryUnit,

    Integer companyId,
    String companyName,
    String companyLogo,

    String cvFileName,

    List<StatusChange> history,
    Interview interview
) {

    // Một lần đổi trạng thái (VD: viewed -> invited).
    public record StatusChange(
        String fromStatus,
        String toStatus,
        LocalDateTime changedAt,
        String note
    ) {
    }

    // Lời mời phỏng vấn mới nhất của đơn.
    // status: pending | accepted | declined
    public record Interview(
        LocalDateTime scheduledAt,
        String location,
        String notes,
        String status
    ) {
    }
}
