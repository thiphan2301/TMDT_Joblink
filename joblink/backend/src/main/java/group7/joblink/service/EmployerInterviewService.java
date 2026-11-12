package group7.joblink.service;

import group7.joblink.dto.request.InterviewRequests.InviteRequest;
import group7.joblink.dto.request.InterviewRequests.RejectRequest;
import group7.joblink.dto.response.InterviewResponse;
import group7.joblink.entity.Application;
import group7.joblink.entity.ApplicationStatusHistory;
import group7.joblink.entity.InterviewInvitation;
import group7.joblink.repository.ApplicationStatusHistoryRepository;
import group7.joblink.repository.CompanyRepository;
import group7.joblink.repository.EmployerApplicationRepository;
import group7.joblink.repository.InterviewInvitationRepository;
import group7.joblink.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

// Nhà tuyển dụng quyết định với một đơn ứng tuyển (chức năng 11):
//  - Mời phỏng vấn: lưu lịch (interview_invitations), chuyển đơn sang "invited"
//    và ghi lịch sử kèm thời gian phỏng vấn để ứng viên thấy cập nhật mới.
//  - Từ chối: chuyển đơn sang "rejected", lý do (nếu có) ghi vào lịch sử.
// Chỉ thao tác được trên đơn thuộc tin của chính nhà tuyển dụng.
@Service
public class EmployerInterviewService {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter NOTE_TIME =
            DateTimeFormatter.ofPattern("HH:mm 'ngày' dd/MM/yyyy");
    private static final int LOCATION_MAX = 500;
    private static final int TEXT_MAX = 2000;

    private final EmployerApplicationRepository applicationRepository;
    private final CompanyRepository companyRepository;
    private final InterviewInvitationRepository interviewRepository;
    private final ApplicationStatusHistoryRepository historyRepository;
    private final UserRepository userRepository;
    private final Clock clock;

    @Autowired
    public EmployerInterviewService(EmployerApplicationRepository applicationRepository,
                                    CompanyRepository companyRepository,
                                    InterviewInvitationRepository interviewRepository,
                                    ApplicationStatusHistoryRepository historyRepository,
                                    UserRepository userRepository) {
        this(applicationRepository, companyRepository, interviewRepository,
                historyRepository, userRepository, Clock.system(VIETNAM_ZONE));
    }

    // Test truyền Clock cố định để kiểm tra "lịch phải ở tương lai".
    EmployerInterviewService(EmployerApplicationRepository applicationRepository,
                             CompanyRepository companyRepository,
                             InterviewInvitationRepository interviewRepository,
                             ApplicationStatusHistoryRepository historyRepository,
                             UserRepository userRepository,
                             Clock clock) {
        this.applicationRepository = applicationRepository;
        this.companyRepository = companyRepository;
        this.interviewRepository = interviewRepository;
        this.historyRepository = historyRepository;
        this.userRepository = userRepository;
        this.clock = clock;
    }

    // Lời mời mới nhất của đơn (null nếu chưa mời) — kèm phản hồi của ứng viên.
    @Transactional(readOnly = true)
    public InterviewResponse getInterview(int employerId, int applicationId) {
        requireOwnApplication(employerId, applicationId);
        return interviewRepository.findFirstByApplication_IdOrderByIdDesc(applicationId)
                .map(InterviewResponse::from)
                .orElse(null);
    }

