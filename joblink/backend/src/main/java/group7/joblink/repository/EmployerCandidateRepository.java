package group7.joblink.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import group7.joblink.entity.CandidateProfile;

import java.util.List;

// Tìm kiếm hồ sơ ứng viên cho nhà tuyển dụng (tính năng của gói
// Pro/Premium — việc chặn theo gói nằm ở EmployerService).
// Chỉ tìm ứng viên bật is_searchable và tài khoản đang hoạt động.
public interface EmployerCandidateRepository
        extends JpaRepository<CandidateProfile, Integer> {

    // Tìm theo từ khóa (tên / giới thiệu), kỹ năng, địa điểm.
    // Trả [user_id, full_name, avatar, address, summary, email, phone,
    //      skills_csv, skills_count, max_years_exp, has_applied]
    @Query(value = """
        SELECT cp.user_id, cp.full_name, cp.avatar, cp.address, cp.summary,
               u.email, cp.phone,
               (SELECT GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', ')
                FROM candidate_skills cs JOIN skills s ON s.id = cs.skill_id
                WHERE cs.candidate_id = cp.user_id) AS skills_csv,
               (SELECT COUNT(*) FROM candidate_skills cs
                WHERE cs.candidate_id = cp.user_id) AS skills_count,
               (SELECT MAX(cs.years_exp) FROM candidate_skills cs
                WHERE cs.candidate_id = cp.user_id) AS max_years_exp,
               EXISTS(SELECT 1 FROM applications a
                      JOIN jobs j ON j.id = a.job_id
                      JOIN companies c ON c.id = j.company_id
                      WHERE a.candidate_id = cp.user_id
                        AND c.owner_id = :employerId) AS has_applied
        FROM candidate_profiles cp
        JOIN users u ON u.id = cp.user_id
        WHERE cp.is_searchable = 1
          AND u.role = 'candidate' AND u.status = 'active'
          AND (:q IS NULL OR :q = ''
               OR cp.full_name LIKE CONCAT('%', :q, '%')
               OR cp.summary LIKE CONCAT('%', :q, '%'))
          AND (:skill IS NULL OR :skill = ''
               OR EXISTS(SELECT 1 FROM candidate_skills cs
                         JOIN skills s ON s.id = cs.skill_id
                         WHERE cs.candidate_id = cp.user_id
                           AND s.name LIKE CONCAT('%', :skill, '%')))
          AND (:location IS NULL OR :location = ''
               OR cp.address LIKE CONCAT('%', :location, '%'))
        ORDER BY cp.full_name
        LIMIT 100
        """, nativeQuery = true)
    List<Object[]> searchRows(@Param("employerId") Integer employerId,
                              @Param("q") String q,
                              @Param("skill") String skill,
                              @Param("location") String location);

    // Kỹ năng của một ứng viên kèm cấp độ + số năm (trả [name, level, years_exp]).
    @Query(value = """
        SELECT s.name, cs.level, cs.years_exp
        FROM candidate_skills cs JOIN skills s ON s.id = cs.skill_id
        WHERE cs.candidate_id = :candidateId
        ORDER BY cs.years_exp DESC, s.name
        """, nativeQuery = true)
    List<Object[]> findSkills(@Param("candidateId") Integer candidateId);

    // Các CV của ứng viên (trả [id, file_name, file_url, is_default, uploaded_at]).
    @Query(value = """
        SELECT id, file_name, file_url, is_default, uploaded_at
        FROM cvs WHERE candidate_id = :candidateId
        ORDER BY is_default DESC, uploaded_at DESC
        """, nativeQuery = true)
    List<Object[]> findCvs(@Param("candidateId") Integer candidateId);

    // Đơn của ứng viên này vào tin của nhà tuyển dụng
    // (trả [id, job_title, status, applied_at]).
    @Query(value = """
        SELECT a.id, j.title, a.status, a.applied_at
        FROM applications a
        JOIN jobs j ON j.id = a.job_id
        JOIN companies c ON c.id = j.company_id
        WHERE a.candidate_id = :candidateId AND c.owner_id = :employerId
        ORDER BY a.applied_at DESC
        """, nativeQuery = true)
    List<Object[]> findMyApplications(@Param("candidateId") Integer candidateId,
                                      @Param("employerId") Integer employerId);

    // Ứng viên tương tự: có chung ít nhất 1 kỹ năng, xếp theo số kỹ năng chung.
    // Trả [user_id, full_name, avatar, address, skills_csv]
    @Query(value = """
        SELECT cp.user_id, cp.full_name, cp.avatar, cp.address,
               (SELECT GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', ')
                FROM candidate_skills cs JOIN skills s ON s.id = cs.skill_id
                WHERE cs.candidate_id = cp.user_id) AS skills_csv
        FROM candidate_profiles cp
        WHERE cp.is_searchable = 1 AND cp.user_id <> :candidateId
          AND EXISTS(SELECT 1 FROM candidate_skills mine
                     JOIN candidate_skills theirs
                       ON theirs.skill_id = mine.skill_id
                     WHERE mine.candidate_id = :candidateId
                       AND theirs.candidate_id = cp.user_id)
        ORDER BY (SELECT COUNT(*) FROM candidate_skills mine
                  JOIN candidate_skills theirs
                    ON theirs.skill_id = mine.skill_id
                  WHERE mine.candidate_id = :candidateId
                    AND theirs.candidate_id = cp.user_id) DESC
        LIMIT 3
        """, nativeQuery = true)
    List<Object[]> findSimilar(@Param("candidateId") Integer candidateId);

    /* -------- Lượt xem hồ sơ (bảng candidate_profile_views) -------- */

    // Số hồ sơ đã xem trong lượt đăng ký (mỗi ứng viên tính 1 lần).
    @Query(value = """
        SELECT COUNT(*) FROM candidate_profile_views
        WHERE subscription_id = :subscriptionId
        """, nativeQuery = true)
    long countViews(@Param("subscriptionId") Integer subscriptionId);

    @Query(value = """
        SELECT COUNT(*) FROM candidate_profile_views
        WHERE subscription_id = :subscriptionId AND candidate_id = :candidateId
        """, nativeQuery = true)
    long countViewOf(@Param("subscriptionId") Integer subscriptionId,
                     @Param("candidateId") Integer candidateId);

    // Nhà tuyển dụng đã từng mở hồ sơ ứng viên này chưa (ở bất kỳ lượt đăng ký nào)
    // — điều kiện xem CV của ứng viên chưa ứng tuyển vào tin của mình.
    @Query(value = """
        SELECT COUNT(*) FROM candidate_profile_views
        WHERE viewed_by = :employerId AND candidate_id = :candidateId
        """, nativeQuery = true)
    long countViewsByEmployer(@Param("employerId") Integer employerId,
                              @Param("candidateId") Integer candidateId);

    // Ghi nhận một lượt xem (UNIQUE subscription+candidate chống trùng).
    @Modifying
    @Query(value = """
        INSERT INTO candidate_profile_views (subscription_id, candidate_id, viewed_by)
        VALUES (:subscriptionId, :candidateId, :employerId)
        """, nativeQuery = true)
    int recordView(@Param("subscriptionId") Integer subscriptionId,
                   @Param("candidateId") Integer candidateId,
                   @Param("employerId") Integer employerId);
}
