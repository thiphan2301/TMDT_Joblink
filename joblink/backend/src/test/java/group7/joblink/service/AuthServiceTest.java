package group7.joblink.service;

import group7.joblink.dto.response.AuthUserResponse;
import group7.joblink.entity.CandidateProfile;
import group7.joblink.entity.SocialAccount;
import group7.joblink.entity.User;
import group7.joblink.repository.CandidateProfileRepository;
import group7.joblink.repository.SocialAccountRepository;
import group7.joblink.repository.UserRepository;
import group7.joblink.service.GoogleTokenVerifier.GoogleProfile;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceTest {

    private static final String TOKEN = "google-id-token";

    private GoogleTokenVerifier googleTokenVerifier;
    private UserRepository userRepository;
    private CandidateProfileRepository candidateProfileRepository;
    private SocialAccountRepository socialAccountRepository;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        googleTokenVerifier = mock(GoogleTokenVerifier.class);
        userRepository = mock(UserRepository.class);
        candidateProfileRepository = mock(CandidateProfileRepository.class);
        socialAccountRepository = mock(SocialAccountRepository.class);

        authService = new AuthService(
                googleTokenVerifier,
                userRepository,
                candidateProfileRepository,
                socialAccountRepository);

        // Giả lập database cấp id khi lưu user mới.
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            ReflectionTestUtils.setField(user, "id", 10);
            return user;
        });
    }

    @Test
    void taoUngVienMoiKhiDangNhapGoogleLanDau() {
        givenGoogleProfile(new GoogleProfile(
                "google-1", "Minh.Anh@Gmail.com", true, "Nguyễn Minh Anh", "https://pic"));
        when(socialAccountRepository.findByProviderAndProviderUserId(
                SocialAccount.Provider.google, "google-1")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("minh.anh@gmail.com")).thenReturn(Optional.empty());
        when(candidateProfileRepository.findById(10)).thenReturn(Optional.of(
                new CandidateProfile(10, "Nguyễn Minh Anh", "https://pic")));

        AuthUserResponse response = authService.loginWithGoogle(TOKEN, null);

        ArgumentCaptor<User> savedUser = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(savedUser.capture());
        assertThat(savedUser.getValue().getEmail()).isEqualTo("minh.anh@gmail.com");
        assertThat(savedUser.getValue().getRole()).isEqualTo(User.Role.candidate);
        assertThat(savedUser.getValue().getPasswordHash()).isNull();

        verify(candidateProfileRepository).save(any(CandidateProfile.class));
        verify(socialAccountRepository).save(any(SocialAccount.class));

        assertThat(response.id()).isEqualTo(10);
        assertThat(response.role()).isEqualTo("candidate");
        assertThat(response.fullName()).isEqualTo("Nguyễn Minh Anh");
        assertThat(response.avatar()).isEqualTo("https://pic");
    }

    @Test
    void lienKetVoiTaiKhoanDaCoCungEmail() {
        User existing = user(4, "nguyen.van.c@gmail.com", User.Role.candidate);
        givenGoogleProfile(new GoogleProfile(
                "google-2", "nguyen.van.c@gmail.com", true, "Nguyễn Văn C", null));
        when(socialAccountRepository.findByProviderAndProviderUserId(
                SocialAccount.Provider.google, "google-2")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("nguyen.van.c@gmail.com")).thenReturn(Optional.of(existing));

        AuthUserResponse response = authService.loginWithGoogle(TOKEN, "employer");

        // Không tạo user mới, không đổi vai trò; chỉ thêm liên kết Google.
        verify(userRepository, never()).save(any(User.class));
        verify(candidateProfileRepository, never()).save(any(CandidateProfile.class));
        verify(socialAccountRepository).save(any(SocialAccount.class));
        assertThat(response.id()).isEqualTo(4);
        assertThat(response.role()).isEqualTo("candidate");
    }

    @Test
    void dangNhapLaiBangTaiKhoanGoogleDaLienKet() {
        User existing = user(7, "hr@tiki.vn", User.Role.employer);
        givenGoogleProfile(new GoogleProfile("google-3", "hr@tiki.vn", true, "HR Tiki", null));
        when(socialAccountRepository.findByProviderAndProviderUserId(
                SocialAccount.Provider.google, "google-3"))
                .thenReturn(Optional.of(new SocialAccount(existing, SocialAccount.Provider.google, "google-3")));

        AuthUserResponse response = authService.loginWithGoogle(TOKEN, null);

        verify(userRepository, never()).save(any(User.class));
        verify(socialAccountRepository, never()).save(any(SocialAccount.class));
        assertThat(response.id()).isEqualTo(7);
        assertThat(response.role()).isEqualTo("employer");
        assertThat(response.fullName()).isNull();
    }

    @Test
    void dangKyNhaTuyenDungKhongTaoHoSoUngVien() {
        givenGoogleProfile(new GoogleProfile("google-4", "hr@new.vn", true, "HR New", null));
        when(socialAccountRepository.findByProviderAndProviderUserId(
                SocialAccount.Provider.google, "google-4")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("hr@new.vn")).thenReturn(Optional.empty());

        AuthUserResponse response = authService.loginWithGoogle(TOKEN, "employer");

        verify(candidateProfileRepository, never()).save(any(CandidateProfile.class));
        assertThat(response.role()).isEqualTo("employer");
    }

    @Test
    void khongChoTuDangKyVaiTroAdmin() {
        givenGoogleProfile(new GoogleProfile("google-5", "a@b.vn", true, "A", null));
        when(socialAccountRepository.findByProviderAndProviderUserId(
                SocialAccount.Provider.google, "google-5")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("a@b.vn")).thenReturn(Optional.empty());

        AuthUserResponse response = authService.loginWithGoogle(TOKEN, "admin");

        assertThat(response.role()).isEqualTo("candidate");
    }

    @Test
    void tuChoiEmailChuaXacMinh() {
        givenGoogleProfile(new GoogleProfile("google-6", "x@gmail.com", false, "X", null));

        assertThatThrownBy(() -> authService.loginWithGoogle(TOKEN, null))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception ->
                        assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED));
        verifyNoInteractions(userRepository, socialAccountRepository);
    }

    @Test
    void tuChoiTaiKhoanBiKhoa() {
        User locked = user(8, "locked@gmail.com", User.Role.candidate);
        ReflectionTestUtils.setField(locked, "status", User.Status.locked);
        givenGoogleProfile(new GoogleProfile("google-7", "locked@gmail.com", true, "L", null));
        when(socialAccountRepository.findByProviderAndProviderUserId(
                SocialAccount.Provider.google, "google-7"))
                .thenReturn(Optional.of(new SocialAccount(locked, SocialAccount.Provider.google, "google-7")));

        assertThatThrownBy(() -> authService.loginWithGoogle(TOKEN, null))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception ->
                        assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void tuChoiKhiEmailDaGanVoiGoogleKhac() {
        User existing = user(9, "doi.email@gmail.com", User.Role.candidate);
        givenGoogleProfile(new GoogleProfile("google-new", "doi.email@gmail.com", true, "D", null));
        when(socialAccountRepository.findByProviderAndProviderUserId(
                SocialAccount.Provider.google, "google-new")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("doi.email@gmail.com")).thenReturn(Optional.of(existing));
        when(socialAccountRepository.existsByUser_IdAndProvider(9, SocialAccount.Provider.google))
                .thenReturn(true);

        assertThatThrownBy(() -> authService.loginWithGoogle(TOKEN, null))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception ->
                        assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
        verify(socialAccountRepository, never()).save(any(SocialAccount.class));
    }

    private void givenGoogleProfile(GoogleProfile profile) {
        when(googleTokenVerifier.verify(TOKEN)).thenReturn(profile);
    }

    private static User user(int id, String email, User.Role role) {
        User user = new User(email, role);
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }
}
