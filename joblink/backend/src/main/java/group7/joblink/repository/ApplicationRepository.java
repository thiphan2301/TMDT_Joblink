package group7.joblink.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class ApplicationRepository {

    private final JdbcTemplate jdbc;

    public ApplicationRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> lockCandidate(int candidateId) {
        return jdbc.queryForList("""
            SELECT id, role, status
            FROM users
            WHERE id = ?
            FOR UPDATE
            """, candidateId);
    }

    public List<Map<String, Object>> lockWallet(int candidateId) {
        return jdbc.queryForList("""
            SELECT balance
            FROM token_wallets
            WHERE user_id = ?
            FOR UPDATE
            """, candidateId);
    }

    public List<Map<String, Object>> lockJob(int jobId) {
        return jdbc.queryForList("""
            SELECT id,
                   status,
                   (deadline IS NULL OR deadline >= CURRENT_DATE) AS withinDeadline
            FROM jobs
            WHERE id = ?
            FOR UPDATE
            """, jobId);
    }

    public List<Map<String, Object>> findExistingApplication(
            int candidateId, int jobId) {

        return jdbc.queryForList("""
            SELECT id
            FROM applications
            WHERE candidate_id = ? AND job_id = ?
            FOR UPDATE
            """, candidateId, jobId);
    }

    public List<Map<String, Object>> findDefaultCv(int candidateId) {
        return jdbc.queryForList("""
            SELECT id
            FROM cvs
            WHERE candidate_id = ? AND is_default = TRUE
            FOR UPDATE
            """, candidateId);
    }

    public int insertApplication(int candidateId, int jobId, int cvId) {
        jdbc.update("""
            INSERT INTO applications (job_id, candidate_id, cv_id, status)
            VALUES (?, ?, ?, 'pending')
            """, jobId, candidateId, cvId);

        return jdbc.queryForObject("""
            SELECT id
            FROM applications
            WHERE job_id = ? AND candidate_id = ?
            """, Integer.class, jobId, candidateId);
    }

    public void insertTokenSpend(
            int candidateId, int applicationId, int cost) {

        // Trigger BEFORE INSERT tính balance_after.
        // Trigger AFTER INSERT cập nhật token_wallets.balance.
        jdbc.update("""
            INSERT INTO token_transactions (
                wallet_id,
                type,
                amount,
                balance_after,
                idempotency_key,
                ref_type,
                ref_id
            )
            VALUES (?, 'spend', ?, 0, ?, 'application', ?)
            """,
            candidateId,
            -cost,
            "application:" + applicationId,
            applicationId
        );
    }

    public void insertInitialHistory(int applicationId, int candidateId) {
        jdbc.update("""
            INSERT INTO application_status_history (
                application_id, from_status, to_status, changed_by, note
            )
            VALUES (?, NULL, 'pending', ?, 'Ứng viên nộp hồ sơ')
            """, applicationId, candidateId);
    }

    public int getBalance(int candidateId) {
        return jdbc.queryForObject("""
            SELECT balance
            FROM token_wallets
            WHERE user_id = ?
            """, Integer.class, candidateId);
    }
}