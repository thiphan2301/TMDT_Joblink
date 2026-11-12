package group7.joblink.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Component
public class VnPayClient {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter VNPAY_DATE =
            DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final String paymentUrl;
    private final String tmnCode;
    private final String hashSecret;
    private final String returnUrl;

    public VnPayClient(
            @Value("${app.vnpay.payment-url:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}") String paymentUrl,
            @Value("${app.vnpay.tmn-code:}") String tmnCode,
            @Value("${app.vnpay.hash-secret:}") String hashSecret,
            @Value("${app.vnpay.return-url:http://localhost:5173/vi-token}") String returnUrl) {
        this.paymentUrl = paymentUrl;
        this.tmnCode = tmnCode;
        this.hashSecret = hashSecret;
        this.returnUrl = returnUrl;
    }

    public String createPaymentUrl(
            String orderCode,
            BigDecimal amount,
            String clientIp) {
        requireConfigured();

        LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);
        Map<String, String> parameters = new TreeMap<>();
        parameters.put("vnp_Version", "2.1.0");
        parameters.put("vnp_Command", "pay");
        parameters.put("vnp_TmnCode", tmnCode);
        parameters.put("vnp_Amount", amount.movePointRight(2).longValueExact() + "");
        parameters.put("vnp_CurrCode", "VND");
        parameters.put("vnp_TxnRef", orderCode);
        parameters.put("vnp_OrderInfo", "Thanh toan goi token " + orderCode);
        parameters.put("vnp_OrderType", "other");
        parameters.put("vnp_Locale", "vn");
        parameters.put("vnp_ReturnUrl", returnUrl);
        parameters.put("vnp_IpAddr", clientIp);
        parameters.put("vnp_CreateDate", VNPAY_DATE.format(now));
        parameters.put("vnp_ExpireDate", VNPAY_DATE.format(now.plusMinutes(15)));

        parameters.put("vnp_SecureHash", sign(parameters));
        return paymentUrl + "?" + encode(parameters);
    }

    public boolean hasValidSignature(Map<String, String> parameters) {
        String providedSignature = parameters.get("vnp_SecureHash");
        if (hashSecret.isBlank() || providedSignature == null
                || !providedSignature.matches("(?i)[0-9a-f]{128}")) {
            return false;
        }

        String expectedSignature = sign(parameters);
        return MessageDigest.isEqual(
                expectedSignature.toLowerCase().getBytes(StandardCharsets.US_ASCII),
                providedSignature.toLowerCase().getBytes(StandardCharsets.US_ASCII));
    }

    public boolean isConfiguredTmnCode(String value) {
        return tmnCode.equals(value);
    }

    private String sign(Map<String, String> parameters) {
        try {
            Mac hmac = Mac.getInstance("HmacSHA512");
            hmac.init(new SecretKeySpec(
                    hashSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] digest = hmac.doFinal(signedData(parameters)
                    .getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte value : digest) {
                hex.append(String.format("%02x", value & 0xff));
            }
            return hex.toString();
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Không thể tạo chữ ký VNPay.", exception);
        }
    }

    private static String signedData(Map<String, String> parameters) {
        return new TreeMap<>(parameters).entrySet().stream()
                .filter(entry -> !entry.getKey().equals("vnp_SecureHash")
                        && !entry.getKey().equals("vnp_SecureHashType"))
                .map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
                .collect(Collectors.joining("&"));
    }

    private static String encode(Map<String, String> parameters) {
        return parameters.entrySet().stream()
                .map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
                .collect(Collectors.joining("&"));
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private void requireConfigured() {
        if (paymentUrl.isBlank() || tmnCode.isBlank()
                || hashSecret.isBlank() || returnUrl.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Chưa cấu hình VNPay. Hãy thiết lập VNPAY_TMN_CODE, "
                            + "VNPAY_HASH_SECRET và VNPAY_RETURN_URL.");
        }
    }
}
