package group7.joblink.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

// Toàn bộ DTO trả về cho khu vực admin, gom trong 1 file để dễ theo dõi.
// Tên field khớp đúng với dữ liệu các trang frontend (adminService.js).
public final class AdminResponses {

    private AdminResponses() {
    }

    public record MonthlyPoint(
        String month,      // "T4"
        String label,      // "T4/2026"
        long newUsers,
        long newJobs,
        BigDecimal revenue
    ) {
    }

    public record RoleSlice(
        String role,       // candidate | employer | admin
        String label,      // Ứng viên | Nhà tuyển dụng | Quản trị viên
        long count,
        double percent
    ) {
    }

    public record Overview(
        long totalUsers,
        double usersGrowthPercent,
        long totalJobs,
        double jobsGrowthPercent,
        BigDecimal revenueMonth,
        double revenueGrowthPercent,
        long pendingAccounts,          // số tài khoản đang bị khóa — "cần xử lý"
        List<MonthlyPoint> growth,     // 6 tháng gần nhất
        List<RoleSlice> distribution
    ) {
    }

    public record Report(
        List<MonthlyPoint> months,
        List<RoleSlice> distribution
    ) {
    }

    public record UserRow(
        Integer id,
        String fullName,
        String email,
        String role,       // candidate | employer | admin
        String status,     // active | locked
        LocalDateTime createdAt,
        String plan        // chỉ với employer: "premium" | "pro" | "basic"; còn lại null
    ) {
    }

    public record JobRow(
        Integer id,
        String title,
        String companyName,
        BigDecimal salaryMin,
        BigDecimal salaryMax,
        String salaryUnit,
        String salaryText,             // "25 – 40 triệu" — ghép sẵn cho frontend
        String location,
        String industry,
        String level,
        String jobType,
        String workingSchedule,
        LocalDate deadline,
        String description,
        String status,
        int displayDays,               // quy ước prototype: tin hiển thị 7 ngày
        int tokenCost,                 // quy ước prototype: 20 Token / tin
        LocalDateTime createdAt,
        LocalDateTime expiresAt,       // createdAt + displayDays
        Integer employerWalletBalance, // số dư ví Token của nhà tuyển dụng sở hữu tin
        long applicants,
        String employerPlan            // gói của nhà sở hữu tin: "premium" | "pro" | "basic" | null
    ) {
    }

    public record CompanyRow(
        Integer id,
        String name,
        String industry
    ) {
    }

    public record ApplicationRow(
        Integer id,
        String candidateName,
        String candidateEmail,
        String status,
        LocalDateTime appliedAt
    ) {
    }

    public record PackageRow(
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
        boolean canDirectContact,
        boolean isActive,
        long activeSubscriptions
    ) {
    }

    public record TokenPackageRow(
        Integer id,
        Integer tokens,
        BigDecimal price,
        boolean isActive
    ) {
    }

    public record PromotionRow(
        Integer id,
        String code,
        String discountType,
        BigDecimal discountValue,
        BigDecimal minOrderAmount,
        BigDecimal maxDiscountAmount,
        LocalDateTime startAt,
        LocalDateTime endAt,
        Integer usageLimit,
        Integer perUserLimit,
        boolean isActive,
        long usedCount
    ) {
    }

    public record Packages(
        List<PackageRow> packages,
        List<TokenPackageRow> tokenPackages,
        List<PromotionRow> promotions
    ) {
    }
}
