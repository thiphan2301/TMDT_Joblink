package group7.joblink.repository;

import group7.joblink.entity.ServicePackage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ServicePackageRepository
        extends JpaRepository<ServicePackage, Integer> {

    // Danh sách gói ở trang quản lý gói: rẻ trước, đắt sau.
    List<ServicePackage> findAllByOrderByPriceAsc();

    // Số lượt đăng ký đang còn hiệu lực của từng gói (bảng subscriptions
    // chưa có entity nên đếm bằng SQL thuần, trả [package_id, số lượng]).
    @Query(value = """
        SELECT package_id, COUNT(*)
        FROM subscriptions
        WHERE status = 'active'
        GROUP BY package_id
        """, nativeQuery = true)
    List<Object[]> countActiveSubscriptionsByPackage();
}
