package group7.joblink.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

// DTO cho các trang công khai theo thiết kế mới (Tổng quan ứng
// viên, trang công ty). Mọi số liệu đều truy vấn thật từ database.
public final class PublicResponses {

    private PublicResponses() {
    }

    /* -------- Tổng quan ứng viên -------- */

    public record OverviewApplication(
        Integer jobId,
        String jobTitle,
        String companyName,
        String companyLogo,
        String status,
        LocalDateTime appliedAt
    ) {
    }

    public record OverviewInterview(
        LocalDateTime scheduledAt,
        String location,
        String notes,
        String jobTitle,
        String companyName
    ) {
    }

    public record CandidateOverview(
        long appliedCount,
        long invitedCount,
        long profileViews,
        List<OverviewApplication> recentApplications,
        List<OverviewInterview> upcomingInterviews
    ) {
    }

    /* -------- Trang công ty công khai -------- */

    public record CompanyJobCard(
        Integer id,
        String title,
        BigDecimal salaryMin,
        BigDecimal salaryMax,
        String salaryUnit,
        String location,
        String jobType,
        String level,
        String skills,
        LocalDate deadline,
        LocalDateTime createdAt,
        boolean highlighted
    ) {
    }

    public record CompanyReviewRow(
        String reviewerName,
        String reviewerAvatar,
        Integer rating,
        String content,
        LocalDateTime createdAt,
        String replyContent
    ) {
    }

    public record CompanyPageResponse(
        Integer id,
        String name,
        String legalName,
        String website,
        String industry,
        String size,
        String address,
        String description,
        String logo,
        String cover,
        String verificationStatus,
        BigDecimal latitude,
        BigDecimal longitude,
        double averageRating,
        long reviewCount,
        List<Integer> ratingDistribution,
        List<CompanyJobCard> openJobs,
        List<CompanyReviewRow> reviews
    ) {
    }
}
