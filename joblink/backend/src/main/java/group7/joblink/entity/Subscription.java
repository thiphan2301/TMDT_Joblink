package group7.joblink.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// Lượt đăng ký gói dịch vụ của nhà tuyển dụng (bảng subscriptions).
// Mỗi lượt đăng ký gắn với đúng 1 đơn hàng (order_id là UNIQUE).
@Entity
@Table(name = "subscriptions")
@Getter
@NoArgsConstructor
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "employer_id", nullable = false)
    private Integer employerId;

    @Column(name = "package_id", nullable = false)
    private Integer packageId;

    @Column(name = "order_id", nullable = false, unique = true)
    private Integer orderId;

    @Column(name = "start_at", nullable = false)
    private LocalDateTime startAt;

    @Column(name = "end_at", nullable = false)
    private LocalDateTime endAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.active;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    public Subscription(Integer employerId, Integer packageId, Integer orderId,
                        LocalDateTime startAt, LocalDateTime endAt) {
        this.employerId = employerId;
        this.packageId = packageId;
        this.orderId = orderId;
        this.startAt = startAt;
        this.endAt = endAt;
        this.status = Status.active;
    }

    // Hủy lượt đăng ký (admin hạ gói, hoặc gói hết hạn bị thay thế).
    public void cancel() {
        this.status = Status.cancelled;
        this.cancelledAt = LocalDateTime.now();
    }

    // Giá trị khớp với ENUM trong database.
    public enum Status {
        active,
        cancelled,
        expired
    }
}
