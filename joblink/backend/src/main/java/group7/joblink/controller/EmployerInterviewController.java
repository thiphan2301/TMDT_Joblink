package group7.joblink.controller;

import group7.joblink.dto.request.InterviewRequests.InviteRequest;
import group7.joblink.dto.request.InterviewRequests.RejectRequest;
import group7.joblink.dto.response.InterviewResponse;
import group7.joblink.service.EmployerInterviewService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// Nhà tuyển dụng mời phỏng vấn / từ chối một đơn ứng tuyển.
@RestController
@RequestMapping("/api/employer/applications/{id}")
public class EmployerInterviewController {

    private final EmployerInterviewService interviewService;
    private final EmployerAccess employerAccess;

    public EmployerInterviewController(EmployerInterviewService interviewService,
                                       EmployerAccess employerAccess) {
        this.interviewService = interviewService;
        this.employerAccess = employerAccess;
    }

    // Lời mời mới nhất kèm phản hồi của ứng viên; 204 nếu chưa mời.
    @GetMapping("/interview")
    public ResponseEntity<InterviewResponse> interview(@PathVariable int id,
                                                       HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        InterviewResponse interview = interviewService.getInterview(employerId, id);
        return interview == null
                ? ResponseEntity.noContent().build()
                : ResponseEntity.ok(interview);
    }

    @PostMapping("/interview")
    public InterviewResponse invite(@PathVariable int id,
                                    @RequestBody InviteRequest body,
                                    HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return interviewService.invite(employerId, id, body);
    }

    @PostMapping("/reject")
    public ResponseEntity<Void> reject(@PathVariable int id,
                                       @RequestBody(required = false) RejectRequest body,
                                       HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        interviewService.reject(employerId, id, body);
        return ResponseEntity.noContent().build();
    }
}
