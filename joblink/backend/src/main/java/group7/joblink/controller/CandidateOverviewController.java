package group7.joblink.controller;

import group7.joblink.dto.response.PublicResponses.CandidateOverview;
import group7.joblink.service.CandidateOverviewService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

// Số liệu trang Tổng quan của ứng viên đang đăng nhập.
@RestController
public class CandidateOverviewController {

    private final CandidateOverviewService overviewService;

    public CandidateOverviewController(
            CandidateOverviewService overviewService) {
        this.overviewService = overviewService;
    }

    @GetMapping("/api/candidate/overview")
    public CandidateOverview overview(HttpServletRequest request) {
        return overviewService.getOverview(CurrentUser.requireId(request));
    }
}
