package group7.joblink.entity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// Đơn hàng mua gói đăng ký hoặc gói Token (bảng orders).
// Khu vực admin hiện chỉ đọc để tính doanh thu — chưa có luồng tạo đơn ở đây.
@Entity
@Table(name = "orders")
@Getter
@NoArgsConstructor
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "order_code", nullable = false, unique = true, length = 50)
    private String orderCode;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "order_type", nullable = false)
    private OrderType orderType;

    @Column(name = "package_id")
    private Integer packageId;

    @Column(name = "token_package_id")
    private Integer tokenPackageId;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "discount_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "promotion_id")
    private Integer promotionId;

    // Ảnh chụp thông tin sản phẩm tại thời điểm mua (cột JSON, chỉ đọc ở admin).
    @Column(name = "product_snapshot", nullable = false, columnDefinition = "JSON")
    private String productSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(
        name = "created_at",
        nullable = false,
        insertable = false,
        updatable = false
    )
    private LocalDateTime createdAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    // Giá trị khớp với ENUM trong database.
    public enum OrderType {
        subscription,
        token
    }

    public enum Status {
        pending,
        paid,
        fulfilled,
        cancelled,
        failed,
        refunded
    }
}
