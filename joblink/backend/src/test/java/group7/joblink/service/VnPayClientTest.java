package group7.joblink.service;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VnPayClientTest {

    @Test
    void taoUrlThanhToanCoChuKyHopLeVaSoTienDungDonVi() {
        VnPayClient client = new VnPayClient(
                "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
                "TESTCODE",
                "test-secret",
                "http://localhost:5173/vi-token");

        String paymentUrl = client.createPaymentUrl(
                "order-123", new BigDecimal("499000.00"), "127.0.0.1");
        Map<String, String> parameters = queryParameters(paymentUrl);

        assertThat(parameters.get("vnp_Amount")).isEqualTo("49900000");
        assertThat(parameters.get("vnp_TmnCode")).isEqualTo("TESTCODE");
        assertThat(parameters.get("vnp_TxnRef")).isEqualTo("order-123");
        assertThat(client.hasValidSignature(parameters)).isTrue();

        parameters.put("vnp_Amount", "100");
        assertThat(client.hasValidSignature(parameters)).isFalse();
    }

    @Test
    void khongTaoUrlNeuChuaCauHinhSecret() {
        VnPayClient client = new VnPayClient(
                "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
                "",
                "",
                "http://localhost:5173/vi-token");

        assertThatThrownBy(() -> client.createPaymentUrl(
                "order-123", new BigDecimal("10000"), "127.0.0.1"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("VNPAY_HASH_SECRET");
    }

    private static Map<String, String> queryParameters(String url) {
        return Arrays.stream(URI.create(url).getRawQuery().split("&"))
                .map(pair -> pair.split("=", 2))
                .collect(Collectors.toMap(
                        pair -> URLDecoder.decode(pair[0], StandardCharsets.UTF_8),
                        pair -> URLDecoder.decode(pair[1], StandardCharsets.UTF_8)));
    }
}
