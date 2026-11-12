package group7.joblink.controller;

import group7.joblink.dto.request.CandidateTokenPurchaseRequest;
import group7.joblink.dto.response.CandidateResponses.TokenPurchaseCreated;
import group7.joblink.dto.response.CandidateResponses.TokenPurchaseStatus;
import group7.joblink.service.CandidateTokenPaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/candidate/wallet/purchases")
public class CandidateTokenPaymentController {

    private final CandidateTokenPaymentService paymentService;

    public CandidateTokenPaymentController(CandidateTokenPaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping
    public TokenPurchaseCreated createPurchase(
            @Valid @RequestBody CandidateTokenPurchaseRequest purchase,
            HttpServletRequest request) {
        return paymentService.createPurchase(
                CurrentUser.requireId(request),
                purchase.packageId(),
                clientIp(request));
    }

    @GetMapping("/{orderCode}")
    public TokenPurchaseStatus getPurchaseStatus(
            @PathVariable String orderCode,
            HttpServletRequest request) {
        return paymentService.getPurchaseStatus(
                CurrentUser.requireId(request), orderCode);
    }

    private static String clientIp(HttpServletRequest request) {
        String remoteAddress = request.getRemoteAddr();
        return remoteAddress == null
                || remoteAddress.equals("0:0:0:0:0:0:0:1")
                || remoteAddress.equals("::1")
                ? "127.0.0.1"
                : remoteAddress;
    }
}
