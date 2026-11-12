package group7.joblink.service;

import group7.joblink.dto.response.CandidateResponses.TokenPurchaseCreated;
import group7.joblink.dto.response.CandidateResponses.TokenPurchaseStatus;
import group7.joblink.entity.Order;
import group7.joblink.entity.Payment;
import group7.joblink.entity.TokenPackage;
import group7.joblink.entity.TokenTransaction;
import group7.joblink.entity.TokenWallet;
import group7.joblink.entity.User;
import group7.joblink.repository.OrderRepository;
import group7.joblink.repository.PaymentRepository;
import group7.joblink.repository.TokenPackageRepository;
import group7.joblink.repository.TokenTransactionRepository;
import group7.joblink.repository.TokenWalletRepository;
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
    private final TokenWalletRepository tokenWalletRepository;
    private final TokenTransactionRepository tokenTransactionRepository;
    private final VnPayClient vnPayClient;
    private final ObjectMapper objectMapper;

    public CandidateTokenPaymentService(
            UserRepository userRepository,
            TokenPackageRepository tokenPackageRepository,
            OrderRepository orderRepository,
            PaymentRepository paymentRepository,
            TokenWalletRepository tokenWalletRepository,
            TokenTransactionRepository tokenTransactionRepository,
            VnPayClient vnPayClient,
            ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.tokenPackageRepository = tokenPackageRepository;
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.tokenWalletRepository = tokenWalletRepository;
        this.tokenTransactionRepository = tokenTransactionRepository;
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

    @Transactional
    public Map<String, String> handleIpn(Map<String, String> parameters) {
        if (!vnPayClient.hasValidSignature(parameters)
                || !vnPayClient.isConfiguredTmnCode(parameters.get("vnp_TmnCode"))) {
            return ipnResult("97", "Invalid signature");
        }

        String orderCode = parameters.get("vnp_TxnRef");
        if (orderCode == null || orderCode.isBlank()) {
            return ipnResult("01", "Order not found");
        }

        Order order = orderRepository.findByOrderCodeForUpdate(orderCode).orElse(null);
        if (order == null || order.getOrderType() != Order.OrderType.token) {
            return ipnResult("01", "Order not found");
        }

        Payment payment = paymentRepository.findByOrderIdForUpdate(order.getId()).orElse(null);
        if (payment == null || order.getStatus() != Order.Status.pending
                || payment.getStatus() != Payment.Status.pending) {
            return ipnResult("02", "Order already confirmed");
        }

        String currency = parameters.get("vnp_CurrCode");
        if (!hasMatchingAmount(parameters, order.getTotalAmount())
                || (currency != null && !currency.isBlank() && !"VND".equals(currency))) {
            return ipnResult("04", "Invalid amount");
        }

        String responseCode = parameters.get("vnp_ResponseCode");
        String transactionStatus = parameters.get("vnp_TransactionStatus");
        if ("00".equals(responseCode) && "00".equals(transactionStatus)) {
            String transactionCode = parameters.get("vnp_TransactionNo");
            if (transactionCode == null || transactionCode.isBlank()) {
                return ipnResult("99", "Missing transaction number");
            }

            TokenWallet wallet = tokenWalletRepository.findForUpdate(order.getUserId())
                    .orElseThrow(() -> new IllegalStateException(
                            "Không tìm thấy ví Token của người mua."));
            order.markPaid();
            payment.markSuccess(transactionCode);
            orderRepository.save(order);
            paymentRepository.save(payment);
            tokenTransactionRepository.save(TokenTransaction.forPurchase(
                    wallet, order.getId(), tokensInSnapshot(order)));
        } else {
            if ("24".equals(responseCode)) {
                order.markCancelled();
            } else {
                order.markFailed();
            }
            payment.markFailed();
            orderRepository.save(order);
            paymentRepository.save(payment);
        }

        return ipnResult("00", "Confirm Success");
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

    private static boolean hasMatchingAmount(
            Map<String, String> parameters,
            BigDecimal expectedAmount) {
        try {
            long receivedAmount = Long.parseLong(parameters.get("vnp_Amount"));
            return expectedAmount.movePointRight(2).longValueExact() == receivedAmount;
        } catch (NumberFormatException | ArithmeticException exception) {
            return false;
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

    private static Map<String, String> ipnResult(String code, String message) {
        return Map.of("RspCode", code, "Message", message);
    }
}
