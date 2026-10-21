package group7.joblink.repository;

import group7.joblink.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

// Truy vấn cho chat realtime (danh sách cuộc trò chuyện của người dùng).
public interface ConversationRepository extends JpaRepository<Conversation, Integer> {

    // Cuộc trò chuyện duy nhất của một cặp ứng viên - nhà tuyển dụng.
    Optional<Conversation> findByCandidateIdAndEmployerId(
            Integer candidateId, Integer employerId);

    // Danh sách cuộc trò chuyện của người đang đăng nhập, kèm thông tin
    // hiển thị: tên/ảnh đối phương, tin nhắn cuối, số tin chưa đọc.
    // Trả [id, candidate_id, employer_id, job_id, job_title,
    //      partner_name, partner_avatar, last_content, last_at, unread]
    @Query(value = """
        SELECT c.id, c.candidate_id, c.employer_id, c.job_id, j.title AS job_title,
               CASE WHEN c.employer_id = :userId
                    THEN COALESCE(cp.full_name, SUBSTRING_INDEX(uc.email, '@', 1))
                    ELSE COALESCE(
                        (SELECT comp.name FROM companies comp
                         WHERE comp.owner_id = c.employer_id ORDER BY comp.id LIMIT 1),
                        SUBSTRING_INDEX(ue.email, '@', 1))
               END AS partner_name,
               CASE WHEN c.employer_id = :userId THEN cp.avatar ELSE NULL END
                    AS partner_avatar,
               (SELECT CASE WHEN m.image_url IS NOT NULL AND m.content = ''
                            THEN '📷 Đã gửi một ảnh' ELSE m.content END
                FROM messages m
                WHERE m.conversation_id = c.id
                ORDER BY m.sent_at DESC, m.id DESC LIMIT 1) AS last_content,
               (SELECT m.sent_at FROM messages m
                WHERE m.conversation_id = c.id
                ORDER BY m.sent_at DESC, m.id DESC LIMIT 1) AS last_at,
               (SELECT COUNT(*) FROM messages m
                WHERE m.conversation_id = c.id
                  AND m.is_read = 0 AND m.sender_id <> :userId) AS unread
        FROM conversations c
        LEFT JOIN jobs j ON j.id = c.job_id
        LEFT JOIN candidate_profiles cp ON cp.user_id = c.candidate_id
        LEFT JOIN users uc ON uc.id = c.candidate_id
        LEFT JOIN users ue ON ue.id = c.employer_id
        WHERE c.candidate_id = :userId OR c.employer_id = :userId
        ORDER BY last_at DESC, c.id DESC
        """, nativeQuery = true)
    List<Object[]> findConversationRows(@Param("userId") Integer userId);

    // Ngữ cảnh tuyển dụng của một cuộc trò chuyện cho panel bên
    // phải: tin + công ty, đơn ứng tuyển của ứng viên trong cuộc
    // trò chuyện này, lịch phỏng vấn sắp tới gần nhất. Chỉ trả hàng
    // khi người xem là một phía của cuộc trò chuyện.
    // Trả [job_id, job_title, company_name, salary_min, salary_max,
    //      salary_unit, location, app_status, applied_at,
    //      next_at, next_location, next_notes]
    @Query(value = """
        SELECT c.job_id, j.title, comp.name,
               j.salary_min, j.salary_max, j.salary_unit, j.location,
               a.status, a.applied_at,
               (SELECT ii.scheduled_at FROM interview_invitations ii
                JOIN applications a2 ON a2.id = ii.application_id
                WHERE a2.job_id = c.job_id AND a2.candidate_id = c.candidate_id
                  AND ii.scheduled_at >= NOW() AND ii.status <> 'declined'
                ORDER BY ii.scheduled_at ASC LIMIT 1),
               (SELECT ii.location FROM interview_invitations ii
                JOIN applications a2 ON a2.id = ii.application_id
                WHERE a2.job_id = c.job_id AND a2.candidate_id = c.candidate_id
                  AND ii.scheduled_at >= NOW() AND ii.status <> 'declined'
                ORDER BY ii.scheduled_at ASC LIMIT 1),
               (SELECT ii.notes FROM interview_invitations ii
                JOIN applications a2 ON a2.id = ii.application_id
                WHERE a2.job_id = c.job_id AND a2.candidate_id = c.candidate_id
                  AND ii.scheduled_at >= NOW() AND ii.status <> 'declined'
                ORDER BY ii.scheduled_at ASC LIMIT 1)
        FROM conversations c
        LEFT JOIN jobs j ON j.id = c.job_id
        LEFT JOIN companies comp ON comp.id = j.company_id
        LEFT JOIN applications a ON a.job_id = c.job_id
             AND a.candidate_id = c.candidate_id
        WHERE c.id = :conversationId
          AND (c.candidate_id = :userId OR c.employer_id = :userId)
        """, nativeQuery = true)
    List<Object[]> findContextRow(@Param("conversationId") Integer conversationId,
                                  @Param("userId") Integer userId);
}