package group7.joblink.repository;

import group7.joblink.entity.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

// Truy vấn tin tuyển dụng cho khu vực nhà tuyển dụng. Entity Job không
// có constructor tạo mới / setter nên việc đăng và sửa tin đi qua SQL
// thuần (giống cách khu vực admin đã làm), phạm vi luôn giới hạn ở các
// công ty thuộc sở hữu của nhà tuyển dụng đang đăng nhập.
public interface EmployerJobRepository extends JpaRepository<Job, Integer> {

    // Các công ty thuộc sở hữu của nhà tuyển dụng (trả [id, name, logo]).
    @Query(value = """
        SELECT id, name, logo FROM companies
        WHERE owner_id = :employerId
        ORDER BY id
        """, nativeQuery = true)
    List<Object[]> findOwnCompanies(@Param("employerId") Integer employerId);

    // 1 nếu công ty thuộc về nhà tuyển dụng này, 0 nếu không.
    @Query(value = """
        SELECT COUNT(*) FROM companies
        WHERE id = :companyId AND owner_id = :employerId
        """, nativeQuery = true)
    long countOwnedCompany(@Param("companyId") Integer companyId,
                           @Param("employerId") Integer employerId);

    // Id các tin của nhà tuyển dụng, mới nhất trước.
    @Query(value = """
        SELECT j.id FROM jobs j
        JOIN companies c ON c.id = j.company_id
        WHERE c.owner_id = :employerId
        ORDER BY j.created_at DESC, j.id DESC
        """, nativeQuery = true)
    List<Integer> findOwnJobIds(@Param("employerId") Integer employerId);

    @Query(value = """
        SELECT COUNT(*) FROM jobs j
        JOIN companies c ON c.id = j.company_id
        WHERE c.owner_id = :employerId
        """, nativeQuery = true)
    long countJobsForEmployer(@Param("employerId") Integer employerId);

    @Query(value = """
        SELECT COUNT(*) FROM jobs j
        JOIN companies c ON c.id = j.company_id
        WHERE c.owner_id = :employerId AND j.status = :status
        """, nativeQuery = true)
    long countJobsForEmployerByStatus(@Param("employerId") Integer employerId,
                                      @Param("status") String status);

    // [display_days, token_cost] của nhiều tin (2 cột V7, entity chưa map).
    @Query(value = """
        SELECT id, display_days, token_cost FROM jobs WHERE id IN :ids
        """, nativeQuery = true)
    List<Object[]> findDisplayInfo(@Param("ids") Collection<Integer> ids);

    // Nhà tuyển dụng đăng tin mới. Cờ ưu tiên / nổi bật do service quyết
    // định theo gói dịch vụ; reviewed_by để trống (không phải admin duyệt).
    @Modifying
    @Query(value = """
        INSERT INTO jobs (company_id, title, description, requirements,
                          salary_min, salary_max, salary_unit, location,
                          job_type, level, vacancies, working_schedule,
                          deadline, status, is_highlighted, is_prioritized,
                          display_days, token_cost)
        VALUES (:companyId, :title, :description, :requirements,
                :salaryMin, :salaryMax, :salaryUnit, :location,
                :jobType, :level, :vacancies, :workingSchedule,
                :deadline, :status, :highlighted, :prioritized,
                :displayDays, :tokenCost)
        """, nativeQuery = true)
    int insertJob(@Param("companyId") Integer companyId,
                  @Param("title") String title,
                  @Param("description") String description,
                  @Param("requirements") String requirements,
                  @Param("salaryMin") BigDecimal salaryMin,
                  @Param("salaryMax") BigDecimal salaryMax,
                  @Param("salaryUnit") String salaryUnit,
                  @Param("location") String location,
                  @Param("jobType") String jobType,
                  @Param("level") String level,
                  @Param("vacancies") Integer vacancies,
                  @Param("workingSchedule") String workingSchedule,
                  @Param("deadline") LocalDate deadline,
                  @Param("status") String status,
                  @Param("highlighted") boolean highlighted,
                  @Param("prioritized") boolean prioritized,
                  @Param("displayDays") Integer displayDays,
                  @Param("tokenCost") Integer tokenCost);

    // Id của dòng vừa INSERT trên cùng kết nối.
    @Query(value = "SELECT LAST_INSERT_ID()", nativeQuery = true)
    Long lastInsertId();

    // Nhà tuyển dụng sửa nội dung tin của mình (không đổi công ty).
    @Modifying(clearAutomatically = true)
    @Query(value = """
        UPDATE jobs SET title = :title, description = :description,
                        requirements = :requirements,
                        salary_min = :salaryMin, salary_max = :salaryMax,
                        salary_unit = :salaryUnit, location = :location,
                        job_type = :jobType, level = :level,
                        vacancies = :vacancies,
                        working_schedule = :workingSchedule,
                        deadline = :deadline, status = :status
        WHERE id = :id
        """, nativeQuery = true)
    int updateJob(@Param("id") Integer id,
                  @Param("title") String title,
                  @Param("description") String description,
                  @Param("requirements") String requirements,
                  @Param("salaryMin") BigDecimal salaryMin,
                  @Param("salaryMax") BigDecimal salaryMax,
                  @Param("salaryUnit") String salaryUnit,
                  @Param("location") String location,
                  @Param("jobType") String jobType,
                  @Param("level") String level,
                  @Param("vacancies") Integer vacancies,
                  @Param("workingSchedule") String workingSchedule,
                  @Param("deadline") LocalDate deadline,
                  @Param("status") String status);

    @Modifying(clearAutomatically = true)
    @Query(value = "UPDATE jobs SET status = :status WHERE id = :id",
            nativeQuery = true)
    int updateJobStatus(@Param("id") Integer id, @Param("status") String status);

    @Modifying
    @Query(value = """
        UPDATE jobs SET is_highlighted = :highlighted,
                        is_prioritized = :prioritized
        WHERE id = :id
        """, nativeQuery = true)
    int updateJobFlags(@Param("id") Integer id,
                       @Param("highlighted") boolean highlighted,
                       @Param("prioritized") boolean prioritized);
}
