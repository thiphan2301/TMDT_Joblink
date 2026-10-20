package group7.joblink.repository;

import group7.joblink.entity.Promotion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PromotionRepository
        extends JpaRepository<Promotion, Integer> {

    List<Promotion> findAllByOrderByIdAsc();

    // Số lần từng mã đã được dùng (bảng promotion_usages chưa có entity
    // nên đếm bằng SQL thuần, trả [promotion_id, số lần]).
    @Query(value = """
        SELECT promotion_id, COUNT(*)
        FROM promotion_usages
        GROUP BY promotion_id
        """, nativeQuery = true)
    List<Object[]> countUsagesByPromotion();
}
