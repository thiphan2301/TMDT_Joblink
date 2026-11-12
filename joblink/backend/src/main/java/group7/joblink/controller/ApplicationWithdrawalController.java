package group7.joblink.controller;
import group7.joblink.service.ApplicationWithdrawalService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/applications")
public class ApplicationWithdrawalController {
    private final ApplicationWithdrawalService service;
    public ApplicationWithdrawalController(ApplicationWithdrawalService service) { this.service = service; }
    public record WithdrawRequest(String reason) {}
    @PatchMapping("/{id}/withdraw")
    public ApplicationWithdrawalService.Result withdraw(@PathVariable("id") int id,
            @RequestBody WithdrawRequest body, HttpServletRequest request) {
        return service.withdraw(CurrentUser.requireId(request), id, body == null ? null : body.reason());
    }
    @GetMapping("/withdrawal-notifications")
    public List<Map<String, Object>> notifications(HttpServletRequest request) {
        return service.notifications(CurrentUser.requireId(request));
    }
}
