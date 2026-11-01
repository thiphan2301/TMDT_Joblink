package group7.joblink.service;

import group7.joblink.dto.request.CompanyReviewRequest;
import group7.joblink.dto.response.CompanyReviewResponse;
import group7.joblink.entity.Company;
import group7.joblink.entity.CompanyReview;
import group7.joblink.entity.User;
import group7.joblink.repository.CompanyRepository;
import group7.joblink.repository.CompanyReviewRepository;
import group7.joblink.repository.UserRepository;
import org.springframework.stereotype.Service;

import javax.swing.*;

@Service
public class CompanyReviewService {

    private final CompanyReviewRepository companyReviewRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    public CompanyReviewService(CompanyReviewRepository companyReviewRepository, CompanyRepository companyRepository, UserRepository userRepository) {
        this.companyReviewRepository = companyReviewRepository;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
    }

    public CompanyReviewResponse createReview(CompanyReviewRequest request, Integer companyId, Integer userId){

        // kiểm tra công ty và người dùng
        Company company = companyRepository.findById(companyId).orElseThrow(
                () -> new IllegalArgumentException("Không tìm thấy công ty")
        );
        User user = userRepository.findById(userId).orElseThrow(
                () -> new IllegalArgumentException("Không tìm thấy người dùng")
        );
        //kiểm tra người dùng đã từng đánh giá hay chưa
        if(companyReviewRepository.existsByCompany_IdAndUser_Id(companyId, userId)){
            throw new IllegalArgumentException("Bạn đã đánh giá công ty này rồi");
        }

        // khởi tạo entity và lấy request gán vào entity
        CompanyReview companyReview = new CompanyReview();
        companyReview.setRating(request.rating());
        companyReview.setContent(request.content());
        // save
        CompanyReview savedEntity = companyReviewRepository.save(companyReview);

        // chuyển entity sang response để trả về
        CompanyReviewResponse response = CompanyReviewResponse.fromEntity(savedEntity);

        return response;
    }
}
