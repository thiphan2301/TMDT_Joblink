package group7.joblink.service;

import group7.joblink.dto.response.EmployerResponses.PurchaseCreated;
import group7.joblink.dto.response.EmployerResponses.PurchaseStatus;
import group7.joblink.entity.Order;
import group7.joblink.entity.Payment;
import group7.joblink.entity.ServicePackage;
import group7.joblink.entity.TokenPackage;
import group7.joblink.entity.User;
import group7.joblink.repository.OrderRepository;
import group7.joblink.repository.PaymentRepository;
import group7.joblink.repository.ServicePackageRepository;
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
public class EmployerPaymentService {

    private static final String GATEWAY = "VNPAY";

    private final UserRepository userRepository;
    private final TokenPackageRepository tokenPackageRepository;
    private final ServicePackageRepository servicePackageRepository;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final VnPayClient vnPayClient;
    private final ObjectMapper objectMapper;

    public EmployerPaymentService(
            UserRepository userRepository,
            TokenPackageRepository tokenPackageRepository,
            ServicePackageRepository servicePackageRepository,
            OrderRepository orderRepository,
            PaymentRepository paymentRepository,
            VnPayClient vnPayClient,
            ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.tokenPackageRepository = tokenPackageRepository;
        this.servicePackageRepository = servicePackageRepository;
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.vnPayClient = vnPayClient;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public PurchaseCreated createTokenPurchase(int employerId, int packageId, String clientIp) {
        requireEmployer(employerId);
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

        String orderCode = newOrderCode();
        BigDecimal price = tokenPackage.getPrice();
        String snapshot = objectMapper.writeValueAsString(Map.of(
                "type", "token",
                "packageId", tokenPackage.getId(),
                "name", "Gói " + tokenPackage.getTokens() + " Token",
                "tokens", tokenPackage.getTokens(),
                "price", price.toPlainString()));
        String paymentUrl = vnPayClient.createEmployerPaymentUrl(orderCode, price, clientIp);

        Order order = orderRepository.saveAndFlush(new Order(
                orderCode, employerId, tokenPackage.getId(), price, snapshot));
        paymentRepository.save(new Payment(order, price, GATEWAY));
        return new PurchaseCreated(orderCode, paymentUrl, price,
                "Gói " + tokenPackage.getTokens() + " Token");
    }

    @Transactional
    public PurchaseCreated createSubscriptionPurchase(
            int employerId,
            int packageId,
            String clientIp) {
        requireEmployer(employerId);
        ServicePackage servicePackage = servicePackageRepository.findById(packageId)
                .filter(ServicePackage::isActive)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Gói dịch vụ không tồn tại hoặc đã ngừng bán."));
        if (servicePackage.getPrice() == null || servicePackage.getPrice().signum() <= 0
                || servicePackage.getDurationDays() == null
                || servicePackage.getDurationDays() <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Gói dịch vụ chưa có giá hoặc thời hạn hợp lệ.");
        }

        int includedTokens = servicePackage.getIncludedTokens() == null
                ? 0 : servicePackage.getIncludedTokens();
        String orderCode = newOrderCode();
        BigDecimal price = servicePackage.getPrice();
        String snapshot = objectMapper.writeValueAsString(Map.of(
                "type", "subscription",
                "packageId", servicePackage.getId(),
                "name", servicePackage.getName(),
                "durationDays", servicePackage.getDurationDays(),
                "includedTokens", includedTokens,
                "price", price.toPlainString()));
        String paymentUrl = vnPayClient.createEmployerPaymentUrl(orderCode, price, clientIp);

        Order order = orderRepository.saveAndFlush(Order.forSubscriptionPurchase(
                orderCode, employerId, servicePackage.getId(), price, snapshot));
        paymentRepository.save(new Payment(order, price, GATEWAY));
        return new PurchaseCreated(orderCode, paymentUrl, price, servicePackage.getName());
    }

    @Transactional(readOnly = true)
    public PurchaseStatus getPurchaseStatus(int employerId, String orderCode) {
        requireEmployer(employerId);
        Order order = orderRepository.findByOrderCodeAndUserId(orderCode, employerId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy đơn thanh toán."));
        Payment payment = paymentRepository.findByOrder_Id(order.getId())
                .orElseThrow(() -> new IllegalStateException(
                        "Đơn thanh toán không có bản ghi giao dịch."));
        String productName = objectMapper.readTree(order.getProductSnapshot())
                .path("name").asText();
        if (productName.isBlank()) {
            productName = "Giao dịch JobLink";
        }
        return new PurchaseStatus(order.getOrderCode(), order.getStatus().name(),
                payment.getStatus().name(), order.getTotalAmount(), productName,
                order.getCreatedAt());
    }

    private void requireEmployer(int employerId) {
        User user = userRepository.findById(employerId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập."));
        if (user.getRole() != User.Role.employer) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Chỉ nhà tuyển dụng mới được mua gói Token hoặc gói dịch vụ.");
        }
    }

    private static String newOrderCode() {
        return UUID.randomUUID().toString().replace("-", "");
    }
}
