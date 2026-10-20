package group7.joblink.service;

import group7.joblink.dto.response.MyApplicationResponse;
import group7.joblink.dto.response.MyApplicationResponse.Interview;
import group7.joblink.dto.response.MyApplicationResponse.StatusChange;
import group7.joblink.entity.Application;
import group7.joblink.entity.ApplicationStatusHistory;
import group7.joblink.entity.Company;
import group7.joblink.entity.InterviewInvitation;
import group7.joblink.entity.Job;
import group7.joblink.entity.User;
import group7.joblink.repository.ApplicationRepository;
import group7.joblink.repository.ApplicationStatusHistoryRepository;
import group7.joblink.repository.InterviewInvitationRepository;
import group7.joblink.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.BinaryOperator;
import java.util.stream.Collectors;

// Ứng viên xem các đơn đã ứng tuyển và trạng thái
// (đang chờ, đã xem, mời phỏng vấn, bị từ chối, trúng tuyển).
@Service
public class CandidateApplicationService {

    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;
    private final ApplicationStatusHistoryRepository historyRepository;
    private final InterviewInvitationRepository interviewRepository;

    public CandidateApplicationService(
            UserRepository userRepository,
            ApplicationRepository applicationRepository,
            ApplicationStatusHistoryRepository historyRepository,
            InterviewInvitationRepository interviewRepository) {
        this.userRepository = userRepository;
        this.applicationRepository = applicationRepository;
        this.historyRepository = historyRepository;
        this.interviewRepository = interviewRepository;
    }

    @Transactional(readOnly = true)
    public List<MyApplicationResponse> getMyApplications(Integer userId) {
        requireCandidate(userId);

        List<Application> applications =
                applicationRepository.findAllByCandidate(userId);

        if (applications.isEmpty()) {
            return List.of();
        }

        List<Integer> ids = applications.stream()
                .map(Application::getId)
                .toList();

        // Lịch sử trạng thái theo từng đơn (đã sắp xếp cũ -> mới).
        Map<Integer, List<StatusChange>> historyByApplication = historyRepository
                .findByApplication_IdInOrderByChangedAtAscIdAsc(ids)
                .stream()
                .collect(Collectors.groupingBy(
                        history -> history.getApplication().getId(),
                        Collectors.mapping(this::toStatusChange, Collectors.toList())
                ));

        // Mỗi đơn chỉ lấy lời mời phỏng vấn mới nhất.
        BinaryOperator<InterviewInvitation> latest = BinaryOperator.maxBy(
                Comparator.comparing(InterviewInvitation::getId));

        Map<Integer, InterviewInvitation> interviewByApplication = interviewRepository
                .findByApplication_IdIn(ids)
                .stream()
                .collect(Collectors.toMap(
                        invitation -> invitation.getApplication().getId(),
                        invitation -> invitation,
                        latest
                ));

        return applications.stream()
                .map(application -> toResponse(
                        application,
                        historyByApplication.getOrDefault(application.getId(), List.of()),
                        interviewByApplication.get(application.getId())))
                .toList();
    }

    private void requireCandidate(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Phiên đăng nhập không còn hợp lệ."
                ));

        if (user.getStatus() == User.Status.locked) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản của bạn đã bị khóa."
            );
        }

        if (user.getRole() != User.Role.candidate) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chỉ tài khoản ứng viên mới xem được việc đã ứng tuyển."
            );
        }
    }

    private StatusChange toStatusChange(ApplicationStatusHistory history) {
        return new StatusChange(
                history.getFromStatus() == null ? null : history.getFromStatus().name(),
                history.getToStatus().name(),
                history.getChangedAt(),
                history.getNote()
        );
    }

    private MyApplicationResponse toResponse(
            Application application,
            List<StatusChange> history,
            InterviewInvitation invitation) {

        Job job = application.getJob();
        Company company = job.getCompany();

        Interview interview = invitation == null
                ? null
                : new Interview(
                        invitation.getScheduledAt(),
                        invitation.getLocation(),
                        invitation.getNotes(),
                        invitation.getStatus().name());

        return new MyApplicationResponse(
                application.getId(),
                application.getStatus().name(),
                application.getAppliedAt(),
                application.getUpdatedAt(),

                job.getId(),
                job.getTitle(),
                job.getLocation(),
                job.getSalaryMin(),
                job.getSalaryMax(),
                job.getSalaryUnit().name(),

                company.getId(),
                company.getName(),
                company.getLogo(),

                application.getCv().getFileName(),

                history,
                interview
        );
    }
}
