package group7.joblink.service;

import group7.joblink.dto.request.CompanyReviewRequest;
import group7.joblink.dto.response.CompanyReviewResponse;
import group7.joblink.entity.Company;
import group7.joblink.entity.CompanyReview;
import group7.joblink.entity.User;
import group7.joblink.repository.CandidateProfileRepository;
import group7.joblink.repository.CompanyRepository;
import group7.joblink.repository.CompanyReviewRepository;
import group7.joblink.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.BeanUtils;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CompanyReviewServiceTest {

    private static final int CANDIDATE_ID = 8;
    private static final int COMPANY_ID = 3;

    private CompanyReviewRepository reviewRepository;
    private CompanyRepository companyRepository;
    private UserRepository userRepository;
    private CandidateProfileRepository candidateProfileRepository;
    private SentimentClient sentimentClient;
    private CompanyReviewService service;
    private Company company;
    private User candidate;

    @BeforeEach
    void setUp() {
        reviewRepository = mock(CompanyReviewRepository.class);
        companyRepository = mock(CompanyRepository.class);
        userRepository = mock(UserRepository.class);
        candidateProfileRepository = mock(CandidateProfileRepository.class);
        sentimentClient = mock(SentimentClient.class);
        service = new CompanyReviewService(
                reviewRepository,
                companyRepository,
                userRepository,
                candidateProfileRepository,
                sentimentClient
        );

        company = BeanUtils.instantiateClass(Company.class);
        ReflectionTestUtils.setField(company, "id", COMPANY_ID);
        ReflectionTestUtils.setField(company, "name", "JobLink");
        candidate = new User("candidate@example.com", User.Role.candidate);
        candidate.setId(CANDIDATE_ID);

        when(userRepository.findById(CANDIDATE_ID)).thenReturn(Optional.of(candidate));
        when(userRepository.getReferenceById(CANDIDATE_ID)).thenReturn(candidate);
        when(candidateProfileRepository.existsById(CANDIDATE_ID)).thenReturn(true);
        when(companyRepository.findById(COMPANY_ID)).thenReturn(Optional.of(company));
    }

    @Test
    void taoDanhGiaGanCongTyUngVienVaChoPhepKhongChamSao() {
        when(sentimentClient.classify("Môi trường làm việc tốt."))
                .thenReturn(new SentimentClient.Prediction("positive", 0.9));
        when(reviewRepository.saveAndFlush(any(CompanyReview.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CompanyReviewResponse response = service.createReview(
                new CompanyReviewRequest(null, "  Môi trường làm việc tốt.  "),
                COMPANY_ID,
                CANDIDATE_ID
        );

        assertThat(response.companyId()).isEqualTo(COMPANY_ID);
        assertThat(response.companyName()).isEqualTo("JobLink");
        assertThat(response.rating()).isNull();
        assertThat(response.sentiment()).isEqualTo("positive");
        assertThat(response.content()).isEqualTo("Môi trường làm việc tốt.");

        verify(reviewRepository).saveAndFlush(argThat(review ->
                review.getCompany() == company
                        && review.getUser() == candidate
                        && review.getRating() == null
                        && review.getSentiment().equals("positive")
                        && review.getContent().equals("Môi trường làm việc tốt.")
                        && review.getStatus().equals("visible")));
    }

    @Test
    void khongChoTaoDanhGiaTrung() {
        when(reviewRepository.existsByCompany_IdAndUser_Id(COMPANY_ID, CANDIDATE_ID))
                .thenReturn(true);

        assertStatus(HttpStatus.CONFLICT, () -> service.createReview(
                new CompanyReviewRequest(5, "Tốt"),
                COMPANY_ID,
                CANDIDATE_ID
        ));

        verify(reviewRepository, never()).saveAndFlush(any());
    }

    @Test
    void chiUngVienMoiDuocDanhGia() {
        candidate.setRole(User.Role.employer);

        assertStatus(HttpStatus.FORBIDDEN, () -> service.createReview(
                new CompanyReviewRequest(5, "Tốt"),
                COMPANY_ID,
                CANDIDATE_ID
        ));

        verifyNoInteractions(companyRepository, reviewRepository, candidateProfileRepository);
    }

    @Test
    void taiKhoanBiKhoaKhongDuocDanhGia() {
        candidate.setStatus(User.Status.locked);

        assertStatus(HttpStatus.FORBIDDEN, () -> service.createReview(
                new CompanyReviewRequest(5, "Tốt"),
                COMPANY_ID,
                CANDIDATE_ID
        ));

        verifyNoInteractions(companyRepository, reviewRepository, candidateProfileRepository);
    }

    @Test
    void chiCapNhatVaXoaDanhGiaCuaChinhUngVien() {
        CompanyReview existing = new CompanyReview();
        existing.setCompany(company);
        existing.setUser(candidate);
        existing.setRating(2);
        existing.setContent("Nội dung cũ");
        existing.setStatus("visible");
        when(reviewRepository.findByCompany_IdAndUser_Id(COMPANY_ID, CANDIDATE_ID))
                .thenReturn(Optional.of(existing));
        when(reviewRepository.save(any(CompanyReview.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(sentimentClient.classify("Nội dung mới"))
                .thenReturn(new SentimentClient.Prediction("neutral", 0.75));

        CompanyReviewResponse response = service.updateReview(
                new CompanyReviewRequest(4, "  Nội dung mới  "),
                COMPANY_ID,
                CANDIDATE_ID
        );

        assertThat(response.rating()).isEqualTo(4);
        assertThat(response.sentiment()).isEqualTo("neutral");
        assertThat(response.content()).isEqualTo("Nội dung mới");

        service.deleteReview(COMPANY_ID, CANDIDATE_ID);
        verify(reviewRepository).delete(existing);
    }

    private static void assertStatus(HttpStatus status, Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(ResponseStatusException.class, exception ->
                        assertThat(exception.getStatusCode()).isEqualTo(status));
    }
}
