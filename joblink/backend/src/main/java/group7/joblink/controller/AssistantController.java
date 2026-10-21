package group7.joblink.controller;

import group7.joblink.dto.request.CandidateRequests.AssistantChatRequest;
import group7.joblink.dto.response.CandidateResponses.AssistantProfile;
import group7.joblink.dto.response.CandidateResponses.AssistantReply;
import group7.joblink.service.AssistantService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// API Trợ lý tìm việc AI của ứng viên (tra cứu dữ liệu thật).
@RestController
@RequestMapping("/api/assistant")
public class AssistantController {

    private final AssistantService assistantService;

    public AssistantController(AssistantService assistantService) {
        this.assistantService = assistantService;
    }

    // Hồ sơ rút gọn + độ hoàn thiện (thanh bên trái và panel AI).
    @GetMapping("/profile")
    public AssistantProfile profile(HttpServletRequest request) {
        int userId = CurrentUser.requireId(request);
        return assistantService.getProfile(userId);
    }

    @PostMapping("/chat")
    public AssistantReply chat(@RequestBody AssistantChatRequest body,
                               HttpServletRequest request) {
        int userId = CurrentUser.requireId(request);
        return assistantService.chat(userId, body == null ? null : body.message());
    }
}
