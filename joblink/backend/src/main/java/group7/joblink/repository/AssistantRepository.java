package group7.joblink.repository;

import group7.joblink.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

// Truy vấn dữ liệu thật cho Trợ lý AI của ứng viên: hồ sơ, kỹ
// năng, CV, tin tuyển dụng đang mở và lịch phỏng vấn sắp tới.
public interface AssistantRepository extends JpaRepository<User, Integer> {

    // Trả [full_name, avatar, phone, dob, address, summary]
    @Query(value = """
        SELECT full_name, avatar, phone, dob, address, summary
        FROM candidate_profiles
        WHERE user_id = :userId
        """, nativeQuery = true)
    List<Object[]> findProfileRow(@Param("userId") Integer userId);

    // Trả [skill_name, years_exp] sắp theo kinh nghiệm giảm dần.
    @Query(value = """
        SELECT s.name, cs.years_exp
        FROM candidate_skills cs
        JOIN skills s ON s.id = cs.skill_id
        WHERE cs.candidate_id = :userId
        ORDER BY cs.years_exp DESC, s.name ASC
        """, nativeQuery = true)
    List<Object[]> findSkillRows(@Param("userId") Integer userId);

    // Bảng cvs không có cột user_id — chủ CV là candidate_id
    // (khóa ngoại tới candidate_profiles.user_id).
    @Query(value = "SELECT COUNT(*) FROM cvs WHERE candidate_id = :userId",
            nativeQuery = true)
    Long countCvs(@Param("userId") Integer userId);

    // Tin đang mở khớp từ khóa ở tiêu đề/địa điểm/công ty; từ khóa
    // rỗng thì lấy tin mới nhất. Ưu tiên tin được đẩy lên đầu.
    // Trả [id, title, company_name, salary_min, salary_max,
    //      salary_unit, location]
    @Query(value = """
        SELECT j.id, j.title, c.name, j.salary_min, j.salary_max,
               j.salary_unit, j.location
        FROM jobs j
        JOIN companies c ON c.id = j.company_id
        WHERE j.status = 'open'
          AND (:kw = '' OR j.title LIKE CONCAT('%', :kw, '%')
               OR j.location LIKE CONCAT('%', :kw, '%')
               OR c.name LIKE CONCAT('%', :kw, '%'))
        ORDER BY j.is_prioritized DESC, j.id DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> searchJobs(@Param("kw") String kw, @Param("limit") int limit);

    // Trả một hàng [job_count, avg_salary_min, avg_salary_max].
    @Query(value = """
        SELECT COUNT(*), AVG(salary_min), AVG(salary_max)
        FROM jobs
        WHERE status = 'open'
          AND (:kw = '' OR title LIKE CONCAT('%', :kw, '%'))
        """, nativeQuery = true)
    List<Object[]> salaryStats(@Param("kw") String kw);

    // Lịch phỏng vấn sắp tới gần nhất của ứng viên.
    // Trả [scheduled_at, location, notes, job_title, company_name]
    @Query(value = """
        SELECT ii.scheduled_at, ii.location, ii.notes, j.title, c.name
        FROM interview_invitations ii
        JOIN applications a ON a.id = ii.application_id
        JOIN jobs j ON j.id = a.job_id
        JOIN companies c ON c.id = j.company_id
        WHERE a.candidate_id = :userId
          AND ii.scheduled_at >= NOW() AND ii.status <> 'declined'
        ORDER BY ii.scheduled_at ASC
        LIMIT 1
        """, nativeQuery = true)
    List<Object[]> findNextInterview(@Param("userId") Integer userId);
}