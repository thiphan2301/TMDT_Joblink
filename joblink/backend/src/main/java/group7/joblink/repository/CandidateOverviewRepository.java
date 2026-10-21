package group7.joblink.repository;

import group7.joblink.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

// Số liệu trang Tổng quan của ứng viên: đơn ứng tuyển, lời mời
// phỏng vấn, lượt nhà tuyển dụng xem hồ sơ — đều đếm thật.
public interface CandidateOverviewRepository
        extends JpaRepository<User, Integer> {

    @Query(value = "SELECT COUNT(*) FROM applications WHERE candidate_id = :candidateId",
           nativeQuery = true)
    long countApplications(@Param("candidateId") int candidateId);

    // "Được mời" = có ít nhất một lời mời phỏng vấn, hoặc nhà
    // tuyển dụng đã chuyển đơn sang trạng thái invited.
    @Query(value = """
        SELECT COUNT(DISTINCT a.id) FROM applications a
        LEFT JOIN interview_invitations ii ON ii.application_id = a.id
        WHERE a.candidate_id = :candidateId
          AND (ii.id IS NOT NULL OR a.status = 'invited')
        """, nativeQuery = true)
    long countInvited(@Param("candidateId") int candidateId);

    @Query(value = "SELECT COUNT(*) FROM candidate_profile_views WHERE candidate_id = :candidateId",
           nativeQuery = true)
    long countProfileViews(@Param("candidateId") int candidateId);

    // [jobId, jobTitle, companyName, companyLogo, status, appliedAt]
    @Query(value = """
        SELECT j.id, j.title, comp.name, comp.logo, a.status, a.applied_at
        FROM applications a
        JOIN jobs j ON j.id = a.job_id
        JOIN companies comp ON comp.id = j.company_id
        WHERE a.candidate_id = :candidateId
        ORDER BY a.applied_at DESC, a.id DESC
        LIMIT 5
        """, nativeQuery = true)
    List<Object[]> findRecentApplications(@Param("candidateId") int candidateId);

    // [scheduledAt, location, notes, jobTitle, companyName]
    @Query(value = """
        SELECT ii.scheduled_at, ii.location, ii.notes, j.title, comp.name
        FROM interview_invitations ii
        JOIN applications a ON a.id = ii.application_id
        JOIN jobs j ON j.id = a.job_id
        JOIN companies comp ON comp.id = j.company_id
        WHERE a.candidate_id = :candidateId
          AND ii.scheduled_at >= NOW()
          AND ii.status <> 'declined'
        ORDER BY ii.scheduled_at ASC
        LIMIT 3
        """, nativeQuery = true)
    List<Object[]> findUpcomingInterviews(@Param("candidateId") int candidateId);
}
