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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class CompanyReviewService {

    private final CompanyReviewRepository companyReviewRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final SentimentClient sentimentClient;

    public CompanyReviewService(
            CompanyReviewRepository companyReviewRepository,
            CompanyRepository companyRepository,
            UserRepository userRepository,
            CandidateProfileRepository candidateProfileRepository,
            SentimentClient sentimentClient
    ) {
        this.companyReviewRepository = companyReviewRepository;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.sentimentClient = sentimentClient;
    }

    @Transactional
    public CompanyReviewResponse createReview(
            CompanyReviewRequest request,
            Integer companyId,
            Integer userId
    ) {
        requireCandidate(userId);
        Company company = findCompany(companyId);

        if (companyReviewRepository.existsByCompany_IdAndUser_Id(companyId, userId)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Bạn đã đánh giá công ty này. Hãy chỉnh sửa đánh giá hiện có."
            );
        }

        CompanyReview review = new CompanyReview();
        review.setCompany(company);
        review.setUser(userRepository.getReferenceById(userId));
        review.setStatus("visible");
        applyRequest(review, request);

        try {
            return CompanyReviewResponse.fromEntity(companyReviewRepository.saveAndFlush(review));
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Bạn đã đánh giá công ty này. Hãy chỉnh sửa đánh giá hiện có.",
                    exception
            );
        }
    }

    @Transactional(readOnly = true)
    public CompanyReviewResponse getMyReview(Integer companyId, Integer userId) {
        requireCandidate(userId);
        findCompany(companyId);
        return companyReviewRepository.findByCompany_IdAndUser_Id(companyId, userId)
                .map(CompanyReviewResponse::fromEntity)
                .orElse(null);
    }

    @Transactional
    public CompanyReviewResponse updateReview(
            CompanyReviewRequest request,
            Integer companyId,
            Integer userId
    ) {
        requireCandidate(userId);
        CompanyReview review = findMyReview(companyId, userId);
        applyRequest(review, request);
        return CompanyReviewResponse.fromEntity(companyReviewRepository.save(review));
    }

    @Transactional
    public void deleteReview(Integer companyId, Integer userId) {
        requireCandidate(userId);
        companyReviewRepository.delete(findMyReview(companyId, userId));
    }

    private void requireCandidate(Integer userId) {
        User user = userRepository.findById(userId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bạn chưa đăng nhập.")
        );
        if (user.getRole() != User.Role.candidate) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chỉ ứng viên mới có thể gửi đánh giá công ty."
            );
        }
        if (user.getStatus() != User.Status.active) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản của bạn hiện không hoạt động."
            );
        }
        if (!candidateProfileRepository.existsById(userId)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Hồ sơ ứng viên chưa được thiết lập."
            );
        }
    }

    private Company findCompany(Integer companyId) {
        return companyRepository.findById(companyId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy công ty.")
        );
    }

    private CompanyReview findMyReview(Integer companyId, Integer userId) {
        return companyReviewRepository.findByCompany_IdAndUser_Id(companyId, userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy đánh giá của bạn cho công ty này."
                ));
    }

    private void applyRequest(CompanyReview review, CompanyReviewRequest request) {
        String content = request.content().trim();
        SentimentClient.Prediction prediction = sentimentClient.classify(content);
        review.setRating(request.rating());
        review.setContent(content);
        review.setSentiment(prediction.label());
    }

    public int classifyUnlabeledReviews() {
        int classified = 0;
        while (true) {
            var reviews = companyReviewRepository
                    .findUnlabeledWithContent(PageRequest.of(0, 100))
                    .getContent();
            if (reviews.isEmpty()) {
                return classified;
            }

            List<SentimentClient.Prediction> predictions = sentimentClient.classifyBatch(
                    reviews.stream().map(CompanyReview::getContent).toList()
            );
            for (int index = 0; index < reviews.size(); index++) {
                reviews.get(index).setSentiment(predictions.get(index).label());
            }
            companyReviewRepository.saveAll(reviews);
            classified += reviews.size();
        }
    }
}
