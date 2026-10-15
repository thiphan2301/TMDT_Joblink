package group7.joblink.dto.request;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// Khuyến mãi (bảng promotions).
// discountType: percent | fixed_amount. Ngày giờ dạng ISO "2026-10-14T00:00:00".
public record AdminPromotionRequest(
    String code,
    String discountType,
    BigDecimal discountValue,
    BigDecimal minOrderAmount,
    BigDecimal maxDiscountAmount,
    LocalDateTime startAt,
    LocalDateTime endAt,
    Integer usageLimit,
    Integer perUserLimit,
    Boolean isActive
) {
}
