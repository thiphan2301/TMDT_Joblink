package group7.joblink.repository;

import group7.joblink.entity.Application;
import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ApplicationRepository
        extends JpaRepository<Application, Integer> {

    // Đơn ứng tuyển của một ứng viên, đơn mới cập nhật lên đầu;
    // tải kèm tin tuyển dụng, công ty và CV để không phát sinh thêm truy vấn.
    @Query("""
        SELECT a
        FROM Application a
        JOIN FETCH a.job j
        JOIN FETCH j.company
        JOIN FETCH a.cv
        WHERE a.candidate.userId = :candidateId
        ORDER BY a.updatedAt DESC, a.id DESC
        """)
    List<Application> findAllByCandidate(
            @Param("candidateId") Integer candidateId);

    // Số đơn ứng tuyển của từng tin (tin chưa có đơn không có trong kết quả).
    @Query("""
        SELECT a.job.id AS jobId, COUNT(a) AS total
        FROM Application a
        WHERE a.job.id IN :jobIds
        GROUP BY a.job.id
        """)
    List<JobApplicationCount> countByJobIds(
            @Param("jobIds") Collection<Integer> jobIds);

    interface JobApplicationCount {
        Integer getJobId();
        Long getTotal();
    }

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT a
        FROM Application a
        WHERE a.candidate.userId = :candidateId
          AND a.job.id = :jobId
        """)
    Optional<Application> findExistingForUpdate(
            @Param("candidateId") Integer candidateId,
            @Param("jobId") Integer jobId);
}