package group7.joblink.repository;

import group7.joblink.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

// Dữ liệu trang công ty công khai: hồ sơ công ty, các tin đang
// tuyển và đánh giá của ứng viên (đọc thuần, không qua đăng nhập).
public interface PublicCompanyRepository
        extends JpaRepository<Company, Integer> {

    // [id, name, legal_name, website, industry, size, address,
    //  description, logo, cover, verification_status, latitude, longitude]
    @Query(value = """
        SELECT id, name, legal_name, website, industry, size, address,
               description, logo, cover, verification_status,
               latitude, longitude
        FROM companies WHERE id = :companyId
        """, nativeQuery = true)
    List<Object[]> findPublicRow(@Param("companyId") int companyId);

    // [id, title, salary_min, salary_max, salary_unit, location,
    //  job_type, level, skills, deadline, created_at, is_highlighted]
    @Query(value = """
        SELECT id, title, salary_min, salary_max, salary_unit, location,
               job_type, level, skills, deadline, created_at, is_highlighted
        FROM jobs
        WHERE company_id = :companyId AND status = 'open'
        ORDER BY is_prioritized DESC, created_at DESC, id DESC
        """, nativeQuery = true)
    List<Object[]> findOpenJobs(@Param("companyId") int companyId);

    @Query(value = "SELECT AVG(rating), COUNT(*) FROM company_reviews WHERE company_id = :companyId",
           nativeQuery = true)
    List<Object[]> findRatingSummary(@Param("companyId") int companyId);

    // [rating, số lượng]
    @Query(value = """
        SELECT rating, COUNT(*) FROM company_reviews
        WHERE company_id = :companyId GROUP BY rating
        """, nativeQuery = true)
    List<Object[]> countByRating(@Param("companyId") int companyId);

    // [reviewerName, reviewerAvatar, rating, content, createdAt, replyContent]
    @Query(value = """
        SELECT COALESCE(cp.full_name, SUBSTRING_INDEX(u.email, '@', 1)),
               cp.avatar, r.rating, r.content, r.created_at,
               (SELECT rr.content FROM review_replies rr
                WHERE rr.review_id = r.id
                ORDER BY rr.created_at DESC, rr.id DESC LIMIT 1)
        FROM company_reviews r
        JOIN users u ON u.id = r.candidate_id
        LEFT JOIN candidate_profiles cp ON cp.user_id = r.candidate_id
        WHERE r.company_id = :companyId
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT 10
        """, nativeQuery = true)
    List<Object[]> findReviews(@Param("companyId") int companyId);
}
