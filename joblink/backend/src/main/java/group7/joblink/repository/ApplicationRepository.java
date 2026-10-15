package group7.joblink.repository;

import group7.joblink.entity.Application;
import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ApplicationRepository
        extends JpaRepository<Application, Integer> {

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