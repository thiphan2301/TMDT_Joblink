package group7.joblink.dto.response;

import group7.joblink.entity.Company;
import group7.joblink.entity.CompanyReview;
import group7.joblink.entity.User;

import java.time.LocalDateTime;

public record CompanyReviewResponse (
        long id,
        Company company,
        User candidate,
        int rating,
        String content,
        String status,
        LocalDateTime createAt,
        LocalDateTime updateAt
){
    public static CompanyReviewResponse fromEntity(CompanyReview entity){
        //vì là record nên chỉ cần new để tạo mới instance và truyền các thuộc tính của Entity vào
        return new CompanyReviewResponse(
                entity.getId(),
                entity.getCompany(),
                entity.getUser(),
                entity.getRating(),
                entity.getContent(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

}
