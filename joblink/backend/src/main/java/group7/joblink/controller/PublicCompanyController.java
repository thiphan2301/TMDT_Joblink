package group7.joblink.controller;

import group7.joblink.dto.response.PublicResponses.CompanyPageResponse;
import group7.joblink.dto.response.PublicResponses.CompanyReviewPage;
import group7.joblink.service.PublicCompanyService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

// Trang công ty công khai (xem được không cần đăng nhập).
@RestController
public class PublicCompanyController {

    private final PublicCompanyService companyService;

    public PublicCompanyController(PublicCompanyService companyService) {
        this.companyService = companyService;
    }

    @GetMapping("/api/companies/{id}")
    public CompanyPageResponse companyPage(@PathVariable int id) {
        return companyService.getCompanyPage(id);
    }

    @GetMapping("/api/companies/{id}/reviews")
    public CompanyReviewPage companyReviews(
            @PathVariable int id,
            @RequestParam(defaultValue = "all") String sentiment,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        if (page < 0 || size < 1 || size > 50) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Trang phải lớn hơn hoặc bằng 0, kích thước từ 1 đến 50."
            );
        }
        return companyService.getCompanyReviews(id, sentiment, page, size);
    }
}
