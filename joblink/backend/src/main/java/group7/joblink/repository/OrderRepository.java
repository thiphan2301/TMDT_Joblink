package group7.joblink.repository;

import group7.joblink.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;

public interface OrderRepository extends JpaRepository<Order, Integer> {

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
