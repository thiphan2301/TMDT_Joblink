package group7.joblink.service;

import group7.joblink.repository.ApplicationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@Service
public class ApplicationService {

    private static final int APPLICATION_COST = 5;

    private final ApplicationRepository repository;

    public ApplicationService(ApplicationRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public Map<String, Object> apply(int candidateId, int jobId) {
        var users = repository.lockCandidate(candidateId);

        if (users.isEmpty()) {
            throw error(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản ứng viên.");
        }

        var user = users.getFirst();

        if (!"candidate".equals(user.get("role"))) {
            throw error(
                HttpStatus.FORBIDDEN,
                "Chỉ tài khoản ứng viên được ứng tuyển."
            );
        }

        if (!"active".equals(user.get("status"))) {
            throw error(HttpStatus.FORBIDDEN, "Tài khoản đã bị khóa.");
        }

        // Khóa ví trong suốt transaction để tránh trừ tiền đồng thời.
        var wallets = repository.lockWallet(candidateId);

        if (wallets.isEmpty()) {
            throw error(
                HttpStatus.CONFLICT,
                "Tài khoản chưa có ví token."
            );
        }

        int balance = ((Number) wallets.getFirst().get("balance")).intValue();

        var jobs = repository.lockJob(jobId);

        if (jobs.isEmpty()) {
            throw error(HttpStatus.NOT_FOUND, "Không tìm thấy việc làm.");
        }

        var existing = repository.findExistingApplication(candidateId, jobId);

        // Cho phép bấm lại hoặc gửi lại yêu cầu mà không trừ thêm.
        if (!existing.isEmpty()) {
            return Map.of(
                "alreadyApplied", true,
                "applicationId", existing.getFirst().get("id"),
                "balance", balance,
                "cost", 0,
                "message", "Bạn đã ứng tuyển công việc này. Không trừ thêm token."
            );
        }

        var job = jobs.getFirst();

        if (!"open".equals(job.get("status"))
                || !asBoolean(job.get("withinDeadline"))) {
            throw error(
                HttpStatus.CONFLICT,
                "Công việc đã đóng hoặc hết hạn nhận hồ sơ."
            );
        }

        var cvs = repository.findDefaultCv(candidateId);

        if (cvs.isEmpty()) {
            throw error(
                HttpStatus.CONFLICT,
                "Bạn cần tải CV và chọn CV mặc định trước khi ứng tuyển."
            );
        }

        if (balance < APPLICATION_COST) {
            throw error(
                HttpStatus.CONFLICT,
                "Không đủ token. Bạn còn " + balance
                    + " token, cần " + APPLICATION_COST
                    + " token để ứng tuyển."
            );
        }

        int cvId = ((Number) cvs.getFirst().get("id")).intValue();

        int applicationId = repository.insertApplication(
            candidateId, jobId, cvId
        );

        repository.insertTokenSpend(
            candidateId, applicationId, APPLICATION_COST
        );

        repository.insertInitialHistory(applicationId, candidateId);

        int remaining = repository.getBalance(candidateId);

        return Map.of(
            "alreadyApplied", false,
            "applicationId", applicationId,
            "balance", remaining,
            "cost", APPLICATION_COST,
            "message", "Ứng tuyển thành công! Đã trừ "
                + APPLICATION_COST + " token. Bạn còn "
                + remaining + " token."
        );
    }

    private boolean asBoolean(Object value) {
        if (value instanceof Boolean booleanValue) {
            return booleanValue;
        }

        if (value instanceof Number numberValue) {
            return numberValue.intValue() != 0;
        }

        return "1".equals(String.valueOf(value));
    }

    private ResponseStatusException error(HttpStatus status, String message) {
        return new ResponseStatusException(status, message);
    }
}