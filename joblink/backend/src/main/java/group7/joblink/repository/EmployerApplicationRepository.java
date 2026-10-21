package group7.joblink.repository;

import group7.joblink.entity.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

// Đơn ứng tuyển vào tin của nhà tuyển dụng (khu vực nhà tuyển dụng).
public interface EmployerApplicationRepository
        extends JpaRepository<Application, Integer> {

    // Đơn của một tin, mới nhất trước.
    List<Application> findByJobIdOrderByAppliedAtDesc(Integer jobId);

    long countByJobId(Integer jobId);

    // Số đơn theo từng tin (trả [job_id, số đơn]) để gắn vào danh sách tin.
    @Query(value = """
        SELECT job_id, COUNT(*) FROM applications
        WHERE job_id IN :jobIds
        GROUP BY job_id
        """, nativeQuery = true)
    List<Object[]> countByJobIds(@Param("jobIds") Collection<Integer> jobIds);

    // Số đơn MỚI (từ mốc thời gian) theo từng tin — huy hiệu "+N mới".
    @Query(value = """
        SELECT job_id, COUNT(*) FROM applications
        WHERE job_id IN :jobIds AND applied_at >= :since
        GROUP BY job_id
        """, nativeQuery = true)
    List<Object[]> countNewByJobIds(@Param("jobIds") Collection<Integer> jobIds,
                                    @Param("since") LocalDateTime since);

    // Tổng số đơn ứng tuyển vào mọi tin của nhà tuyển dụng.
    @Query(value = """
        SELECT COUNT(*) FROM applications a
        JOIN jobs j ON j.id = a.job_id
        JOIN companies c ON c.id = j.company_id
        WHERE c.owner_id = :employerId
        """, nativeQuery = true)
    long countAllForEmployer(@Param("employerId") Integer employerId);

    @Query(value = """
        SELECT COUNT(*) FROM applications a
        JOIN jobs j ON j.id = a.job_id
        JOIN companies c ON c.id = j.company_id
        WHERE c.owner_id = :employerId AND a.status = :status
        """, nativeQuery = true)
    long countForEmployerByStatus(@Param("employerId") Integer employerId,
                                  @Param("status") String status);

    @Query(value = """
        SELECT COUNT(*) FROM applications a
        JOIN jobs j ON j.id = a.job_id
        JOIN companies c ON c.id = j.company_id
        WHERE c.owner_id = :employerId AND a.applied_at >= :since
        """, nativeQuery = true)
    long countNewForEmployer(@Param("employerId") Integer employerId,
                             @Param("since") LocalDateTime since);

    // Đơn mới nhất trên mọi tin (trang Tổng quan).
    // Trả [id, candidate_id, candidate_name, candidate_avatar,
    //      job_title, status, applied_at]
    @Query(value = """
        SELECT a.id, a.candidate_id, cp.full_name, cp.avatar,
               j.title, a.status, a.applied_at
        FROM applications a
        JOIN jobs j ON j.id = a.job_id
        JOIN companies c ON c.id = j.company_id
        LEFT JOIN candidate_profiles cp ON cp.user_id = a.candidate_id
        WHERE c.owner_id = :employerId
        ORDER BY a.applied_at DESC, a.id DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> findRecentRows(@Param("employerId") Integer employerId,
                                  @Param("limit") int limit);

    // Số đơn theo ngày trong khoảng (biểu đồ trang Tổng quan).
    // Trả [ngày (DATE), số đơn]
    @Query(value = """
        SELECT DATE(a.applied_at) AS d, COUNT(*) AS c
        FROM applications a
        JOIN jobs j ON j.id = a.job_id
        JOIN companies comp ON comp.id = j.company_id
        WHERE comp.owner_id = :employerId AND a.applied_at >= :since
        GROUP BY DATE(a.applied_at)
        ORDER BY d
        """, nativeQuery = true)
    List<Object[]> countByDay(@Param("employerId") Integer employerId,
                              @Param("since") LocalDateTime since);

    // Toàn bộ đơn của nhà tuyển dụng cho trang Quản lý ứng viên, có lọc
    // theo tin / trạng thái / từ khóa tên ứng viên (tham số null = bỏ qua).
    // Trả [id, candidate_id, candidate_name, candidate_avatar,
    //      candidate_address, candidate_email, cv_file_name, status,
    //      applied_at, job_id, job_title, skills_csv, skills_count]
    @Query(value = """
        SELECT a.id, a.candidate_id,
               COALESCE(cp.full_name, SUBSTRING_INDEX(u.email, '@', 1)),
               cp.avatar, cp.address, u.email, cv.file_name,
               a.status, a.applied_at, a.job_id, j.title,
               (SELECT GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', ')
                FROM candidate_skills cs JOIN skills s ON s.id = cs.skill_id
                WHERE cs.candidate_id = a.candidate_id) AS skills_csv,
               (SELECT COUNT(*) FROM candidate_skills cs
                WHERE cs.candidate_id = a.candidate_id) AS skills_count
        FROM applications a
        JOIN jobs j ON j.id = a.job_id
        JOIN companies comp ON comp.id = j.company_id
        JOIN users u ON u.id = a.candidate_id
        LEFT JOIN candidate_profiles cp ON cp.user_id = a.candidate_id
        LEFT JOIN cvs cv ON cv.id = a.cv_id
        WHERE comp.owner_id = :employerId
          AND (:jobId IS NULL OR a.job_id = :jobId)
          AND (:status IS NULL OR a.status = :status)
          AND (:q IS NULL OR :q = '' OR cp.full_name LIKE CONCAT('%', :q, '%'))
        ORDER BY a.applied_at DESC, a.id DESC
        LIMIT 500
        """, nativeQuery = true)
    List<Object[]> findGlobalRows(@Param("employerId") Integer employerId,
                                  @Param("jobId") Integer jobId,
                                  @Param("status") String status,
                                  @Param("q") String q);

    // Ứng viên này đã từng nộp đơn vào tin của nhà tuyển dụng chưa
    // (điều kiện để nhà tuyển dụng được nhắn tin trực tiếp).
    @Query(value = """
        SELECT COUNT(*) FROM applications a
        JOIN jobs j ON j.id = a.job_id
        JOIN companies c ON c.id = j.company_id
        WHERE a.candidate_id = :candidateId AND c.owner_id = :employerId
        """, nativeQuery = true)
    long countApplicationsFromCandidate(@Param("candidateId") Integer candidateId,
                                        @Param("employerId") Integer employerId);

    // Đổi trạng thái đơn (entity Application không có setter cho status).
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Application a SET a.status = :status WHERE a.id = :id")
    int updateStatus(@Param("id") Integer id,
                     @Param("status") Application.Status status);

    // Ghi lịch sử đổi trạng thái (bảng application_status_history).
    @Modifying
    @Query(value = """
        INSERT INTO application_status_history
            (application_id, from_status, to_status, changed_by)
        VALUES (:applicationId, :fromStatus, :toStatus, :changedBy)
        """, nativeQuery = true)
    int insertHistory(@Param("applicationId") Integer applicationId,
                      @Param("fromStatus") String fromStatus,
                      @Param("toStatus") String toStatus,
                      @Param("changedBy") Integer changedBy);
}
