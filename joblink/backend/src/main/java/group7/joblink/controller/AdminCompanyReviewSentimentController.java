package group7.joblink.controller;

import group7.joblink.service.CompanyReviewService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/company-reviews")
public class AdminCompanyReviewSentimentController {

    private final AdminAccess adminAccess;
    private final CompanyReviewService companyReviewService;

    public AdminCompanyReviewSentimentController(
            AdminAccess adminAccess,
            CompanyReviewService companyReviewService
    ) {
        this.adminAccess = adminAccess;
        this.companyReviewService = companyReviewService;
    }

    @PostMapping("/classify-pending")
    public BackfillResponse classifyPending(HttpServletRequest request) {
        adminAccess.requireAdminId(request);
        return new BackfillResponse(companyReviewService.classifyUnlabeledReviews());
    }

    public record BackfillResponse(int classifiedCount) {
    }
}
