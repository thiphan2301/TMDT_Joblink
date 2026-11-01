package group7.joblink.controller;

import group7.joblink.dto.request.CompanyReviewRequest;
import group7.joblink.dto.response.CompanyReviewResponse;
import group7.joblink.entity.Company;
import group7.joblink.entity.CompanyReview;
import group7.joblink.entity.User;
import group7.joblink.service.CompanyReviewService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/review/")
public class CompanyReviewController {

    private CompanyReviewService companyReviewService;
    public  CompanyReviewController(CompanyReviewService companyReviewService) {
        this.companyReviewService = companyReviewService;
    }

    @PostMapping("/{companyId}/create")
    public ResponseEntity<CompanyReviewResponse> createReview(@RequestBody @Valid CompanyReviewRequest request, @PathVariable  Integer companyId, HttpServletRequest httpServletRequest){
        // lấy user từ session
        Integer userId = CurrentUser.requireId(httpServletRequest);
        CompanyReviewResponse response = companyReviewService.createReview(request, companyId, userId);
        return ResponseEntity.ok(response);

    }
}
