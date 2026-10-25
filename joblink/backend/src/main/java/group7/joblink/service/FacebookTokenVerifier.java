package group7.joblink.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.HexFormat;
import java.util.function.Supplier;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

@Service
public class FacebookTokenVerifier {

    private static final Logger log = LoggerFactory.getLogger(FacebookTokenVerifier.class);
    private static final String GRAPH_URL = "https://graph.facebook.com";
    private static final JsonMapper JSON = JsonMapper.builder().build();

    private final String appId;
    private final String appSecret;
    private final RestClient restClient;

    @Autowired
    public FacebookTokenVerifier(
            @Value("${app.facebook.app-id:}") String appId,
            @Value("${app.facebook.app-secret:}") String appSecret) {
        this(appId, appSecret, RestClient.builder());
    }

    // Test truyền builder đã gắn MockRestServiceServer.
    FacebookTokenVerifier(String appId, String appSecret, RestClient.Builder builder) {
        this.appId = appId;
        this.appSecret = appSecret;
        this.restClient = builder.baseUrl(GRAPH_URL).build();
    }

    // Kiểm tra access token Facebook do frontend gửi lên rồi lấy thông tin người dùng.
    public FacebookProfile verify(String accessToken) {
        if (appId.isBlank() || appSecret.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Máy chủ chưa cấu hình FACEBOOK_APP_ID và FACEBOOK_APP_SECRET."
            );
        }

        // Bước 1: hỏi Facebook token còn hạn và được cấp cho đúng app JobLink không
        // (token của app khác không được dùng để đăng nhập vào JobLink).
        DebugTokenResponse debug = call(() -> restClient.get()
                .uri("/debug_token?input_token={token}&access_token={appToken}",
                        accessToken, appId + "|" + appSecret)
                .retrieve()
                .body(String.class), DebugTokenResponse.class);

        TokenInfo info = debug == null ? null : debug.data();

        if (info == null || !info.valid() || !appId.equals(info.appId()) || info.userId() == null) {
            throw invalidToken();
        }

        // Bước 2: lấy id, tên, email, ảnh đại diện của người dùng.
        Me me = call(() -> restClient.get()
                .uri("/me?fields=id,name,email,picture.width(256).height(256)&appsecret_proof={proof}",
                        appSecretProof(accessToken))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .body(String.class), Me.class);

        if (me == null || !info.userId().equals(me.id())) {
            throw invalidToken();
        }

        String picture = me.picture() == null || me.picture().data() == null
                ? null
                : me.picture().data().url();

        return new FacebookProfile(me.id(), me.email(), me.name(), picture);
    }

    // Đọc kết quả dạng chữ rồi tự đọc JSON: Graph API không phải lúc nào cũng
    // trả Content-Type application/json.
    // 4xx: Facebook từ chối token; lỗi còn lại là mạng hoặc Facebook đang lỗi.
    private <T> T call(Supplier<String> request, Class<T> type) {
        String body;
        try {
            body = request.get();
        } catch (HttpClientErrorException exception) {
            // Thông báo lỗi của Facebook (không chứa token), giúp phân biệt token hết hạn
            // với cấu hình sai FACEBOOK_APP_ID / FACEBOOK_APP_SECRET.
            log.warn("Facebook từ chối yêu cầu ({}): {}",
                    exception.getStatusCode(), exception.getResponseBodyAsString());
            throw invalidToken();
        } catch (RestClientException exception) {
            log.warn("Không gọi được Graph API của Facebook", exception);
            throw facebookUnavailable();
        }

        if (body == null || body.isBlank()) {
            return null;
        }

        try {
            return JSON.readValue(body, type);
        } catch (JacksonException exception) {
            log.warn("Không đọc được dữ liệu Facebook trả về: {}", exception.getOriginalMessage());
            throw facebookUnavailable();
        }
    }

    private ResponseStatusException facebookUnavailable() {
        return new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Không kết nối được tới Facebook. Vui lòng thử lại."
        );
    }

    // appsecret_proof = HMAC-SHA256(access token, App Secret), Facebook dùng để chống
    // việc lấy trộm token rồi gọi API thay app.
    private String appSecretProof(String accessToken) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(appSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(accessToken.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Không tạo được appsecret_proof", exception);
        }
    }

    private ResponseStatusException invalidToken() {
        return new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Phiên đăng nhập Facebook không hợp lệ hoặc đã hết hạn."
        );
    }

    // Thông tin lấy từ tài khoản Facebook sau khi xác thực.
    // email có thể null nếu tài khoản Facebook đăng ký bằng số điện thoại
    // hoặc người dùng không cho phép chia sẻ email.
    public record FacebookProfile(
        String facebookId,
        String email,
        String name,
        String picture
    ) {
    }

    // Kết quả trả về của Graph API (chỉ lấy các trường cần dùng).
    @JsonIgnoreProperties(ignoreUnknown = true)
    record DebugTokenResponse(TokenInfo data) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record TokenInfo(
        @JsonProperty("is_valid") boolean valid,
        @JsonProperty("app_id") String appId,
        @JsonProperty("user_id") String userId
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Me(String id, String name, String email, Picture picture) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Picture(PictureData data) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record PictureData(String url) {
    }
}
