package group7.joblink.service;

import group7.joblink.dto.*;
import group7.joblink.dto.response.AuthUserResponse;
import group7.joblink.entity.CandidateProfile;
import group7.joblink.entity.SocialAccount;
import group7.joblink.entity.User;
import group7.joblink.repository.CandidateProfileRepository;
import group7.joblink.repository.SocialAccountRepository;
import group7.joblink.repository.UserRepository;
import group7.joblink.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Locale;

@Service
public class AuthService {
    public static final String SESSION_USER_ID = "userId";
    private static final int AVATAR_MAX_LENGTH = 500;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwtService;
    private final OtpService otpService;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final CandidateProfileRepository candidateProfiles;
    private final SocialAccountRepository socialAccounts;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwtService,
                       OtpService otpService, GoogleTokenVerifier googleTokenVerifier,
                       CandidateProfileRepository candidateProfiles,
                       SocialAccountRepository socialAccounts) {
        this.users = users;
        this.encoder = encoder;
        this.jwtService = jwtService;
        this.otpService = otpService;
        this.googleTokenVerifier = googleTokenVerifier;
        this.candidateProfiles = candidateProfiles;
        this.socialAccounts = socialAccounts;
    }

    public RegisterResponse register(RegisterRequest body) { return otpService.startRegistration(body); }
    public RegisterResponse verifyOtp(String email, String otp) { return otpService.verify(email, otp); }
    public RegisterResponse resendOtp(String email) { return otpService.resend(email); }

    // Kept for callers that used AuthService.login previously.
    public LoginResponse login(LoginRequest body) { return loginUser(body).response(); }

    public record PasswordLogin(Integer userId, LoginResponse response) {}

    public PasswordLogin loginUser(LoginRequest body) {
        String email = normalizeEmail(body.email());
        User user = users.findByEmail(email)
                .orElseThrow(() -> err(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không chính xác"));
        ensureActive(user);
        if (body.password() == null || user.getPasswordHash() == null ||
                !encoder.matches(body.password(), user.getPasswordHash())) {
            throw err(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không chính xác");
        }
        String token = jwtService.generateToken(user);
        UserResponse view = new UserResponse(user.getId(), user.getEmail(), user.getRole());
        return new PasswordLogin(user.getId(),
                new LoginResponse(token, view, "Đăng nhập thành công"));
    }

    // Google ID token is verified server-side (signature, audience, expiry, email_verified).
    @Transactional
    public AuthUserResponse loginWithGoogle(String credential, String requestedRole) {
        GoogleTokenVerifier.GoogleProfile profile = googleTokenVerifier.verify(credential);
        if (profile.email() == null || !profile.emailVerified()) {
            throw err(HttpStatus.UNAUTHORIZED, "Email Google chưa xác minh");
        }
        User user = socialAccounts.findByProviderAndProviderUserId(
                        SocialAccount.Provider.google, profile.googleId())
                .map(SocialAccount::getUser)
                .orElseGet(() -> linkGoogleAccount(profile, requestedRole));
        ensureActive(user);
        return toResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthUserResponse getCurrentUser(Integer userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> err(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không hợp lệ"));
        ensureActive(user);
        return toResponse(user);
    }

    private User linkGoogleAccount(GoogleTokenVerifier.GoogleProfile profile, String requestedRole) {
        String email = normalizeEmail(profile.email());
        User user = users.findByEmail(email)
                .orElseGet(() -> createGoogleUser(profile, email, requestedRole));

        if (socialAccounts.existsByUser_IdAndProvider(user.getId(), SocialAccount.Provider.google)) {
            throw err(HttpStatus.CONFLICT, "Email đã liên kết với tài khoản Google khác");
        }
        socialAccounts.save(new SocialAccount(user, SocialAccount.Provider.google, profile.googleId()));
        return user;
    }

    private User createGoogleUser(GoogleTokenVerifier.GoogleProfile profile, String email, String role) {
        User user = new User();
        user.setEmail(email);
        user.setRole("employer".equals(role) ? "employer" : "candidate");
        user.setStatus("active");
        // V1 uses password_hash NOT NULL. Random unguessable password is NEVER returned to client.
        byte[] secret = new byte[32];
        RANDOM.nextBytes(secret);
        user.setPasswordHash(encoder.encode(Base64.getUrlEncoder().withoutPadding().encodeToString(secret)));
        users.saveAndFlush(user);

        if ("candidate".equals(user.getRole())) {
            String fullName = profile.name() == null || profile.name().isBlank()
                    ? email.substring(0, email.indexOf('@')) : profile.name().trim();
            String avatar = profile.picture() != null && profile.picture().length() <= AVATAR_MAX_LENGTH
                    ? profile.picture() : null;
            candidateProfiles.save(new CandidateProfile(user.getId(), fullName, avatar));
        }
        return user;
    }

    private AuthUserResponse toResponse(User user) {
        CandidateProfile profile = "candidate".equals(user.getRole())
                ? candidateProfiles.findById(user.getId()).orElse(null) : null;
        return new AuthUserResponse(user.getId(), user.getEmail(), user.getRole(),
                profile == null ? null : profile.getFullName(),
                profile == null ? null : profile.getAvatar());
    }

    private void ensureActive(User user) {
        if (!"active".equalsIgnoreCase(user.getStatus())) {
            throw err(HttpStatus.FORBIDDEN, "Tài khoản đã bị khóa");
        }
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) throw err(HttpStatus.BAD_REQUEST, "Email không hợp lệ");
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private ResponseStatusException err(HttpStatus status, String message) {
        return new ResponseStatusException(status, message);
    }
}
