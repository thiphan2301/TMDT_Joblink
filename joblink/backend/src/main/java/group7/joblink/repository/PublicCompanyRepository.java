package group7.joblink.repository;

import group7.joblink.entity.Company;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
    //  job_type, level, skill_names, deadline, created_at, is_highlighted]
    @Query(value = """
        SELECT j.id, j.title, j.salary_min, j.salary_max, j.salary_unit, j.location,
               j.job_type, j.level,
               (SELECT GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', ')
                FROM job_skills js
                JOIN skills s ON s.id = js.skill_id
                WHERE js.job_id = j.id) AS skill_names,
               j.deadline, j.created_at, j.is_highlighted
        FROM jobs j
        WHERE j.company_id = :companyId AND j.status = 'open'
        ORDER BY j.is_prioritized DESC, j.created_at DESC, j.id DESC
        """, nativeQuery = true)
    List<Object[]> findOpenJobs(@Param("companyId") int companyId);

    @Query(value = """
           SELECT AVG(rating), COUNT(*)
           FROM company_reviews
           WHERE company_id = :companyId AND status = 'visible'
           """,
           nativeQuery = true)
    List<Object[]> findRatingSummary(@Param("companyId") int companyId);

    // [rating, số lượng]
    @Query(value = """
        SELECT rating, COUNT(*) FROM company_reviews
        WHERE company_id = :companyId AND status = 'visible' AND rating IS NOT NULL
        GROUP BY rating
        """, nativeQuery = true)
    List<Object[]> countByRating(@Param("companyId") int companyId);

    // [id, reviewerName, reviewerAvatar, rating, sentiment, content, createdAt, replyContent]
    @Query(value = """
        SELECT r.id, COALESCE(cp.full_name, SUBSTRING_INDEX(u.email, '@', 1)),
               cp.avatar, r.rating, r.sentiment, r.content, r.created_at,
               (SELECT rr.content FROM review_replies rr
                WHERE rr.review_id = r.id
                ORDER BY rr.created_at DESC, rr.id DESC LIMIT 1)
        FROM company_reviews r
        JOIN users u ON u.id = r.candidate_id
        LEFT JOIN candidate_profiles cp ON cp.user_id = r.candidate_id
        WHERE r.company_id = :companyId AND r.status = 'visible'
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT 10
        """, nativeQuery = true)
    List<Object[]> findReviews(@Param("companyId") int companyId);

    @Query(
        value = """
            SELECT r.id, COALESCE(cp.full_name, SUBSTRING_INDEX(u.email, '@', 1)),
                   cp.avatar, r.rating, r.sentiment, r.content, r.created_at,
                   (SELECT rr.content FROM review_replies rr
                    WHERE rr.review_id = r.id
                    ORDER BY rr.created_at DESC, rr.id DESC LIMIT 1)
            FROM company_reviews r
            JOIN users u ON u.id = r.candidate_id
            LEFT JOIN candidate_profiles cp ON cp.user_id = r.candidate_id
            WHERE r.company_id = :companyId AND r.status = 'visible'
              AND (:sentiment IS NULL OR r.sentiment = :sentiment)
            ORDER BY r.created_at DESC, r.id DESC
            """,
        countQuery = """
            SELECT COUNT(*)
            FROM company_reviews r
            WHERE r.company_id = :companyId AND r.status = 'visible'
              AND (:sentiment IS NULL OR r.sentiment = :sentiment)
            """,
        nativeQuery = true
    )
    Page<Object[]> findReviewPage(
        @Param("companyId") int companyId,
        @Param("sentiment") String sentiment,
        Pageable pageable
    );
}
