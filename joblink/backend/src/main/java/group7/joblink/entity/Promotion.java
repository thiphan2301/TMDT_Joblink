package group7.joblink.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// Mã khuyến mãi áp dụng khi thanh toán đơn hàng (bảng promotions).
@Entity
@Table(name = "promotions")
@Getter
@NoArgsConstructor
public class Promotion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", nullable = false)
    private DiscountType discountType;

    @Column(name = "discount_value", nullable = false, precision = 15, scale = 2)
    private BigDecimal discountValue;

    @Column(name = "min_order_amount", precision = 15, scale = 2)
    private BigDecimal minOrderAmount;

    @Column(name = "max_discount_amount", precision = 15, scale = 2)
    private BigDecimal maxDiscountAmount;

    @Column(name = "start_at")
    private LocalDateTime startAt;

    @Column(name = "end_at")
    private LocalDateTime endAt;

    @Column(name = "usage_limit")
    private Integer usageLimit;

    @Column(name = "per_user_limit")
    private Integer perUserLimit;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    public Promotion(String code, DiscountType discountType, BigDecimal discountValue,
                     BigDecimal minOrderAmount, BigDecimal maxDiscountAmount,
                     LocalDateTime startAt, LocalDateTime endAt,
                     Integer usageLimit, Integer perUserLimit, boolean active) {
        update(code, discountType, discountValue, minOrderAmount, maxDiscountAmount,
                startAt, endAt, usageLimit, perUserLimit, active);
    }

    public void update(String code, DiscountType discountType, BigDecimal discountValue,
                       BigDecimal minOrderAmount, BigDecimal maxDiscountAmount,
                       LocalDateTime startAt, LocalDateTime endAt,
                       Integer usageLimit, Integer perUserLimit, boolean active) {
        this.code = code;
        this.discountType = discountType;
        this.discountValue = discountValue;
        this.minOrderAmount = minOrderAmount;
        this.maxDiscountAmount = maxDiscountAmount;
        this.startAt = startAt;
        this.endAt = endAt;
        this.usageLimit = usageLimit;
        this.perUserLimit = perUserLimit;
        this.active = active;
    }

    // Giá trị khớp với ENUM trong database.
    public enum DiscountType {
        percent,
        fixed_amount
    }
}
