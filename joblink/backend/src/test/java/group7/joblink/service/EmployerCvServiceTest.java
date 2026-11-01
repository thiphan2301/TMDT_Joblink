package group7.joblink.service;

import group7.joblink.entity.Application;
import group7.joblink.entity.CandidateProfile;
import group7.joblink.entity.Company;
import group7.joblink.entity.Cv;
import group7.joblink.entity.Job;
import group7.joblink.repository.CompanyRepository;
import group7.joblink.repository.CvRepository;
import group7.joblink.repository.EmployerApplicationRepository;
import group7.joblink.repository.EmployerCandidateRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.BeanUtils;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class EmployerCvServiceTest {

    private static final int EMPLOYER_ID = 2;
    private static final int CANDIDATE_ID = 4;
    private static final String STORED = "0b6f3c1e-2d4a-4f7b-9c8d-1a2b3c4d5e6f.pdf";

    private EmployerApplicationRepository applicationRepository;
    private EmployerCandidateRepository candidateRepository;
    private CompanyRepository companyRepository;
    private CvRepository cvRepository;
    private CvStorageService storageService;
    private EmployerCvService service;

    private final Resource file = new ByteArrayResource("%PDF-1.4".getBytes());

    @BeforeEach
    void setUp() {
        applicationRepository = mock(EmployerApplicationRepository.class);
        candidateRepository = mock(EmployerCandidateRepository.class);
        companyRepository = mock(CompanyRepository.class);
        cvRepository = mock(CvRepository.class);
        storageService = mock(CvStorageService.class);
        service = new EmployerCvService(
                applicationRepository, candidateRepository, companyRepository, cvRepository, storageService);

        when(storageService.load(STORED)).thenReturn(file);
    }

    @Test
    void moCvDinhKemDonCuaTinMinh() {
        when(applicationRepository.findById(10)).thenReturn(Optional.of(application(10, 1, cv(3))));
        when(companyRepository.findOwnerIdByCompanyId(1)).thenReturn(Optional.of(EMPLOYER_ID));

        CvService.Download download = service.applicationCv(EMPLOYER_ID, 10);

        assertThat(download.resource()).isSameAs(file);
        assertThat(download.fileName()).isEqualTo("CV_Backend.pdf");
    }

    @Test
    void khongMoDuocCvDonCuaCongTyKhac() {
        when(applicationRepository.findById(10)).thenReturn(Optional.of(application(10, 1, cv(3))));
        when(companyRepository.findOwnerIdByCompanyId(1)).thenReturn(Optional.of(99));

        assertStatus(() -> service.applicationCv(EMPLOYER_ID, 10), HttpStatus.NOT_FOUND);
        verifyNoInteractions(storageService);
    }

    @Test
    void donKhongDinhKemCv() {
        when(applicationRepository.findById(10)).thenReturn(Optional.of(application(10, 1, null)));
        when(companyRepository.findOwnerIdByCompanyId(1)).thenReturn(Optional.of(EMPLOYER_ID));

        assertStatus(() -> service.applicationCv(EMPLOYER_ID, 10), HttpStatus.NOT_FOUND);
    }

    @Test
    void ungVienDaUngTuyenThiXemDuocCvTrongHoSo() {
        when(applicationRepository.countApplicationsFromCandidate(CANDIDATE_ID, EMPLOYER_ID)).thenReturn(1L);
        when(cvRepository.findByIdAndCandidate_UserId(3, CANDIDATE_ID)).thenReturn(Optional.of(cv(3)));

        assertThat(service.candidateCv(EMPLOYER_ID, CANDIDATE_ID, 3).resource()).isSameAs(file);
        verify(candidateRepository, never()).countViewsByEmployer(any(), any());
    }

    @Test
    void daMoHoSoQuaTimKiemThiXemDuocCv() {
        when(applicationRepository.countApplicationsFromCandidate(CANDIDATE_ID, EMPLOYER_ID)).thenReturn(0L);
        when(candidateRepository.countViewsByEmployer(EMPLOYER_ID, CANDIDATE_ID)).thenReturn(1L);
        when(cvRepository.findByIdAndCandidate_UserId(3, CANDIDATE_ID)).thenReturn(Optional.of(cv(3)));

        assertThat(service.candidateCv(EMPLOYER_ID, CANDIDATE_ID, 3).resource()).isSameAs(file);
    }

    @Test
    void chuaMoHoSoThiKhongXemDuocCv() {
        when(applicationRepository.countApplicationsFromCandidate(CANDIDATE_ID, EMPLOYER_ID)).thenReturn(0L);
        when(candidateRepository.countViewsByEmployer(EMPLOYER_ID, CANDIDATE_ID)).thenReturn(0L);

        assertStatus(() -> service.candidateCv(EMPLOYER_ID, CANDIDATE_ID, 3), HttpStatus.FORBIDDEN);
        verifyNoInteractions(cvRepository, storageService);
    }

    @Test
    void cvKhongThuocUngVienNay() {
        when(applicationRepository.countApplicationsFromCandidate(CANDIDATE_ID, EMPLOYER_ID)).thenReturn(1L);
        when(cvRepository.findByIdAndCandidate_UserId(77, CANDIDATE_ID)).thenReturn(Optional.empty());

        assertStatus(() -> service.candidateCv(EMPLOYER_ID, CANDIDATE_ID, 77), HttpStatus.NOT_FOUND);
    }

    private static void assertStatus(Runnable action, HttpStatus status) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(ResponseStatusException.class, exception ->
                        assertThat(exception.getStatusCode()).isEqualTo(status));
    }

    private static Cv cv(int id) {
        Cv cv = new Cv(new CandidateProfile(CANDIDATE_ID, "Nguyễn Văn C", null), STORED, "CV_Backend.pdf", true);
        ReflectionTestUtils.setField(cv, "id", id);
        return cv;
    }

    private static Application application(int id, int companyId, Cv cv) {
        Company company = BeanUtils.instantiateClass(Company.class);
        ReflectionTestUtils.setField(company, "id", companyId);

        Job job = BeanUtils.instantiateClass(Job.class);
        ReflectionTestUtils.setField(job, "id", 50);
        ReflectionTestUtils.setField(job, "company", company);

        Application application = BeanUtils.instantiateClass(Application.class);
        ReflectionTestUtils.setField(application, "id", id);
        ReflectionTestUtils.setField(application, "job", job);
        ReflectionTestUtils.setField(application, "cv", cv);
        return application;
    }
}
