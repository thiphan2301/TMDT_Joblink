package group7.joblink.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

// Dữ liệu trả về cho khu vực nhà tuyển dụng (/api/employer/**).
public final class EmployerResponses {

    private EmployerResponses() {
    }

    /* ---------------- Tổng quan ---------------- */

    public record Dashboard(
            long totalJobs,
            long openJobs,
            long totalApplications,
            long newApplications,      // đơn ứng tuyển trong 7 ngày gần nhất
            long pendingApplications,  // đơn đang chờ xử lý
            long invitedApplications,  // đơn đang ở vòng phỏng vấn
            Integer walletBalance,
            String plan,                // premium | pro | basic
            String planPackageName,
            LocalDateTime planEndsAt,   // null khi đang dùng Basic mặc định
            long unreadMessages,        // tin nhắn chưa đọc (mọi cuộc trò chuyện)
            String companyName,         // công ty chính (để chào ở đầu trang)
            int companyCompleteness,    // % hoàn thiện hồ sơ công ty chính
            List<RecentApplication> recentApplications,
            List<ActiveJob> activeJobs,
            List<DayCount> applicationsSeries  // số đơn theo ngày, 30 ngày gần nhất
    ) {
    }

    public record RecentApplication(
            Integer id,
            Integer candidateId,
            String candidateName,
            String candidateAvatar,
            String jobTitle,
            String status,
            LocalDateTime appliedAt
    ) {
    }

    public record ActiveJob(
            Integer id,
            String title,
            LocalDate deadline,
            long applicants,
            long newApplicants
    ) {
    }

    public record DayCount(
            String date,   // yyyy-MM-dd
            long count
    ) {
    }

    /* ---------------- Tin tuyển dụng ---------------- */

    public record EmployerJobRow(
            Integer id,
            String title,
            Integer companyId,
            String companyName,
            BigDecimal salaryMin,
            BigDecimal salaryMax,
            String salaryUnit,
            String salaryText,
            String location,
            String level,
            String jobType,
            String workingSchedule,
            LocalDate deadline,
            String description,
            String requirements,
            Integer vacancies,
            String status,
            int displayDays,
            int tokenCost,
            LocalDateTime createdAt,
            LocalDateTime expiresAt,
            long applicants,
            long newApplicants       // đơn mới trong 7 ngày gần nhất
    ) {
    }

    public record CompanyOption(
            Integer id,
            String name,
            String logo
    ) {
    }

    /* ---------------- Đơn ứng tuyển ---------------- */

    public record EmployerApplicationRow(
            Integer id,
            Integer candidateId,
            String candidateName,
            String candidateAvatar,
            String candidateEmail,
            String cvFileName,
            String status,             // pending | viewed | invited | rejected | hired
            LocalDateTime appliedAt
    ) {
    }

    // Một dòng ở trang Quản lý ứng viên (toàn cục, kèm tin + kỹ năng).
    public record GlobalApplicationRow(
            Integer id,
            Integer candidateId,
            String candidateName,
            String candidateAvatar,
            String candidateAddress,
            String candidateEmail,
            String cvFileName,
            String status,
            LocalDateTime appliedAt,
            Integer jobId,
            String jobTitle,
            List<String> skills,
            long skillsCount
    ) {
    }

    public record ApplicationSummary(
            long total,
            long pending,
            long viewed,
            long invited,
            long rejected,
            long hired
    ) {
    }

    public record ApplicationDetail(
            Integer id,
            String status,
            LocalDateTime appliedAt,
            String coverLetter,
            Integer candidateId,
            String candidateName,
            String candidateEmail,
            String candidatePhone,
            String candidateAvatar,
            String candidateSummary,
            String candidateAddress,
            String cvFileName,
            String cvFileUrl,
            Integer jobId,
            String jobTitle,
            String companyName
    ) {
    }

    /* ---------------- Tìm kiếm ứng viên ---------------- */

    public record CandidateSearchResponse(
            List<CandidateCard> items,
            long total,
            long viewsUsed,          // số hồ sơ đã xem trong lượt đăng ký hiện tại
            Integer viewsLimit,      // giới hạn của gói (null = không giới hạn)
            boolean canDirectContact
    ) {
    }

    public record CandidateCard(
            Integer id,
            String fullName,
            String avatar,
            String address,
            String summary,
            String email,            // null nếu gói chưa có quyền liên hệ trực tiếp
            String phone,            // null nếu gói chưa có quyền liên hệ trực tiếp
            List<String> skills,
            long skillsCount,
            BigDecimal maxYearsExp,  // số năm kinh nghiệm lớn nhất trong các kỹ năng
            boolean hasAppliedToUs
    ) {
    }

