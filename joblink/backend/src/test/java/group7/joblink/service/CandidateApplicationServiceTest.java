package group7.joblink.service;

import group7.joblink.dto.response.MyApplicationResponse;
import group7.joblink.entity.Application;
import group7.joblink.entity.ApplicationStatusHistory;
import group7.joblink.entity.CandidateProfile;
import group7.joblink.entity.Company;
import group7.joblink.entity.Cv;
import group7.joblink.entity.InterviewInvitation;
import group7.joblink.entity.Job;
import group7.joblink.entity.User;
import group7.joblink.repository.ApplicationRepository;
import group7.joblink.repository.ApplicationStatusHistoryRepository;
import group7.joblink.repository.InterviewInvitationRepository;
import group7.joblink.repository.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.BeanUtils;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CandidateApplicationServiceTest {

    private static final int USER_ID = 5;

    private UserRepository userRepository;
    private ApplicationRepository applicationRepository;
    private ApplicationStatusHistoryRepository historyRepository;
    private InterviewInvitationRepository interviewRepository;
    private CandidateApplicationService service;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        applicationRepository = mock(ApplicationRepository.class);
        historyRepository = mock(ApplicationStatusHistoryRepository.class);
        interviewRepository = mock(InterviewInvitationRepository.class);
        service = new CandidateApplicationService(
                userRepository, applicationRepository, historyRepository, interviewRepository);
    }

    @Test
    void traVeDonKemLichSuVaLoiMoiPhongVanMoiNhat() {
        givenUser(User.Role.candidate);
        Application invited = application(2, Application.Status.invited, "Frontend Developer", "Tiki");
        Application rejected = application(9, Application.Status.rejected, "Backend Java", "FPT Software");
        when(applicationRepository.findAllByCandidate(USER_ID)).thenReturn(List.of(invited, rejected));

        LocalDateTime t1 = LocalDateTime.of(2026, 10, 10, 9, 0);
        LocalDateTime t2 = LocalDateTime.of(2026, 10, 12, 14, 30);
        when(historyRepository.findByApplication_IdInOrderByChangedAtAscIdAsc(List.of(2, 9))).thenReturn(List.of(
                history(invited, Application.Status.pending, Application.Status.viewed, t1, "Đã xem hồ sơ"),
                history(invited, Application.Status.viewed, Application.Status.invited, t2, "Mời phỏng vấn vòng 1"),
                history(rejected, Application.Status.pending, Application.Status.rejected, t2, null)));

        LocalDateTime interviewTime = LocalDateTime.of(2026, 10, 20, 9, 30);
        when(interviewRepository.findByApplication_IdIn(List.of(2, 9))).thenReturn(List.of(
                interview(1, invited, LocalDateTime.of(2026, 10, 15, 9, 0), "Phòng cũ"),
                interview(3, invited, interviewTime, "Tầng 10, 52 Út Tịch")));

        List<MyApplicationResponse> result = service.getMyApplications(USER_ID);

        assertThat(result).extracting(MyApplicationResponse::id).containsExactly(2, 9);

        MyApplicationResponse first = result.get(0);
        assertThat(first.status()).isEqualTo("invited");
        assertThat(first.jobTitle()).isEqualTo("Frontend Developer");
        assertThat(first.companyName()).isEqualTo("Tiki");
        assertThat(first.cvFileName()).isEqualTo("CV.pdf");
        assertThat(first.history()).extracting(MyApplicationResponse.StatusChange::toStatus)
                .containsExactly("viewed", "invited");
        // Lấy lời mời mới nhất (id lớn nhất).
        assertThat(first.interview().scheduledAt()).isEqualTo(interviewTime);
        assertThat(first.interview().location()).isEqualTo("Tầng 10, 52 Út Tịch");
        assertThat(first.interview().status()).isEqualTo("pending");

        MyApplicationResponse second = result.get(1);
        assertThat(second.status()).isEqualTo("rejected");
        assertThat(second.history()).hasSize(1);
        assertThat(second.interview()).isNull();
    }

    @Test
    void chuaUngTuyenThiTraVeDanhSachRong() {
        givenUser(User.Role.candidate);
        when(applicationRepository.findAllByCandidate(USER_ID)).thenReturn(List.of());

        assertThat(service.getMyApplications(USER_ID)).isEmpty();
        verifyNoInteractions(historyRepository, interviewRepository);
    }

    @Test
    void donChuaCoLichSuVanTraVeDanhSachRong() {
        givenUser(User.Role.candidate);
        Application pending = application(3, Application.Status.pending, "Tester", "VNG");
        when(applicationRepository.findAllByCandidate(USER_ID)).thenReturn(List.of(pending));
        when(historyRepository.findByApplication_IdInOrderByChangedAtAscIdAsc(any())).thenReturn(List.of());
        when(interviewRepository.findByApplication_IdIn(any())).thenReturn(List.of());

        MyApplicationResponse response = service.getMyApplications(USER_ID).get(0);

        assertThat(response.history()).isEmpty();
        assertThat(response.interview()).isNull();
    }

    @Test
    void chiUngVienMoiXemDuoc() {
        givenUser(User.Role.employer);

        assertStatus(HttpStatus.FORBIDDEN);
        verifyNoInteractions(applicationRepository);
    }

    @Test
    void taiKhoanBiKhoaKhongXemDuoc() {
        User user = givenUser(User.Role.candidate);
        user.setStatus(User.Status.locked);

        assertStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void phienKhongConHopLe() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

        assertStatus(HttpStatus.UNAUTHORIZED);
    }

    private User givenUser(User.Role role) {
        User user = new User("tran.thi.d@gmail.com", role);
        user.setId(USER_ID);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        return user;
    }

    private void assertStatus(HttpStatus status) {
        assertThatThrownBy(() -> service.getMyApplications(USER_ID))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception ->
                        assertThat(exception.getStatusCode()).isEqualTo(status));
    }

    private static Application application(int id, Application.Status status, String title, String companyName) {
        Company company = BeanUtils.instantiateClass(Company.class);
        ReflectionTestUtils.setField(company, "id", 1);
        ReflectionTestUtils.setField(company, "name", companyName);

        Job job = BeanUtils.instantiateClass(Job.class);
        ReflectionTestUtils.setField(job, "id", id * 10);
        ReflectionTestUtils.setField(job, "title", title);
        ReflectionTestUtils.setField(job, "company", company);
        ReflectionTestUtils.setField(job, "salaryUnit", Job.SalaryUnit.month);

        CandidateProfile candidate = new CandidateProfile(USER_ID, "Trần Thị D", null);
        Cv cv = new Cv(candidate, "/uploads/cv/cv.pdf", "CV.pdf", true);

        Application application = new Application(job, candidate, cv);
        ReflectionTestUtils.setField(application, "id", id);
        ReflectionTestUtils.setField(application, "status", status);
        return application;
    }

    private static ApplicationStatusHistory history(
            Application application,
            Application.Status from,
            Application.Status to,
            LocalDateTime changedAt,
            String note) {
        ApplicationStatusHistory history = BeanUtils.instantiateClass(ApplicationStatusHistory.class);
        ReflectionTestUtils.setField(history, "application", application);
        ReflectionTestUtils.setField(history, "fromStatus", from);
        ReflectionTestUtils.setField(history, "toStatus", to);
        ReflectionTestUtils.setField(history, "changedAt", changedAt);
        ReflectionTestUtils.setField(history, "note", note);
        return history;
    }

    private static InterviewInvitation interview(
            int id,
            Application application,
            LocalDateTime scheduledAt,
            String location) {
        InterviewInvitation invitation = BeanUtils.instantiateClass(InterviewInvitation.class);
        ReflectionTestUtils.setField(invitation, "id", id);
        ReflectionTestUtils.setField(invitation, "application", application);
        ReflectionTestUtils.setField(invitation, "scheduledAt", scheduledAt);
        ReflectionTestUtils.setField(invitation, "location", location);
        ReflectionTestUtils.setField(invitation, "status", InterviewInvitation.Status.pending);
        return invitation;
    }
}
