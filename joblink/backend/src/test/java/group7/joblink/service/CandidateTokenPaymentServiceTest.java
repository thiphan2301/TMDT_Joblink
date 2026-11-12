package group7.joblink.service;

import group7.joblink.entity.Order;
import group7.joblink.entity.Payment;
import group7.joblink.entity.TokenTransaction;
import group7.joblink.entity.TokenWallet;
import group7.joblink.repository.OrderRepository;
import group7.joblink.repository.PaymentRepository;
import group7.joblink.repository.TokenPackageRepository;
import group7.joblink.repository.TokenTransactionRepository;
import group7.joblink.repository.TokenWalletRepository;
import group7.joblink.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.json.JsonMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CandidateTokenPaymentServiceTest {

    private static final String SECRET = "test-secret";
    private static final String ORDER_CODE = "token-order-123";
    private static final int USER_ID = 7;

    private OrderRepository orderRepository;
    private PaymentRepository paymentRepository;
    private TokenWalletRepository tokenWalletRepository;
    private TokenTransactionRepository tokenTransactionRepository;
    private CandidateTokenPaymentService service;
    private Order order;
    private Payment payment;
    private TokenWallet wallet;

    @BeforeEach
    void setUp() {
        UserRepository userRepository = mock(UserRepository.class);
        TokenPackageRepository tokenPackageRepository = mock(TokenPackageRepository.class);
        orderRepository = mock(OrderRepository.class);
        paymentRepository = mock(PaymentRepository.class);
        tokenWalletRepository = mock(TokenWalletRepository.class);
        tokenTransactionRepository = mock(TokenTransactionRepository.class);
        VnPayClient vnPayClient = new VnPayClient(
                "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
                "TESTCODE", SECRET, "http://localhost:5173/vi-token");
        service = new CandidateTokenPaymentService(
                userRepository,
                tokenPackageRepository,
                orderRepository,
                paymentRepository,
                tokenWalletRepository,
                tokenTransactionRepository,
                vnPayClient,
                JsonMapper.builder().build());

        order = new Order(ORDER_CODE, USER_ID, 3, new BigDecimal("25000.00"),
                "{\"type\":\"token\",\"packageId\":3,\"tokens\":50,\"price\":\"25000.00\"}");
        ReflectionTestUtils.setField(order, "id", 41);
        payment = new Payment(order, new BigDecimal("25000.00"), "VNPAY");
        wallet = new TokenWallet();
        ReflectionTestUtils.setField(wallet, "userId", USER_ID);
        when(orderRepository.findByOrderCodeForUpdate(ORDER_CODE))
                .thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderIdForUpdate(41))
                .thenReturn(Optional.of(payment));
        when(tokenWalletRepository.findForUpdate(USER_ID))
                .thenReturn(Optional.of(wallet));
    }

    @Test
    void ipnHopLeCongTokenMotLanVaIpnLapLaiKhongCongThem() {
        Map<String, String> ipn = signedIpn("00", "00", false);

        assertThat(service.handleIpn(ipn))
                .containsEntry("RspCode", "00");
        assertThat(order.getStatus()).isEqualTo(Order.Status.paid);
        assertThat(payment.getStatus()).isEqualTo(Payment.Status.success);

        var transactionCaptor = org.mockito.ArgumentCaptor.forClass(TokenTransaction.class);
        verify(tokenTransactionRepository).save(transactionCaptor.capture());
        assertThat(transactionCaptor.getValue().getAmount()).isEqualTo(50);
        assertThat(transactionCaptor.getValue().getOrderId()).isEqualTo(41);

        assertThat(service.handleIpn(ipn))
                .containsEntry("RspCode", "02");
        verify(tokenTransactionRepository, times(1)).save(any(TokenTransaction.class));
    }

    @Test
    void ipnThatBaiKhongCongToken() {
        Map<String, String> ipn = signedIpn("24", "02", false);

        assertThat(service.handleIpn(ipn))
                .containsEntry("RspCode", "00");
        assertThat(order.getStatus()).isEqualTo(Order.Status.cancelled);
        assertThat(payment.getStatus()).isEqualTo(Payment.Status.failed);
        verifyNoInteractions(tokenTransactionRepository, tokenWalletRepository);
    }

    @Test
    void ipnCoCurrencyKhongPhaiVndBiTuChoi() {
        Map<String, String> ipn = signedIpn("00", "00", true);
        ipn.put("vnp_CurrCode", "USD");
        ipn.put("vnp_SecureHash", signatureFor(ipn));

        assertThat(service.handleIpn(ipn))
                .containsEntry("RspCode", "04");
        verifyNoInteractions(tokenTransactionRepository, tokenWalletRepository);
    }

    private static Map<String, String> signedIpn(
            String responseCode,
            String transactionStatus,
            boolean includeCurrency) {
        Map<String, String> parameters = new TreeMap<>();
        parameters.put("vnp_TmnCode", "TESTCODE");
        parameters.put("vnp_TxnRef", ORDER_CODE);
        parameters.put("vnp_Amount", "2500000");
        if (includeCurrency) {
            parameters.put("vnp_CurrCode", "VND");
        }
        parameters.put("vnp_ResponseCode", responseCode);
        parameters.put("vnp_TransactionStatus", transactionStatus);
        parameters.put("vnp_TransactionNo", "987654321");
        parameters.put("vnp_SecureHash", signatureFor(parameters));
        return parameters;
    }

    private static String signatureFor(Map<String, String> parameters) {
        String data = parameters.entrySet().stream()
                .filter(entry -> !entry.getKey().equals("vnp_SecureHash"))
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
                .collect(Collectors.joining("&"));
        return hmac(data);
    }

    private static String hmac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            StringBuilder result = new StringBuilder();
            for (byte value : mac.doFinal(data.getBytes(StandardCharsets.UTF_8))) {
                result.append(String.format("%02x", value & 0xff));
            }
            return result.toString();
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
