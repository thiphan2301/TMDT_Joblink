package group7.joblink.dto.response;

import group7.joblink.entity.CompanyReview;

import java.time.LocalDateTime;

public record CompanyReviewResponse (
        Integer id,
        Integer companyId,
        String companyName,
        Integer rating,
        String sentiment,
        String content,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
){
    public static CompanyReviewResponse fromEntity(CompanyReview entity){
        return new CompanyReviewResponse(
                entity.getId(),
                entity.getCompany().getId(),
                entity.getCompany().getName(),
                entity.getRating(),
                entity.getSentiment(),
                entity.getContent(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
