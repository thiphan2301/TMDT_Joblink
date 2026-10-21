package group7.joblink.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

// Dữ liệu trả về cho khu vực ứng viên: Ví Token và Trợ lý AI.
// Mọi con số đều đọc từ database (ví token, giao dịch, gói token,
// hồ sơ và tin tuyển dụng đang mở).
public final class CandidateResponses {

    private CandidateResponses() {
    }

    public record TransactionRow(
        Integer id,
        String type,
        Integer amount,
        Integer balanceAfter,
        String refType,
        Integer refId,
        LocalDateTime createdAt
    ) {
    }

    public record TokenPackageCard(
        Integer id,
        String name,
        Integer tokens,
        BigDecimal price
    ) {
    }

    public record WalletResponse(
        int balance,
        long totalReceived,
        long totalSpent,
        List<TransactionRow> transactions,
        List<TokenPackageCard> tokenPackages
    ) {
    }

    public record SkillRow(
        String name,
        Integer yearsExp
    ) {
    }

    // Hồ sơ ứng viên mà Trợ lý AI và thanh bên trái dùng để cá nhân
    // hóa: thông tin cơ bản + kỹ năng + độ hoàn thiện tự tính.
    public record AssistantProfile(
        String fullName,
        String avatar,
        String address,
        String summary,
        List<SkillRow> skills,
        int cvCount,
        int completeness
    ) {
    }

    public record AssistantJobCard(
        Integer id,
        String title,
        String companyName,
        BigDecimal salaryMin,
        BigDecimal salaryMax,
        String salaryUnit,
        String location
    ) {
    }

    public record AssistantReply(
        String reply,
        List<AssistantJobCard> jobs
    ) {
    }
}
