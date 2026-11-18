package group7.joblink.service;

import group7.joblink.entity.Order;
import group7.joblink.entity.Payment;
import group7.joblink.entity.Subscription;
import group7.joblink.entity.TokenTransaction;
import group7.joblink.entity.TokenWallet;
import group7.joblink.entity.User;
import group7.joblink.repository.AdminSubscriptionRepository;
import group7.joblink.repository.OrderRepository;
import group7.joblink.repository.PaymentRepository;
import group7.joblink.repository.TokenTransactionRepository;
import group7.joblink.repository.TokenWalletRepository;
import group7.joblink.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;

@Service
public class VnPayIpnService {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final TokenWalletRepository tokenWalletRepository;
    private final TokenTransactionRepository tokenTransactionRepository;
    private final AdminSubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final EmployerService employerService;
    private final VnPayClient vnPayClient;
    private final ObjectMapper objectMapper;

    public VnPayIpnService(
            OrderRepository orderRepository,
            PaymentRepository paymentRepository,
            TokenWalletRepository tokenWalletRepository,
            TokenTransactionRepository tokenTransactionRepository,
            AdminSubscriptionRepository subscriptionRepository,
            UserRepository userRepository,
            EmployerService employerService,
            VnPayClient vnPayClient,
            ObjectMapper objectMapper) {
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.tokenWalletRepository = tokenWalletRepository;
        this.tokenTransactionRepository = tokenTransactionRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
        this.employerService = employerService;
        this.vnPayClient = vnPayClient;
        this.objectMapper = objectMapper;
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
        if (order == null || !hasSupportedBuyerRole(order)) {
            return ipnResult("01", "Order not found");
        }

        Payment payment = paymentRepository.findByOrderIdForUpdate(order.getId()).orElse(null);
        if (payment == null || order.getStatus() != Order.Status.pending
                || payment.getStatus() != Payment.Status.pending) {
            return ipnResult("02", "Order already confirmed");
        }

        String currency = parameters.get("vnp_CurrCode");
        if (!hasMatchingAmount(parameters, order.getTotalAmount())
                || !hasMatchingAmount(parameters, payment.getAmount())
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
            fulfill(order, payment, transactionCode);
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

    private void fulfill(Order order, Payment payment, String transactionCode) {
        User user = userRepository.findById(order.getUserId()).orElse(null);
        if (user == null) {
            throw new IllegalStateException("Không tìm thấy người mua của đơn hàng.");
        }

        if (order.getOrderType() == Order.OrderType.token) {
            if (user.getRole() != User.Role.candidate && user.getRole() != User.Role.employer) {
                throw new IllegalStateException("Vai trò người mua không hợp lệ.");
            }
            int tokens = positiveSnapshotInt(order, "tokens");
            TokenWallet wallet = tokenWalletRepository.findForUpdate(order.getUserId())
                    .orElseThrow(() -> new IllegalStateException(
                            "Không tìm thấy ví Token của người mua."));
            order.markPaid();
            payment.markSuccess(transactionCode);
            orderRepository.save(order);
            paymentRepository.save(payment);
            tokenTransactionRepository.save(TokenTransaction.forPurchase(
                    wallet, order.getId(), tokens));
            return;
        }

        if (order.getOrderType() != Order.OrderType.subscription
                || user.getRole() != User.Role.employer) {
            throw new IllegalStateException("Đơn đăng ký gói không thuộc nhà tuyển dụng.");
        }

        int durationDays = positiveSnapshotInt(order, "durationDays");
        int includedTokens = nonNegativeSnapshotInt(order, "includedTokens");
        LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);
        LocalDateTime startAt = subscriptionRepository
                .findByEmployerIdAndStatus(order.getUserId(), Subscription.Status.active)
                .stream()
                .filter(subscription -> subscription.getPackageId().equals(order.getPackageId()))
                .map(Subscription::getEndAt)
                .filter(endAt -> endAt != null && endAt.isAfter(now))
                .max(LocalDateTime::compareTo)
                .map(endAt -> endAt.isAfter(now) ? endAt : now)
                .orElse(now);

        TokenWallet wallet = null;
        if (includedTokens > 0) {
            wallet = tokenWalletRepository.findForUpdate(order.getUserId())
                    .orElseThrow(() -> new IllegalStateException(
                            "Không tìm thấy ví Token của nhà tuyển dụng."));
        }

        order.markPaid();
        payment.markSuccess(transactionCode);
        orderRepository.save(order);
        paymentRepository.save(payment);
        subscriptionRepository.save(new Subscription(
                order.getUserId(), order.getPackageId(), order.getId(),
                startAt, startAt.plusDays(durationDays)));
        employerService.refreshJobFeatures(order.getUserId());
        if (includedTokens > 0) {
            tokenTransactionRepository.save(TokenTransaction.forPurchase(
                    wallet, order.getId(), includedTokens));
        }
    }

    private boolean hasSupportedBuyerRole(Order order) {
        User user = userRepository.findById(order.getUserId()).orElse(null);
        if (user == null) {
            return false;
        }
        return order.getOrderType() == Order.OrderType.token
                ? user.getRole() == User.Role.candidate || user.getRole() == User.Role.employer
                : order.getOrderType() == Order.OrderType.subscription
                    && user.getRole() == User.Role.employer;
    }

    private int positiveSnapshotInt(Order order, String key) {
        int value = objectMapper.readTree(order.getProductSnapshot()).path(key).asInt(0);
        if (value <= 0) {
            throw new IllegalStateException(
                    "Ảnh chụp đơn hàng không có giá trị " + key + " hợp lệ.");
        }
        return value;
    }

    private int nonNegativeSnapshotInt(Order order, String key) {
        int value = objectMapper.readTree(order.getProductSnapshot()).path(key).asInt(-1);
        if (value < 0) {
            throw new IllegalStateException(
                    "Ảnh chụp đơn hàng không có giá trị " + key + " hợp lệ.");
        }
        return value;
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

    private static Map<String, String> ipnResult(String code, String message) {
        return Map.of("RspCode", code, "Message", message);
    }
}
