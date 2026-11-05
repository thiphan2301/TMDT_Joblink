package group7.joblink.repository;

import group7.joblink.entity.CompanyReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface CompanyReviewRepository extends JpaRepository<CompanyReview, Integer> {

    Optional<CompanyReview> findByCompany_IdAndUser_Id(Integer companyId, Integer userId);

    boolean existsByCompany_IdAndUser_Id(Integer companyId, Integer userId);

    @Query("""
        SELECT r FROM CompanyReview r
        WHERE r.sentiment IS NULL AND r.content IS NOT NULL
        ORDER BY r.id
        """)
    Page<CompanyReview> findUnlabeledWithContent(Pageable pageable);

}
