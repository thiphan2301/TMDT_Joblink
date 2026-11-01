package group7.joblink.service;

import group7.joblink.entity.User;
import group7.joblink.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

@Service
public class PasswordResetService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final EmailService emailService;
    private final String frontendUrl;

    public PasswordResetService(UserRepository users, PasswordEncoder encoder,
            EmailService emailService,
            @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl) {
        this.users = users;
        this.encoder = encoder;
        this.emailService = emailService;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    }

    @Transactional
    public void request(String email) {
        User user = users.findLockedByEmail(email.trim().toLowerCase(Locale.ROOT)).orElse(null);
        if (user == null || user.getStatus() != User.Status.active) return;
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        // Giới hạn gửi lại một lần/phút cho mỗi tài khoản, kể cả yêu cầu đồng thời.
        if (user.getResetRequestedAt() != null
                && user.getResetRequestedAt().plusMinutes(1).isAfter(now)) return;
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        user.setResetTokenHash(hash(token));
        user.setResetExpiresAt(now.plusMinutes(15));
        user.setResetRequestedAt(now);
        users.saveAndFlush(user);
        // Fragment không đi vào HTTP access log hay Referer của trang.
        emailService.sendPasswordReset(user.getEmail(), frontendUrl + "/reset-password#token=" + token);
    }

    @Transactional
    public void reset(String token, String password) {
        validatePassword(password);
        if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) throw invalidLink();
        User user = users.findLockedByResetTokenHash(hash(token)).orElseThrow(this::invalidLink);
        if (user.getStatus() != User.Status.active || user.getResetExpiresAt() == null
                || !user.getResetExpiresAt().isAfter(LocalDateTime.now(ZoneOffset.UTC))) {
            throw invalidLink();
        }
        user.setPasswordHash(encoder.encode(password));
        user.setSessionsInvalidBefore(System.currentTimeMillis());
        user.setResetTokenHash(null);
        user.setResetExpiresAt(null);
        users.saveAndFlush(user);
    }

    static void validatePassword(String password) {
        if (password == null || password.length() < 8
                || password.getBytes(StandardCharsets.UTF_8).length > 72
                || !password.matches("(?s).*[A-Z].*")
                || !password.matches("(?s).*[0-9].*")
                || !password.matches("(?s).*[^a-zA-Z0-9\\s].*")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Mật khẩu cần ít nhất 8 ký tự, chữ hoa, số, ký tự đặc biệt và không quá 72 byte.");
        }
    }

    static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private ResponseStatusException invalidLink() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.");
    }
}
