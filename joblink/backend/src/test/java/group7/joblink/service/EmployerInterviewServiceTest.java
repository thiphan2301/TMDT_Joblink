package group7.joblink.service;

import group7.joblink.dto.request.InterviewRequests.InviteRequest;
import group7.joblink.dto.request.InterviewRequests.RejectRequest;
import group7.joblink.dto.response.InterviewResponse;
import group7.joblink.entity.Application;
import group7.joblink.entity.ApplicationStatusHistory;
import group7.joblink.entity.Company;
import group7.joblink.entity.InterviewInvitation;
import group7.joblink.entity.Job;
import group7.joblink.entity.User;
import group7.joblink.repository.ApplicationStatusHistoryRepository;
import group7.joblink.repository.CompanyRepository;
import group7.joblink.repository.EmployerApplicationRepository;
import group7.joblink.repository.InterviewInvitationRepository;
import group7.joblink.repository.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.BeanUtils;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class EmployerInterviewServiceTest {

    private static final int EMPLOYER_ID = 2;
    private static final int APPLICATION_ID = 10;
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    // "Bây giờ" trong test: 9h sáng 05/11/2026.
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 5, 9, 0);

    private EmployerApplicationRepository applicationRepository;
    private CompanyRepository companyRepository;
    private InterviewInvitationRepository interviewRepository;
    private ApplicationStatusHistoryRepository historyRepository;
    private EmployerInterviewService service;

    @BeforeEach
    void setUp() {
        applicationRepository = mock(EmployerApplicationRepository.class);
        companyRepository = mock(CompanyRepository.class);
        interviewRepository = mock(InterviewInvitationRepository.class);
        historyRepository = mock(ApplicationStatusHistoryRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        when(userRepository.getReferenceById(EMPLOYER_ID)).thenReturn(new User("hr@tiki.vn", User.Role.employer));

        Clock clock = Clock.fixed(NOW.atZone(VIETNAM).toInstant(), VIETNAM);
        service = new EmployerInterviewService(
                applicationRepository, companyRepository, interviewRepository,
                historyRepository, userRepository, clock);

        when(companyRepository.findOwnerIdByCompanyId(1)).thenReturn(Optional.of(EMPLOYER_ID));
        when(interviewRepository.saveAndFlush(any(InterviewInvitation.class))).thenAnswer(invocation -> {
            InterviewInvitation invitation = invocation.getArgument(0);
            ReflectionTestUtils.setField(invitation, "id", 7);
            return invitation;
        });
    }

    @Test
    void moiPhongVanLuuLichVaChuyenTrangThai() {
        givenApplication(Application.Status.viewed);
        LocalDateTime when = LocalDateTime.of(2026, 11, 10, 9, 30, 45);

        InterviewResponse response = service.invite(EMPLOYER_ID, APPLICATION_ID,
                new InviteRequest(when, "  Tầng 10, 52 Út Tịch  ", "Mang CMND"));

        assertThat(response.id()).isEqualTo(7);
        assertThat(response.scheduledAt()).isEqualTo(LocalDateTime.of(2026, 11, 10, 9, 30));
        assertThat(response.location()).isEqualTo("Tầng 10, 52 Út Tịch");
        assertThat(response.status()).isEqualTo("pending");

        ApplicationStatusHistory history = savedHistory();
        assertThat(history.getFromStatus()).isEqualTo(Application.Status.viewed);
        assertThat(history.getToStatus()).isEqualTo(Application.Status.invited);
        assertThat(history.getNote()).isEqualTo("Mời phỏng vấn lúc 09:30 ngày 10/11/2026");
        verify(applicationRepository).updateStatus(APPLICATION_ID, Application.Status.invited);
    }

    @Test
    void guiLaiLichKhiDaMoiThiKhongDoiTrangThai() {
        givenApplication(Application.Status.invited);

        service.invite(EMPLOYER_ID, APPLICATION_ID,
                new InviteRequest(LocalDateTime.of(2026, 11, 12, 14, 0), "Google Meet", null));

        assertThat(savedHistory().getNote()).isEqualTo("Cập nhật lịch phỏng vấn: 14:00 ngày 12/11/2026");
        verify(applicationRepository, never()).updateStatus(any(), any());
    }

    @Test
    void lichPhaiOTuongLai() {
        givenApplication(Application.Status.pending);

        assertStatus(() -> service.invite(EMPLOYER_ID, APPLICATION_ID,
                new InviteRequest(NOW.minusMinutes(1), "Văn phòng", null)), HttpStatus.BAD_REQUEST);
        verifyNoInteractions(interviewRepository, historyRepository);
    }

    @Test
    void batBuocNhapThoiGianVaDiaDiem() {
        givenApplication(Application.Status.pending);

        assertStatus(() -> service.invite(EMPLOYER_ID, APPLICATION_ID,
                new InviteRequest(null, "Văn phòng", null)), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.invite(EMPLOYER_ID, APPLICATION_ID,
                new InviteRequest(NOW.plusDays(1), "   ", null)), HttpStatus.BAD_REQUEST);
    }

    @Test
    void khongMoiUngVienDaTrungTuyen() {
        givenApplication(Application.Status.hired);

        assertStatus(() -> service.invite(EMPLOYER_ID, APPLICATION_ID,
                new InviteRequest(NOW.plusDays(1), "Văn phòng", null)), HttpStatus.CONFLICT);
    }

    @Test
    void khongThaoTacDonCuaCongTyKhac() {
        givenApplication(Application.Status.pending);
        when(companyRepository.findOwnerIdByCompanyId(1)).thenReturn(Optional.of(99));

        assertStatus(() -> service.invite(EMPLOYER_ID, APPLICATION_ID,
                new InviteRequest(NOW.plusDays(1), "Văn phòng", null)), HttpStatus.NOT_FOUND);
        assertStatus(() -> service.reject(EMPLOYER_ID, APPLICATION_ID, null), HttpStatus.NOT_FOUND);
        verifyNoInteractions(interviewRepository, historyRepository);
    }

    @Test
    void tuChoiGhiLyDoVaoLichSu() {
        givenApplication(Application.Status.invited);

        service.reject(EMPLOYER_ID, APPLICATION_ID, new RejectRequest("  Chưa đủ kinh nghiệm React  "));

        ApplicationStatusHistory history = savedHistory();
        assertThat(history.getToStatus()).isEqualTo(Application.Status.rejected);
        assertThat(history.getNote()).isEqualTo("Chưa đủ kinh nghiệm React");
        verify(applicationRepository).updateStatus(APPLICATION_ID, Application.Status.rejected);
    }

    @Test
    void tuChoiKhongCanLyDo() {
        givenApplication(Application.Status.pending);

        service.reject(EMPLOYER_ID, APPLICATION_ID, new RejectRequest("   "));

        assertThat(savedHistory().getNote()).isNull();
    }

    @Test
    void khongTuChoiLaiDonDaTuChoi() {
        givenApplication(Application.Status.rejected);

        assertStatus(() -> service.reject(EMPLOYER_ID, APPLICATION_ID, null), HttpStatus.CONFLICT);
        verify(applicationRepository, never()).updateStatus(any(), any());
    }

    private void givenApplication(Application.Status status) {
        Company company = BeanUtils.instantiateClass(Company.class);
        ReflectionTestUtils.setField(company, "id", 1);

        Job job = BeanUtils.instantiateClass(Job.class);
        ReflectionTestUtils.setField(job, "id", 50);
        ReflectionTestUtils.setField(job, "company", company);

        Application application = BeanUtils.instantiateClass(Application.class);
        ReflectionTestUtils.setField(application, "id", APPLICATION_ID);
        ReflectionTestUtils.setField(application, "job", job);
        ReflectionTestUtils.setField(application, "status", status);

        when(applicationRepository.findById(APPLICATION_ID)).thenReturn(Optional.of(application));
    }

    private ApplicationStatusHistory savedHistory() {
        ArgumentCaptor<ApplicationStatusHistory> captor =
                ArgumentCaptor.forClass(ApplicationStatusHistory.class);
        verify(historyRepository).saveAndFlush(captor.capture());
        return captor.getValue();
    }

    private static void assertStatus(Runnable action, HttpStatus status) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(ResponseStatusException.class, exception ->
                        assertThat(exception.getStatusCode()).isEqualTo(status));
    }
}
