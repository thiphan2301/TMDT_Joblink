package group7.joblink.repository;

import group7.joblink.entity.Job;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

// Repository JPA dành riêng cho khu vực admin trên bảng jobs — tách riêng
// khỏi JobRepository của project để phần admin không phải sửa file dùng chung.
//
// Entity Job của project không có setter/constructor tạo mới và chưa map
// các cột display_days, token_cost (migration V7), reviewed_by, reviewed_at
// nên phần tạo/sửa tin của admin dùng @Modifying SQL thuần trên chính
// repository này; phần đọc tin vẫn qua entity như bình thường.
public interface AdminJobRepository extends JpaRepository<Job, Integer> {

    // Số tin mới trong khoảng [from, to) — biểu đồ tăng trưởng.
    long countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(
        LocalDateTime from, LocalDateTime to);

    // Toàn bộ tin ở trang quản lý tin đăng: mới nhất trước, tải kèm công ty.
    @EntityGraph(attributePaths = {"company"})
    List<Job> findAllByOrderByCreatedAtDescIdDesc();

    // Số ngày hiển thị + Token của từng tin (2 cột V7 chưa có trong entity,
    // trả [id, display_days, token_cost] — giá trị có thể null nếu DB để trống).
    @Query(value = "SELECT id, display_days, token_cost FROM jobs",
            nativeQuery = true)
    List<Object[]> displayInfoByJob();

    // Số đơn ứng tuyển của từng tin (bảng applications chưa có entity
    // nên đếm bằng SQL thuần, trả [job_id, số đơn]).
    @Query(value = """
        SELECT job_id, COUNT(*)
        FROM applications
        GROUP BY job_id
        """, nativeQuery = true)
    List<Object[]> countApplicationsByJob();

    // Số dư ví Token của nhà tuyển dụng sở hữu từng tin (bảng token_wallets
    // và cột companies.owner_id chưa có trong entity nên dùng SQL thuần,
    // trả [job_id, số dư] — số dư null nếu nhà tuyển dụng chưa có ví).
    @Query(value = """
        SELECT j.id, tw.balance
        FROM jobs j
        JOIN companies c ON c.id = j.company_id
        LEFT JOIN token_wallets tw ON tw.user_id = c.owner_id
        """, nativeQuery = true)
    List<Object[]> walletBalanceByJob();

    // Danh sách ứng viên của một tin (cho cửa sổ xem đơn ứng tuyển).
    // Trả [id, status, applied_at, candidate_name, candidate_email]:
    // tên lấy từ hồ sơ ứng viên, chưa có hồ sơ thì lấy phần trước @ của email.
    @Query(value = """
        SELECT a.id, a.status, a.applied_at,
               COALESCE(cp.full_name, SUBSTRING_INDEX(u.email, '@', 1)) AS candidate_name,
               u.email AS candidate_email
        FROM applications a
        JOIN users u ON u.id = a.candidate_id
        LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
        WHERE a.job_id = :jobId
        ORDER BY a.applied_at DESC, a.id DESC
        """, nativeQuery = true)
    List<Object[]> findApplicationsByJob(@Param("jobId") Integer jobId);

    // Admin đăng tin hộ nhà tuyển dụng (kèm người duyệt + thời điểm duyệt).
    // vacancies để mặc định 1 như quy ước cũ của khu vực admin.
    @Modifying
    @Query(value = """
        INSERT INTO jobs (company_id, title, description, salary_min, salary_max,
                          salary_unit, location, job_type, level, vacancies,
                          working_schedule, deadline, status,
                          display_days, token_cost, reviewed_by, reviewed_at)
        VALUES (:companyId, :title, :description, :salaryMin, :salaryMax,
                :salaryUnit, :location, :jobType, :level, 1,
                :workingSchedule, :deadline, :status,
                :displayDays, :tokenCost, :adminId, NOW())
        """, nativeQuery = true)
    int insertJob(@Param("companyId") Integer companyId,
                  @Param("title") String title,
                  @Param("description") String description,
                  @Param("salaryMin") BigDecimal salaryMin,
                  @Param("salaryMax") BigDecimal salaryMax,
                  @Param("salaryUnit") String salaryUnit,
                  @Param("location") String location,
                  @Param("jobType") String jobType,
                  @Param("level") String level,
                  @Param("workingSchedule") String workingSchedule,
                  @Param("deadline") LocalDate deadline,
                  @Param("status") String status,
                  @Param("displayDays") Integer displayDays,
                  @Param("tokenCost") Integer tokenCost,
                  @Param("adminId") Integer adminId);

    // Admin sửa nội dung tin (không đổi công ty, ngày hiển thị và Token —
    // khớp hành vi cũ), đồng thời ghi người duyệt + thời điểm duyệt.
    // clearAutomatically: dọn persistence context để service đọc lại
    // entity mới nhất sau khi cập nhật bằng SQL.
    @Modifying(clearAutomatically = true)
    @Query(value = """
        UPDATE jobs
        SET title = :title, description = :description,
            salary_min = :salaryMin, salary_max = :salaryMax,
            salary_unit = :salaryUnit, location = :location,
            job_type = :jobType, level = :level,
            working_schedule = :workingSchedule, deadline = :deadline,
            status = :status, reviewed_by = :adminId, reviewed_at = NOW()
        WHERE id = :id
        """, nativeQuery = true)
    int updateJob(@Param("id") Integer id,
                  @Param("title") String title,
                  @Param("description") String description,
                  @Param("salaryMin") BigDecimal salaryMin,
                  @Param("salaryMax") BigDecimal salaryMax,
                  @Param("salaryUnit") String salaryUnit,
                  @Param("location") String location,
                  @Param("jobType") String jobType,
                  @Param("level") String level,
                  @Param("workingSchedule") String workingSchedule,
                  @Param("deadline") LocalDate deadline,
                  @Param("status") String status,
                  @Param("adminId") Integer adminId);

    // Admin đổi trạng thái tin (duyệt, từ chối, tạm dừng...) kèm người duyệt.
    @Modifying(clearAutomatically = true)
    @Query(value = """
        UPDATE jobs
        SET status = :status, reviewed_by = :adminId, reviewed_at = NOW()
        WHERE id = :id
        """, nativeQuery = true)
    int updateJobStatus(@Param("id") Integer id,
                        @Param("status") String status,
                        @Param("adminId") Integer adminId);
}
