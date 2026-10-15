package group7.joblink.service;

import group7.joblink.dto.request.UpdateProfileRequest;
import group7.joblink.dto.response.ProfileResponse;
import group7.joblink.entity.CandidateProfile;
import group7.joblink.entity.Skill;
import group7.joblink.entity.User;
import group7.joblink.repository.CandidateProfileRepository;
import group7.joblink.repository.SkillRepository;
import group7.joblink.repository.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class ProfileServiceTest {

    private static final int USER_ID = 4;

    private UserRepository userRepository;
    private CandidateProfileRepository candidateProfileRepository;
    private SkillRepository skillRepository;
    private ProfileService profileService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        candidateProfileRepository = mock(CandidateProfileRepository.class);
        skillRepository = mock(SkillRepository.class);
        profileService = new ProfileService(
                userRepository, candidateProfileRepository, skillRepository);

        when(candidateProfileRepository.save(any(CandidateProfile.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // Bảng skills giả lập: tạo mới thì cấp id tăng dần.
        AtomicInteger nextSkillId = new AtomicInteger(100);
        when(skillRepository.findByName(anyString())).thenReturn(Optional.empty());
        when(skillRepository.save(any(Skill.class))).thenAnswer(invocation -> {
            Skill skill = invocation.getArgument(0);
            ReflectionTestUtils.setField(skill, "id", nextSkillId.getAndIncrement());
            return skill;
        });
    }

    @Test
    void layHoSoUngVienKemKyNangSapXep() {
        givenUser(User.Role.candidate);
        CandidateProfile profile = new CandidateProfile(USER_ID, "Nguyễn Văn C", null);
        profile.replaceSkills(List.of(skill(2, "Spring Boot"), skill(1, "Java")));
        when(candidateProfileRepository.findById(USER_ID)).thenReturn(Optional.of(profile));

        ProfileResponse response = profileService.getProfile(USER_ID);

        assertThat(response.email()).isEqualTo("user@gmail.com");
        assertThat(response.fullName()).isEqualTo("Nguyễn Văn C");
        assertThat(response.skills()).containsExactly("Java", "Spring Boot");
        assertThat(response.searchable()).isTrue();
    }

    @Test
    void ungVienChuaCoHoSoTraVeHoSoTrong() {
        givenUser(User.Role.candidate);
        when(candidateProfileRepository.findById(USER_ID)).thenReturn(Optional.empty());

        ProfileResponse response = profileService.getProfile(USER_ID);

        assertThat(response.fullName()).isNull();
        assertThat(response.skills()).isEmpty();
    }

    @Test
    void nhaTuyenDungKhongCoHoSoCaNhan() {
        givenUser(User.Role.employer);

        assertStatus(() -> profileService.getProfile(USER_ID), HttpStatus.FORBIDDEN);
    }

    @Test
    void capNhatChuanHoaDuLieuVaTaoHoSoNeuChuaCo() {
        givenUser(User.Role.candidate);
        when(candidateProfileRepository.findById(USER_ID)).thenReturn(Optional.empty());
        when(skillRepository.findByName("java")).thenReturn(Optional.of(skill(1, "Java")));

        ProfileResponse response = profileService.updateProfile(USER_ID, new UpdateProfileRequest(
                "  Nguyễn Minh Anh  ",
                "090 123.4567",
                LocalDate.of(2000, 5, 12),
                "  Quận 1, TP.HCM ",
                "   ",
                false,
                new ArrayList<>(List.of("java", " Figma ", "JAVA", "", "Figma"))));

        assertThat(response.fullName()).isEqualTo("Nguyễn Minh Anh");
        assertThat(response.phone()).isEqualTo("0901234567");
        assertThat(response.address()).isEqualTo("Quận 1, TP.HCM");
        assertThat(response.summary()).isNull();
        assertThat(response.searchable()).isFalse();
        // "java" dùng lại kỹ năng có sẵn, "Figma" được tạo mới, bỏ trùng.
        assertThat(response.skills()).containsExactly("Figma", "Java");
        verify(skillRepository, times(1)).save(any(Skill.class));
        verify(candidateProfileRepository).save(any(CandidateProfile.class));
    }

    @Test
    void khongGuiSearchableThiGiuNguyen() {
        givenUser(User.Role.candidate);
        CandidateProfile profile = new CandidateProfile(USER_ID, "A", null);
        profile.updateInfo("A", null, null, null, null, false);
        when(candidateProfileRepository.findById(USER_ID)).thenReturn(Optional.of(profile));

        ProfileResponse response = profileService.updateProfile(USER_ID,
                new UpdateProfileRequest("B", null, null, null, null, null, null));

        assertThat(response.fullName()).isEqualTo("B");
        assertThat(response.searchable()).isFalse();
    }

    @Test
    void xoaKyNangBiBoVaGiuKyNangConLai() {
        givenUser(User.Role.candidate);
        Skill java = skill(1, "Java");
        CandidateProfile profile = new CandidateProfile(USER_ID, "A", null);
        profile.replaceSkills(List.of(java, skill(5, "MySQL")));
        when(candidateProfileRepository.findById(USER_ID)).thenReturn(Optional.of(profile));
        when(skillRepository.findByName("Java")).thenReturn(Optional.of(java));

        ProfileResponse response = profileService.updateProfile(USER_ID,
                new UpdateProfileRequest("A", null, null, null, null, true, List.of("Java")));

        assertThat(response.skills()).containsExactly("Java");
        assertThat(profile.getSkills()).containsExactly(java);
    }

    @Test
    void baoLoiKhiDuLieuKhongHopLe() {
        givenUser(User.Role.candidate);
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        List<String> tooManySkills = new ArrayList<>();
        for (int i = 0; i < 21; i++) {
            tooManySkills.add("Skill " + i);
        }

        assertBadRequest(new UpdateProfileRequest("  ", null, null, null, null, null, null));
        assertBadRequest(new UpdateProfileRequest("A", "12345", null, null, null, null, null));
        assertBadRequest(new UpdateProfileRequest("A", null, today.plusDays(1), null, null, null, null));
        assertBadRequest(new UpdateProfileRequest("A", null, today.minusYears(10), null, null, null, null));
        assertBadRequest(new UpdateProfileRequest("A", null, null, "x".repeat(501), null, null, null));
        assertBadRequest(new UpdateProfileRequest("A", null, null, null, "x".repeat(2001), null, null));
        assertBadRequest(new UpdateProfileRequest("A", null, null, null, null, null, tooManySkills));
        assertBadRequest(new UpdateProfileRequest("A", null, null, null, null, null, List.of("x".repeat(101))));

        verify(candidateProfileRepository, never()).save(any(CandidateProfile.class));
    }

    @Test
    void tuChoiTaiKhoanBiKhoa() {
        User user = givenUser(User.Role.candidate);
        ReflectionTestUtils.setField(user, "status", User.Status.locked);

        assertStatus(() -> profileService.getProfile(USER_ID), HttpStatus.FORBIDDEN);
    }

    private User givenUser(User.Role role) {
        User user = new User("user@gmail.com", role);
        ReflectionTestUtils.setField(user, "id", USER_ID);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        return user;
    }

    private static Skill skill(int id, String name) {
        Skill skill = new Skill(name);
        ReflectionTestUtils.setField(skill, "id", id);
        return skill;
    }

    private void assertBadRequest(UpdateProfileRequest request) {
        assertStatus(() -> profileService.updateProfile(USER_ID, request), HttpStatus.BAD_REQUEST);
    }

    private static void assertStatus(Runnable action, HttpStatus status) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(ResponseStatusException.class, exception ->
                        assertThat(exception.getStatusCode()).isEqualTo(status));
    }
}
