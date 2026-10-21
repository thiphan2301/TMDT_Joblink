package group7.joblink.controller;

import group7.joblink.dto.response.CandidateResponses.WalletResponse;
import group7.joblink.service.CandidateWalletService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// API Ví Token của ứng viên (chỉ đọc số liệu thật từ database).
@RestController
@RequestMapping("/api/candidate")
public class CandidateWalletController {

    private final CandidateWalletService walletService;

    public CandidateWalletController(CandidateWalletService walletService) {
        this.walletService = walletService;
    }

    @GetMapping("/wallet")
    public WalletResponse wallet(HttpServletRequest request) {
        int userId = CurrentUser.requireId(request);
        return walletService.getWallet(userId);
    }
}
