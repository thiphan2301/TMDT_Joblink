package group7.joblink.controller;

import group7.joblink.dto.request.CompanyReviewRequest;
import group7.joblink.dto.response.CompanyReviewResponse;
import group7.joblink.service.CompanyReviewService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/review")
public class CompanyReviewController {

    private final CompanyReviewService companyReviewService;

    public CompanyReviewController(CompanyReviewService companyReviewService) {
        this.companyReviewService = companyReviewService;
    }

    @PostMapping("/{companyId}/create")
    public ResponseEntity<CompanyReviewResponse> createReview(
            @RequestBody @Valid CompanyReviewRequest request,
            @PathVariable Integer companyId,
            HttpServletRequest httpServletRequest
    ) {
        Integer userId = CurrentUser.requireId(httpServletRequest);
        return ResponseEntity.ok(companyReviewService.createReview(request, companyId, userId));
    }

    @GetMapping("/{companyId}/mine")
    public ResponseEntity<CompanyReviewResponse> getMyReview(
            @PathVariable Integer companyId,
            HttpServletRequest httpServletRequest
    ) {
        Integer userId = CurrentUser.requireId(httpServletRequest);
        return ResponseEntity.ok(companyReviewService.getMyReview(companyId, userId));
    }

    @PutMapping("/{companyId}")
    public ResponseEntity<CompanyReviewResponse> updateReview(
            @PathVariable Integer companyId,
            @RequestBody @Valid CompanyReviewRequest request,
            HttpServletRequest httpServletRequest
    ) {
        Integer userId = CurrentUser.requireId(httpServletRequest);
        return ResponseEntity.ok(companyReviewService.updateReview(request, companyId, userId));
    }

    @DeleteMapping("/{companyId}")
    public ResponseEntity<Void> deleteReview(
            @PathVariable Integer companyId,
            HttpServletRequest httpServletRequest
    ) {
        Integer userId = CurrentUser.requireId(httpServletRequest);
        companyReviewService.deleteReview(companyId, userId);
        return ResponseEntity.noContent().build();
    }
}
