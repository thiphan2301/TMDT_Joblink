
package group7.joblink.repository;

import group7.joblink.entity.EmailOtp;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface EmailOtpRepository
        extends JpaRepository<EmailOtp, String> {

    @Query(
            value = """
            SELECT *
            FROM email_otps
            WHERE email = :email
            FOR UPDATE
            """,
            nativeQuery = true
    )
    Optional<EmailOtp> findLockedByEmail(
            @Param("email") String email
    );
}
