package group7.joblink.service;

import group7.joblink.dto.response.CandidateResponses.TokenPurchaseCreated;
import group7.joblink.dto.response.CandidateResponses.TokenPurchaseStatus;
import group7.joblink.entity.Order;
import group7.joblink.entity.Payment;
import group7.joblink.entity.TokenPackage;
import group7.joblink.entity.User;
import group7.joblink.repository.OrderRepository;
import group7.joblink.repository.PaymentRepository;
import group7.joblink.repository.TokenPackageRepository;
import group7.joblink.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Service
public class CandidateTokenPaymentService {

    private static final String GATEWAY = "VNPAY";

    private final UserRepository userRepository;
    private final TokenPackageRepository tokenPackageRepository;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final VnPayClient vnPayClient;
    private final ObjectMapper objectMapper;

    public CandidateTokenPaymentService(
            UserRepository userRepository,
            TokenPackageRepository tokenPackageRepository,
            OrderRepository orderRepository,
            PaymentRepository paymentRepository,
            VnPayClient vnPayClient,
            ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.tokenPackageRepository = tokenPackageRepository;
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.vnPayClient = vnPayClient;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public TokenPurchaseCreated createPurchase(
            int userId,
            int packageId,
            String clientIp) {
        requireCandidate(userId);

        TokenPackage tokenPackage = tokenPackageRepository.findById(packageId)
                .filter(TokenPackage::isActive)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Gói Token không tồn tại hoặc đã ngừng bán."));
        if (tokenPackage.getTokens() == null || tokenPackage.getTokens() <= 0
                || tokenPackage.getPrice() == null
                || tokenPackage.getPrice().signum() <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Gói Token chưa có số lượng hoặc giá hợp lệ.");
        }

        String orderCode = UUID.randomUUID().toString().replace("-", "");
        BigDecimal price = tokenPackage.getPrice();
        String snapshot = objectMapper.writeValueAsString(Map.of(
                "type", "token",
                "packageId", tokenPackage.getId(),
                "tokens", tokenPackage.getTokens(),
                "price", price.toPlainString()));
        String paymentUrl = vnPayClient.createPaymentUrl(orderCode, price, clientIp);

        Order order = orderRepository.saveAndFlush(new Order(
                orderCode, userId, tokenPackage.getId(), price, snapshot));
        paymentRepository.save(new Payment(order, price, GATEWAY));

        return new TokenPurchaseCreated(
                orderCode, paymentUrl, price, tokenPackage.getTokens());
    }

    @Transactional(readOnly = true)
    public TokenPurchaseStatus getPurchaseStatus(int userId, String orderCode) {
        requireCandidate(userId);
        Order order = orderRepository.findByOrderCodeAndUserId(orderCode, userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy đơn thanh toán."));
        Payment payment = paymentRepository.findByOrder_Id(order.getId())
                .orElseThrow(() -> new IllegalStateException(
                        "Đơn thanh toán không có bản ghi giao dịch."));
        return new TokenPurchaseStatus(
                order.getOrderCode(),
                order.getStatus().name(),
                payment.getStatus().name(),
                order.getTotalAmount(),
                tokensInSnapshot(order),
                order.getCreatedAt());
    }

    private void requireCandidate(int userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập."));
        if (user.getRole() != User.Role.candidate) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Chỉ ứng viên mới được mua Token.");
        }
    }

    private int tokensInSnapshot(Order order) {
        int tokens = objectMapper.readTree(order.getProductSnapshot())
                .path("tokens").asInt(0);
        if (tokens <= 0) {
            throw new IllegalStateException(
                    "Ảnh chụp đơn hàng không có số lượng Token hợp lệ.");
        }
        return tokens;
    }

}
