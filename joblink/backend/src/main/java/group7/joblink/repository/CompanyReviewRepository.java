package group7.joblink.repository;

import group7.joblink.entity.CompanyReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CompanyReviewRepository extends JpaRepository<CompanyReview, Long> {

    // lấy danh sách đánh giá của 1 công ty cụ thể (trả về Page<> để phân trang, soft,limit)
    Page<CompanyReview> findByCompany_Id(Pageable pageable, Long companyId);
    // láy danh sách đánh giá của 1 công ty và user cụ thể (trả về optional để tránh trả null khi khôgn tìm thấy)
    Page<CompanyReview> findByCompany_IdAndUser_Id(Pageable  pageable, Long companyId, Long userId);
    // kiểm tra 1 người có đánh giá cho công ty đó chưa (= cách kiểm tra)
    boolean existsByCompany_IdAndUser_Id(Integer  companyId, Integer userId);

}
