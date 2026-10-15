package group7.joblink.repository;

import group7.joblink.entity.Cv;
import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CvRepository extends JpaRepository<Cv, Integer> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT c
        FROM Cv c
        WHERE c.candidate.userId = :candidateId
          AND c.defaultCv = true
        """)
    Optional<Cv> findDefaultForUpdate(
            @Param("candidateId") Integer candidateId);
}