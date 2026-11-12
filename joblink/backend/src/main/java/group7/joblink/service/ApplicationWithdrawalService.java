package group7.joblink.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Map;

@Service
public class ApplicationWithdrawalService {
    private final JdbcTemplate jdbc;
    public ApplicationWithdrawalService(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public record Result(String status, int refundedTokens, int balance, String message) {}

    @Transactional
    public Result withdraw(int userId, int applicationId, String reason) {
        String note = reason == null ? "" : reason.trim();
        if (note.isEmpty() || note.length() > 500)
            throw error(HttpStatus.BAD_REQUEST, "Vui lòng nhập lý do từ 1 đến 500 ký tự.");
        // Cùng thứ tự khóa với apply(): user -> wallet -> application.
        var users = jdbc.queryForList("SELECT role, status FROM users WHERE id = ? FOR UPDATE", userId);
        if (users.isEmpty()) throw error(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không còn hợp lệ.");
        if (!"candidate".equals(users.getFirst().get("role")) || !"active".equals(users.getFirst().get("status")))
            throw error(HttpStatus.FORBIDDEN, "Chỉ ứng viên đang hoạt động được rút hồ sơ.");
        var wallets = jdbc.queryForList("SELECT balance FROM token_wallets WHERE user_id = ? FOR UPDATE", userId);
        if (wallets.isEmpty()) throw error(HttpStatus.CONFLICT, "Tài khoản chưa có ví token.");
        var apps = jdbc.queryForList("SELECT status FROM applications WHERE id = ? AND candidate_id = ? FOR UPDATE", applicationId, userId);
        if (apps.isEmpty()) throw error(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ ứng tuyển.");
        String previous = (String) apps.getFirst().get("status");
        if ("withdrawn".equals(previous)) {
            return new Result("withdrawn", refunded(userId, applicationId), balance(userId), "Hồ sơ đã được rút trước đó. Không hoàn thêm token.");
        }
        if (!List.of("pending", "viewed", "invited").contains(previous))
            throw error(HttpStatus.CONFLICT, "Chỉ được rút hồ sơ đang chờ, đã xem hoặc đang mời phỏng vấn.");
        // Chỉ hoàn số token thực tế đã chi, trừ khoản đã hoàn; không mặc định cộng 5.
        int refund = 0;
        if ("pending".equals(previous)) {
            Integer spent = jdbc.queryForObject("SELECT COALESCE(-SUM(amount),0) FROM token_transactions WHERE wallet_id=? AND ref_type='application' AND ref_id=? AND type='spend' AND amount<0", Integer.class, userId, applicationId);
            refund = Math.max(0, spent - refunded(userId, applicationId));
        }
        if (refund > 0) {
            // Trigger tính balance_after và cộng ví; Java không cộng lần thứ hai.
            jdbc.update("INSERT INTO token_transactions(wallet_id,type,amount,balance_after,idempotency_key,ref_type,ref_id) VALUES (?,'refund',?,0,?,'application',?)",
                    userId, refund, "application-withdraw:" + applicationId, applicationId);
        }
        jdbc.update("UPDATE applications SET status='withdrawn' WHERE id=?", applicationId);
        jdbc.update("UPDATE interview_invitations SET status='declined' WHERE application_id=? AND status IN ('pending','accepted')", applicationId);
        String message = "Ứng viên rút hồ sơ. Lý do: " + note + ". Hoàn " + refund + " token.";
        jdbc.update("INSERT INTO application_status_history(application_id,from_status,to_status,changed_by,note) VALUES (?,?,'withdrawn',?,?)",
                applicationId, previous, userId, message);
        return new Result("withdrawn", refund, balance(userId), "Rút hồ sơ thành công. Đã hoàn " + refund + " token. Bạn còn " + balance(userId) + " token.");
    }

    private int refunded(int userId, int applicationId) {
        return jdbc.queryForObject("SELECT COALESCE(SUM(amount),0) FROM token_transactions WHERE wallet_id=? AND ref_type='application' AND ref_id=? AND type='refund' AND amount>0", Integer.class, userId, applicationId);
    }
    private int balance(int userId) {
        return jdbc.queryForObject("SELECT balance FROM token_wallets WHERE user_id=?", Integer.class, userId);
    }

    // Thông báo bền vững từ lịch sử; chỉ chủ công ty nhận được thông báo của mình.
    @Transactional(readOnly = true)
    public List<Map<String, Object>> notifications(int userId) {
        return jdbc.queryForList("""
            SELECT h.id, h.application_id AS applicationId, h.note, h.changed_at AS changedAt,
                   j.title AS jobTitle, cp.full_name AS candidateName
            FROM application_status_history h
            JOIN applications a ON a.id=h.application_id
            JOIN jobs j ON j.id=a.job_id
            JOIN companies c ON c.id=j.company_id
            JOIN candidate_profiles cp ON cp.user_id=a.candidate_id
            JOIN users u ON u.id=c.owner_id
            WHERE h.to_status='withdrawn' AND c.owner_id=? AND u.role='employer' AND u.status='active'
            ORDER BY h.changed_at DESC, h.id DESC LIMIT 50
            """, userId);
    }
    private static ResponseStatusException error(HttpStatus status, String message) {
        return new ResponseStatusException(status, message);
    }
}
