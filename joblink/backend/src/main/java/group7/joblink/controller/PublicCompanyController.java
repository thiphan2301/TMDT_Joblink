package group7.joblink.controller;

import group7.joblink.dto.response.PublicResponses.CompanyPageResponse;
import group7.joblink.service.PublicCompanyService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

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
}
