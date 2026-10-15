package group7.joblink.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.List;

@Service
public class GoogleTokenVerifier {

    private final String clientId;
    private final GoogleIdTokenVerifier verifier;

    public GoogleTokenVerifier(
            @Value("${app.google.client-id:}") String clientId) {
        this.clientId = clientId;
        this.verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(),
                GsonFactory.getDefaultInstance())
            .setAudience(List.of(clientId))
            .build();
    }

    // Kiểm tra chữ ký, hạn dùng và Client ID của ID token Google.
    public GoogleProfile verify(String credential) {
        if (clientId.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Máy chủ chưa cấu hình GOOGLE_CLIENT_ID."
            );
        }

        // Bước 1: đọc token; sai định dạng -> token không hợp lệ.
        GoogleIdToken idToken;
        try {
            idToken = GoogleIdToken.parse(
                    GsonFactory.getDefaultInstance(),
                    credential);
        } catch (IOException | IllegalArgumentException exception) {
            throw invalidToken();
        }

        // Bước 2: kiểm tra với khóa công khai của Google
        // (IOException ở bước này là lỗi mạng khi tải khóa).
        boolean valid;
        try {
            valid = verifier.verify(idToken);
        } catch (IOException exception) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Không kết nối được tới Google. Vui lòng thử lại."
            );
        } catch (GeneralSecurityException exception) {
            valid = false;
        }

        if (!valid) {
            throw invalidToken();
        }

        GoogleIdToken.Payload payload = idToken.getPayload();

        return new GoogleProfile(
                payload.getSubject(),
                payload.getEmail(),
                Boolean.TRUE.equals(payload.getEmailVerified()),
                (String) payload.get("name"),
                (String) payload.get("picture")
        );
    }

    private ResponseStatusException invalidToken() {
        return new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn."
        );
    }

    // Thông tin lấy từ tài khoản Google sau khi xác thực.
    public record GoogleProfile(
        String googleId,
        String email,
        boolean emailVerified,
        String name,
        String picture
    ) {
    }
}
