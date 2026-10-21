package group7.joblink.repository;

import org.springframework.data.repository.Repository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

// Đánh giá của ứng viên về công ty (bảng company_reviews) và phản hồi
// của nhà tuyển dụng (bảng review_replies) — trang Đánh giá & Phản hồi.
public interface EmployerReviewRepository extends Repository<group7.joblink.entity.Company, Integer> {

    // Đánh giá về các công ty của nhà tuyển dụng, kèm phản hồi gần nhất.
    // Trả [id, company_id, company_name, candidate_id, candidate_name,
    //      candidate_avatar, rating, content, status, created_at,
    //      reply_content, reply_at]
    @Query(value = """
        SELECT r.id, r.company_id, comp.name, r.candidate_id,
               COALESCE(cp.full_name, SUBSTRING_INDEX(u.email, '@', 1)),
               cp.avatar, r.rating, r.content, r.status, r.created_at,
               (SELECT rr.content FROM review_replies rr
                WHERE rr.review_id = r.id
                ORDER BY rr.created_at DESC, rr.id DESC LIMIT 1),
               (SELECT rr.created_at FROM review_replies rr
                WHERE rr.review_id = r.id
                ORDER BY rr.created_at DESC, rr.id DESC LIMIT 1)
        FROM company_reviews r
        JOIN companies comp ON comp.id = r.company_id
        JOIN users u ON u.id = r.candidate_id
        LEFT JOIN candidate_profiles cp ON cp.user_id = r.candidate_id
        WHERE comp.owner_id = :employerId
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT 200
        """, nativeQuery = true)
    List<Object[]> findReviewRows(@Param("employerId") Integer employerId);

    // Phân bổ sao: trả [rating, số lượng].
    @Query(value = """
        SELECT r.rating, COUNT(*)
        FROM company_reviews r
        JOIN companies comp ON comp.id = r.company_id
        WHERE comp.owner_id = :employerId
        GROUP BY r.rating
        """, nativeQuery = true)
    List<Object[]> countByRating(@Param("employerId") Integer employerId);

    // Số đánh giá đã có ít nhất một phản hồi.
    @Query(value = """
        SELECT COUNT(DISTINCT r.id)
        FROM company_reviews r
        JOIN companies comp ON comp.id = r.company_id
        JOIN review_replies rr ON rr.review_id = r.id
        WHERE comp.owner_id = :employerId
        """, nativeQuery = true)
    long countReplied(@Param("employerId") Integer employerId);

    // 1 nếu đánh giá thuộc về công ty của nhà tuyển dụng này.
    @Query(value = """
        SELECT COUNT(*) FROM company_reviews r
        JOIN companies comp ON comp.id = r.company_id
        WHERE r.id = :reviewId AND comp.owner_id = :employerId
        """, nativeQuery = true)
    long countOwnReview(@Param("reviewId") Integer reviewId,
                        @Param("employerId") Integer employerId);

    @Modifying
    @Query(value = """
        INSERT INTO review_replies (review_id, employer_id, content)
        VALUES (:reviewId, :employerId, :content)
        """, nativeQuery = true)
    int insertReply(@Param("reviewId") Integer reviewId,
                    @Param("employerId") Integer employerId,
                    @Param("content") String content);
}
