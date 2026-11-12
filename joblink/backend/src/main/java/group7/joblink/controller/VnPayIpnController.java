package group7.joblink.controller;

import group7.joblink.service.CandidateTokenPaymentService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/payments/vnpay/ipn")
public class VnPayIpnController {

    private final CandidateTokenPaymentService paymentService;

    public VnPayIpnController(CandidateTokenPaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping
    public Map<String, String> handleGetIpn(
            @RequestParam Map<String, String> parameters) {
        return paymentService.handleIpn(parameters);
    }

    @PostMapping
    public Map<String, String> handlePostIpn(
            @RequestParam Map<String, String> parameters) {
        return paymentService.handleIpn(parameters);
    }
}