    // Mời phỏng vấn; đơn đã được mời thì coi như gửi lại lịch mới.
    @Transactional
    public InterviewResponse invite(int employerId, int applicationId, InviteRequest body) {
        applicationRepository.findForUpdate(applicationId).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy đơn ứng tuyển."));
        Application application = requireOwnApplication(employerId, applicationId);
        if (application.getStatus() == Application.Status.withdrawn)
            throw error(HttpStatus.CONFLICT, "Ứng viên đã rút hồ sơ, không thể tiếp tục xử lý.");

        if (application.getStatus() == Application.Status.hired) {
            throw error(HttpStatus.CONFLICT, "Ứng viên đã trúng tuyển, không cần mời phỏng vấn.");
        }
        if (body == null || body.scheduledAt() == null) {
            throw error(HttpStatus.BAD_REQUEST, "Vui lòng chọn thời gian phỏng vấn.");
        }

        LocalDateTime scheduledAt = body.scheduledAt().withSecond(0).withNano(0);
        if (!scheduledAt.isAfter(LocalDateTime.now(clock))) {
            throw error(HttpStatus.BAD_REQUEST, "Thời gian phỏng vấn phải sau thời điểm hiện tại.");
        }

        String location = trimToNull(body.location());
        if (location == null) {
            throw error(HttpStatus.BAD_REQUEST,
                    "Vui lòng nhập địa điểm hoặc link phỏng vấn trực tuyến.");
        }
        if (location.length() > LOCATION_MAX) {
            throw error(HttpStatus.BAD_REQUEST, "Địa điểm tối đa " + LOCATION_MAX + " ký tự.");
        }

        String notes = trimToNull(body.notes());
        if (notes != null && notes.length() > TEXT_MAX) {
            throw error(HttpStatus.BAD_REQUEST, "Ghi chú tối đa " + TEXT_MAX + " ký tự.");
        }

        Application.Status from = application.getStatus();
        String note = (from == Application.Status.invited
                ? "Cập nhật lịch phỏng vấn: "
                : "Mời phỏng vấn lúc ") + NOTE_TIME.format(scheduledAt);

        InterviewInvitation invitation = interviewRepository.saveAndFlush(
                new InterviewInvitation(application, scheduledAt, location, notes));

        // Ghi lịch sử cả khi gửi lại lịch để ứng viên thấy cập nhật "Mới".
        historyRepository.saveAndFlush(new ApplicationStatusHistory(
                application, from, Application.Status.invited,
                userRepository.getReferenceById(employerId), note));

        if (from != Application.Status.invited) {
            applicationRepository.updateStatus(applicationId, Application.Status.invited);
        }

        return InterviewResponse.from(invitation);
    }

    @Transactional
    public void reject(int employerId, int applicationId, RejectRequest body) {
        applicationRepository.findForUpdate(applicationId).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy đơn ứng tuyển."));
        Application application = requireOwnApplication(employerId, applicationId);
        if (application.getStatus() == Application.Status.withdrawn)
            throw error(HttpStatus.CONFLICT, "Ứng viên đã rút hồ sơ, không thể tiếp tục xử lý.");
        Application.Status from = application.getStatus();

        if (from == Application.Status.rejected) {
            throw error(HttpStatus.CONFLICT, "Hồ sơ này đã bị từ chối trước đó.");
        }
        if (from == Application.Status.hired) {
            throw error(HttpStatus.CONFLICT, "Ứng viên đã trúng tuyển, không thể từ chối.");
        }

        String reason = trimToNull(body == null ? null : body.reason());
        if (reason != null && reason.length() > TEXT_MAX) {
            throw error(HttpStatus.BAD_REQUEST, "Lý do tối đa " + TEXT_MAX + " ký tự.");
        }

        historyRepository.saveAndFlush(new ApplicationStatusHistory(
                application, from, Application.Status.rejected,
                userRepository.getReferenceById(employerId), reason));

        applicationRepository.updateStatus(applicationId, Application.Status.rejected);
    }

    // Đơn của công ty khác cũng báo "không tìm thấy" để không lộ dữ liệu.
    private Application requireOwnApplication(int employerId, int applicationId) {
        return applicationRepository.findById(applicationId)
                .filter(application -> companyRepository
                        .findOwnerIdByCompanyId(application.getJob().getCompany().getId())
                        .filter(ownerId -> ownerId == employerId)
                        .isPresent())
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy đơn ứng tuyển."));
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static ResponseStatusException error(HttpStatus status, String message) {
        return new ResponseStatusException(status, message);
    }
}
