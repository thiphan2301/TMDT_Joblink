package group7.joblink.repository;

import group7.joblink.entity.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

// Repository cho subscriptions — phục vụ khu vực admin quản lý gói của
// nhà tuyển dụng (xem ai đang Pro, cấp / hạ gói).
public interface AdminSubscriptionRepository
        extends JpaRepository<Subscription, Integer> {

    // Các lượt đăng ký đang hiệu lực của một nhà tuyển dụng.
    List<Subscription> findByEmployerIdAndStatus(
        Integer employerId, Subscription.Status status);

    // Gói đang hiệu lực của mọi nhà tuyển dụng, kèm quyền ưu tiên của gói.
    // Chỉ tính gói còn đang bán (is_active) để các gói cũ đã tắt ở V9
    // không còn hiệu lực. Trả [employer_id, tên gói, can_prioritize_jobs].
    @Query("""
        SELECT s.employerId, p.name, p.canPrioritizeJobs
        FROM Subscription s
        JOIN ServicePackage p ON p.id = s.packageId
        WHERE s.status = group7.joblink.entity.Subscription.Status.active
          AND s.endAt > :now
          AND p.active = true
        """)
    List<Object[]> findActivePlans(@Param("now") LocalDateTime now);

    // Đơn hàng ghi nhận khi admin cấp gói tay (không qua thanh toán):
    // giảm 100% nên total_amount = 0 — không tính vào doanh thu.
    // product_snapshot là cột JSON NOT NULL nên phải truyền vào.
    @Modifying
    @Query(value = """
        INSERT INTO orders (order_code, user_id, order_type, package_id,
                            subtotal, discount_amount, total_amount,
                            product_snapshot, status, paid_at, fulfilled_at)
        VALUES (:orderCode, :userId, 'subscription', :packageId,
                :price, :price, 0, :snapshot, 'fulfilled', :now, :now)
        """, nativeQuery = true)
    int insertGrantOrder(@Param("orderCode") String orderCode,
                         @Param("userId") Integer userId,
                         @Param("packageId") Integer packageId,
                         @Param("price") BigDecimal price,
                         @Param("snapshot") String snapshot,
                         @Param("now") LocalDateTime now);

    // Id của dòng vừa INSERT trên cùng kết nối (lấy order_id cho subscription).
    @Query(value = "SELECT LAST_INSERT_ID()", nativeQuery = true)
    Long lastInsertId();

}
