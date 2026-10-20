package group7.joblink.controller;

import group7.joblink.dto.response.MyApplicationResponse;
import group7.joblink.service.CandidateApplicationService;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// Việc đã ứng tuyển của ứng viên đang đăng nhập.
// Lỗi (401, 403) trả về dạng {"message": "..."} qua ApiExceptionHandler.
@RestController
@RequestMapping("/api/applications")
public class CandidateApplicationController {

    private final CandidateApplicationService candidateApplicationService;

    public CandidateApplicationController(
            CandidateApplicationService candidateApplicationService) {
        this.candidateApplicationService = candidateApplicationService;
    }

    @GetMapping("/me")
    public List<MyApplicationResponse> getMyApplications(
            HttpServletRequest request) {

        return candidateApplicationService.getMyApplications(
                CurrentUser.requireId(request));
    }
}