    public record CandidateDetail(
            Integer id,
            String fullName,
            String avatar,
            String address,
            LocalDate dob,
            String summary,
            String email,            // null nếu gói chưa có quyền liên hệ trực tiếp
            String phone,            // null nếu gói chưa có quyền liên hệ trực tiếp
            boolean contactVisible,
            List<CandidateSkill> skills,
            List<CandidateCv> cvs,
            List<MyApplication> myApplications,   // đơn của ứng viên vào tin của mình
            List<SimilarCandidate> similar,
            long viewsUsed,
            Integer viewsLimit
    ) {
    }

    public record CandidateSkill(
            String name,
            String level,
            BigDecimal yearsExp
    ) {
    }

    public record CandidateCv(
            Integer id,
            String fileName,
            String fileUrl,
            boolean isDefault,
            LocalDateTime uploadedAt
    ) {
    }

    public record MyApplication(
            Integer id,
            String jobTitle,
            String status,
            LocalDateTime appliedAt
    ) {
    }

    public record SimilarCandidate(
            Integer id,
            String fullName,
            String avatar,
            String address,
            List<String> skills
    ) {
    }

    /* ---------------- Hồ sơ công ty ---------------- */

    public record CompanyProfile(
            Integer id,
            String name,
            String legalName,
            String taxCode,
            String website,
            String industry,
            String size,
            String address,
            String description,
            String logo,
            String cover,                // ảnh bìa (cột cover, migration V12)
            String verificationStatus,   // pending | verified | rejected
            int completeness             // % các trường thông tin đã điền
    ) {
    }

    /* ---------------- Đánh giá & phản hồi ---------------- */

    public record ReviewStats(
            long total,
            double average,           // điểm trung bình (0 khi chưa có đánh giá)
            long repliedPercent,      // % đánh giá đã được phản hồi
            long positivePercent,     // % đánh giá 4-5 sao
            List<DayCount> starDistribution  // date = "5".."1", count = số đánh giá
    ) {
    }

    public record ReviewRow(
            Integer id,
            Integer companyId,
            String companyName,
            Integer candidateId,
            String candidateName,
            String candidateAvatar,
            int rating,
            String content,
            String status,
            LocalDateTime createdAt,
            String replyContent,      // null nếu chưa phản hồi
            LocalDateTime replyAt
    ) {
    }

    public record ReviewsResponse(
            ReviewStats stats,
            List<ReviewRow> reviews
    ) {
    }

    /* ---------------- Gói dịch vụ + ví Token ---------------- */

    public record PlanInfo(
            String plan,                // premium | pro | basic
            Integer packageId,
            String packageName,
            BigDecimal price,
            Integer durationDays,
            Integer jobPostLimit,
            Integer cvViewLimit,
            Integer includedTokens,
            boolean canHighlightJobs,
            boolean canPrioritizeJobs,
            boolean canSearchCandidates,
            boolean canDirectContact,
            LocalDateTime subscriptionEnd,
            Integer walletBalance
    ) {
    }

    public record PackageCard(
            Integer id,
            String name,
            BigDecimal price,
            Integer durationDays,
            Integer jobPostLimit,
            Integer cvViewLimit,
            Integer includedTokens,
            boolean canHighlightJobs,
            boolean canPrioritizeJobs,
            boolean canSearchCandidates,
            boolean canDirectContact
    ) {
    }

    public record TokenPackageCard(
            Integer id,
            String name,
            Integer tokens,
            BigDecimal price
    ) {
    }

    public record PackagesResponse(
            String currentPlan,
            List<PackageCard> packages,
            List<TokenPackageCard> tokenPackages
    ) {
    }

    public record SubscriptionRow(
            String orderCode,
            String packageName,
            LocalDateTime startAt,
            LocalDateTime endAt,
            BigDecimal totalAmount,
            String status              // active | cancelled | expired
    ) {
    }

    public record WalletInfo(
            Integer balance,
            List<TokenTxnRow> transactions
    ) {
    }

    public record TokenTxnRow(
            Integer id,
            String type,               // welcome | purchase | spend | refund | adjustment
            int amount,                // dương = cộng Token, âm = trừ Token
            int balanceAfter,
            String refType,
            Integer refId,
            LocalDateTime createdAt
    ) {
    }
}