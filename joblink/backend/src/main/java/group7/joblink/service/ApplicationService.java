package group7.joblink.service;

import group7.joblink.dto.response.ApplyResponse;
import group7.joblink.entity.*;
import group7.joblink.repository.*;

import jakarta.persistence.EntityManager;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneId;

@Service
public class ApplicationService {

    private static final int APPLICATION_COST = 5;

    private static final ZoneId VIETNAM_ZONE =
            ZoneId.of("Asia/Ho_Chi_Minh");

    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final JobRepository jobRepository;
    private final CvRepository cvRepository;
    private final ApplicationRepository applicationRepository;
    private final TokenWalletRepository tokenWalletRepository;
    private final TokenTransactionRepository tokenTransactionRepository;
    private final ApplicationStatusHistoryRepository historyRepository;
    private final EntityManager entityManager;

    public ApplicationService(
            UserRepository userRepository,
            CandidateProfileRepository candidateProfileRepository,
            JobRepository jobRepository,
            CvRepository cvRepository,
            ApplicationRepository applicationRepository,
            TokenWalletRepository tokenWalletRepository,
            TokenTransactionRepository tokenTransactionRepository,
            ApplicationStatusHistoryRepository historyRepository,
            EntityManager entityManager) {

        this.userRepository = userRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.jobRepository = jobRepository;
        this.cvRepository = cvRepository;
        this.applicationRepository = applicationRepository;
        this.tokenWalletRepository = tokenWalletRepository;
        this.tokenTransactionRepository = tokenTransactionRepository;
        this.historyRepository = historyRepository;
        this.entityManager = entityManager;
    }

    @Transactional
    public ApplyResponse apply(Integer candidateId, Integer jobId) {

        // 1. Kiểm tra tài khoản và khóa trong transaction.
        User user = userRepository.findForUpdate(candidateId)
                .orElseThrow(() -> error(
                        HttpStatus.UNAUTHORIZED,
                        "Phiên đăng nhập không còn hợp lệ."
                ));

        if (user.getRole() != User.Role.candidate) {
            throw error(
                    HttpStatus.FORBIDDEN,
                    "Chỉ tài khoản ứng viên được ứng tuyển."
            );
        }

        if (user.getStatus() != User.Status.active) {
            throw error(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản của bạn đã bị khóa."
            );
        }

        // 2. Khóa ví để các yêu cầu đồng thời không dùng chung số dư cũ.
        TokenWallet wallet = tokenWalletRepository
                .findForUpdate(candidateId)
                .orElseThrow(() -> error(
                        HttpStatus.CONFLICT,
                        "Tài khoản chưa có ví token."
                ));

        // 3. Khóa tin để trạng thái không đổi giữa lúc kiểm tra và lưu đơn.
        Job job = jobRepository.findForUpdate(jobId)
                .orElseThrow(() -> error(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy việc làm."
                ));

        // 4. Đã ứng tuyển thì trả lại đơn cũ, không trừ thêm token.
        var existing = applicationRepository.findExistingForUpdate(
                candidateId, jobId
        );

        if (existing.isPresent()) {
            return new ApplyResponse(
                    true,
                    existing.get().getId(),
                    wallet.getBalance(),
                    0,
                    "Bạn đã ứng tuyển công việc này. Không trừ thêm token."
            );
        }

        // 5. Kiểm tra tin còn nhận hồ sơ; hạn hôm nay vẫn được ứng tuyển.
        LocalDate today = LocalDate.now(VIETNAM_ZONE);

        boolean expired = job.getDeadline() != null
                && job.getDeadline().isBefore(today);

        if (job.getStatus() != Job.Status.open || expired) {
            throw error(
                    HttpStatus.CONFLICT,
                    "Công việc đã đóng hoặc hết hạn nhận hồ sơ."
            );
        }

        CandidateProfile candidate = candidateProfileRepository
                .findById(candidateId)
                .orElseThrow(() -> error(
                        HttpStatus.CONFLICT,
                        "Bạn cần hoàn thiện hồ sơ ứng viên trước khi ứng tuyển."
                ));

        // 6. Chỉ lấy CV mặc định thuộc đúng ứng viên này.
        Cv cv = cvRepository.findDefaultForUpdate(candidateId)
                .orElseThrow(() -> error(
                        HttpStatus.CONFLICT,
                        "Bạn cần tải CV và chọn CV mặc định trước khi ứng tuyển."
                ));

        if (wallet.getBalance() < APPLICATION_COST) {
            throw error(
                    HttpStatus.CONFLICT,
                    "Không đủ token. Bạn còn " + wallet.getBalance()
                            + " token, cần " + APPLICATION_COST
                            + " token để ứng tuyển."
            );
        }

        // 7. Lưu đơn để có applicationId dùng cho giao dịch và lịch sử.
        Application application = applicationRepository.saveAndFlush(
                new Application(job, candidate, cv)
        );

        // 8. Ghi giao dịch -5 token.
        // Trigger database tự cập nhật ví; không trừ số dư thêm ở Java.
        tokenTransactionRepository.saveAndFlush(
                TokenTransaction.forApplication(
                        wallet,
                        application.getId(),
                        APPLICATION_COST
                )
        );

        // 9. Ghi trạng thái ban đầu.
        historyRepository.saveAndFlush(
                new ApplicationStatusHistory(application, user)
        );

        // 10. Đọc lại vì trigger cập nhật DB, entity trong bộ nhớ còn số dư cũ.
        entityManager.refresh(wallet);

        int remaining = wallet.getBalance();

        return new ApplyResponse(
                false,
                application.getId(),
                remaining,
                APPLICATION_COST,
                "Ứng tuyển thành công! Đã trừ " + APPLICATION_COST
                        + " token. Bạn còn " + remaining + " token."
        );
    }

    private static ResponseStatusException error(
            HttpStatus status,
            String message) {

        return new ResponseStatusException(status, message);
    }
}