package group7.joblink.service;

import group7.joblink.dto.response.AuthUserResponse;
import group7.joblink.entity.CandidateProfile;
import group7.joblink.entity.SocialAccount;
import group7.joblink.entity.User;
import group7.joblink.repository.CandidateProfileRepository;
import group7.joblink.repository.SocialAccountRepository;
import group7.joblink.repository.UserRepository;
import group7.joblink.service.GoogleTokenVerifier.GoogleProfile;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
public class AuthService {

    // Khóa lưu id người dùng trong HttpSession sau khi đăng nhập.
    public static final String SESSION_USER_ID = "userId";

    private static final int AVATAR_MAX_LENGTH = 500;

    private final GoogleTokenVerifier googleTokenVerifier;
    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final SocialAccountRepository socialAccountRepository;

    public AuthService(
            GoogleTokenVerifier googleTokenVerifier,
            UserRepository userRepository,
            CandidateProfileRepository candidateProfileRepository,
            SocialAccountRepository socialAccountRepository) {
        this.googleTokenVerifier = googleTokenVerifier;
        this.userRepository = userRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.socialAccountRepository = socialAccountRepository;
    }

    // Đăng nhập bằng Google. Lần đầu: liên kết với tài khoản cùng email
    // hoặc tạo tài khoản mới (mặc định là ứng viên).
    @Transactional
    public AuthUserResponse loginWithGoogle(
            String credential,
            String requestedRole) {

        GoogleProfile google = googleTokenVerifier.verify(credential);

        if (google.email() == null || !google.emailVerified()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Email Google của bạn chưa được xác minh."
            );
        }

        User user = socialAccountRepository
                .findByProviderAndProviderUserId(
                        SocialAccount.Provider.google,
                        google.googleId())
                .map(SocialAccount::getUser)
                .orElseGet(() -> linkGoogleAccount(google, requestedRole));

        ensureActive(user);

        return toResponse(user);
    }

    // Lấy người dùng đang đăng nhập theo id lưu trong session.
    @Transactional(readOnly = true)
    public AuthUserResponse getCurrentUser(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Phiên đăng nhập không còn hợp lệ."
                ));

        ensureActive(user);

        return toResponse(user);
    }

    private User linkGoogleAccount(
            GoogleProfile google,
            String requestedRole) {

        String email = google.email().trim().toLowerCase(Locale.ROOT);

        User user = userRepository.findByEmail(email)
                .orElseGet(() -> createUser(
                        email,
                        google,
                        toSignupRole(requestedRole)));

        // Email này đã gắn với một tài khoản Google khác.
        if (socialAccountRepository.existsByUser_IdAndProvider(
                user.getId(),
                SocialAccount.Provider.google)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email này đã liên kết với một tài khoản Google khác."
            );
        }

        socialAccountRepository.save(new SocialAccount(
                user,
                SocialAccount.Provider.google,
                google.googleId()));

        return user;
    }

    private User createUser(
            String email,
            GoogleProfile google,
            User.Role role) {

        // Trigger trg_users_after_insert tự tạo ví 20 Token cho user mới.
        User user = userRepository.save(new User(email, role));

        if (role == User.Role.candidate) {
            String fullName = google.name() == null || google.name().isBlank()
                    ? email.substring(0, email.indexOf('@'))
                    : google.name().trim();

            String avatar = google.picture() != null
                    && google.picture().length() <= AVATAR_MAX_LENGTH
                    ? google.picture()
                    : null;

            candidateProfileRepository.save(
                    new CandidateProfile(user.getId(), fullName, avatar));
        }

        return user;
    }

    // Chỉ cho tự đăng ký vai trò ứng viên hoặc nhà tuyển dụng.
    private User.Role toSignupRole(String requestedRole) {
        return "employer".equals(requestedRole)
                ? User.Role.employer
                : User.Role.candidate;
    }

    private void ensureActive(User user) {
        if (user.getStatus() == User.Status.locked) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản của bạn đã bị khóa."
            );
        }
    }

    private AuthUserResponse toResponse(User user) {
        CandidateProfile profile = user.getRole() == User.Role.candidate
                ? candidateProfileRepository.findById(user.getId()).orElse(null)
                : null;

        return new AuthUserResponse(
                user.getId(),
                user.getEmail(),
                user.getRole().name(),
                profile == null ? null : profile.getFullName(),
                profile == null ? null : profile.getAvatar()
        );
    }
}
