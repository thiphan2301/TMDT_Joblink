package group7.joblink.dto.request;

import java.math.BigDecimal;

// Gói Token (bảng token_packages).
public record AdminTokenPackageRequest(
    Integer tokens,
    BigDecimal price,
    Boolean isActive
) {
}
