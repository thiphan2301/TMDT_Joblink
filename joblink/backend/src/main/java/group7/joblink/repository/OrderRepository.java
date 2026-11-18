package group7.joblink.repository;

import group7.joblink.entity.Order;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Integer> {

    Optional<Order> findByOrderCodeAndUserId(String orderCode, Integer userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.orderCode = :orderCode")
    Optional<Order> findByOrderCodeForUpdate(@Param("orderCode") String orderCode);

    // Doanh thu trong khoảng [from, to) = tổng total_amount của các đơn
    // thuộc các trạng thái cho trước (admin truyền paid + fulfilled).
    @Query("""
        SELECT COALESCE(SUM(o.totalAmount), 0)
        FROM Order o
        WHERE o.status IN :statuses
          AND o.createdAt >= :from
          AND o.createdAt < :to
        """)
    BigDecimal sumRevenueBetween(
        @Param("statuses") Collection<Order.Status> statuses,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to
    );
}
