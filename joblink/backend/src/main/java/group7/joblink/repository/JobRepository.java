package group7.joblink.repository;

import group7.joblink.entity.Job;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface JobRepository extends JpaRepository<Job, Integer> {

    // Lấy tin đang mở, chưa hết hạn; tải kèm công ty và kỹ năng.
    @EntityGraph(attributePaths = {"company", "skills"})
    @Query("""
        SELECT DISTINCT j
        FROM Job j
        WHERE j.status = :status
          AND (j.deadline IS NULL OR j.deadline >= :today)
        ORDER BY j.prioritized DESC, j.createdAt DESC, j.id DESC
        """)
    List<Job> findAvailableJobs(
        @Param("status") Job.Status status,
        @Param("today") LocalDate today
    );

    // Lấy chi tiết một tin, tải kèm công ty và kỹ năng.
    @Override
    @EntityGraph(attributePaths = {"company", "skills"})
    Optional<Job> findById(Integer id);
}