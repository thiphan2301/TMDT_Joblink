package group7.joblink.dto.request;

import java.math.BigDecimal;

// Gói đăng ký (bảng packages). jobPostLimit / cvViewLimit để null = không giới hạn.
public record AdminPackageRequest(
    String name,
    BigDecimal price,
    Integer durationDays,
    Integer jobPostLimit,
    Integer cvViewLimit,
    Integer includedTokens,
    Boolean canHighlightJobs,
    Boolean canPrioritizeJobs,
    Boolean canSearchCandidates,
    Boolean canDirectContact,
    Boolean isActive
) {
}
