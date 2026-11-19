package group7.joblink.service;

import group7.joblink.entity.User;
import group7.joblink.repository.AssistantRepository;
import group7.joblink.repository.CandidateWalletRepository;
import group7.joblink.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class AssistantServiceTest {

    private static final int USER_ID = 24;

    private AssistantRepository assistantRepository;
    private UserRepository userRepository;
    private CandidateWalletRepository walletRepository;
    private AssistantIndexService indexService;
    private OllamaAssistantClient ollama;
    private AssistantService service;

    @BeforeEach
    void setUp() {
        assistantRepository = mock(AssistantRepository.class);
        userRepository = mock(UserRepository.class);
        walletRepository = mock(CandidateWalletRepository.class);
        indexService = mock(AssistantIndexService.class);
        ollama = mock(OllamaAssistantClient.class);
        service = new AssistantService(
                assistantRepository, userRepository, walletRepository,
                indexService, ollama);

        User candidate = new User("candidate@example.test", User.Role.candidate);
        ReflectionTestUtils.setField(candidate, "id", USER_ID);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(candidate));
        when(ollama.chat(anyString(), anyString())).thenReturn("Câu trả lời.");
    }

    @Test
    void chiGuiDonUngTuyenCuaNguoiDangDangNhapVaoNguCanh() {
        when(assistantRepository.findMyApplications(USER_ID)).thenReturn(
                List.<Object[]>of(new Object[]{
                        "Java Developer", "Công ty A", "invited",
                        Timestamp.valueOf("2025-01-15 09:30:00")
                }));

        service.chat(USER_ID, "Trạng thái đơn ứng tuyển của tôi?");

        verify(assistantRepository).findMyApplications(USER_ID);
        verify(indexService, never()).findRelevantJobs(anyString(), anyInt());
        verify(ollama).chat(anyString(), org.mockito.ArgumentMatchers.argThat(
                prompt -> prompt.contains("Java Developer")
                        && prompt.contains("invited")));
        verify(walletRepository, never()).findById(anyInt());
    }

    @Test
    void cauHoiChungVeDonUngTuyenKhongNapDuLieuTaiKhoan() {
        when(indexService.findRelevantJobs(anyString(), anyInt()))
                .thenReturn(List.of());

        service.chat(USER_ID, "Cách viết đơn ứng tuyển tốt?");

        verify(assistantRepository, never()).findMyApplications(anyInt());
        verify(walletRepository, never()).findById(anyInt());
        verify(indexService).findRelevantJobs(
                "Cách viết đơn ứng tuyển tốt?", 5);
    }

    @Test
    void nhaTuyenDungKhongDuocDungTroLyUngVien() {
        User employer = new User("employer@example.test", User.Role.employer);
        ReflectionTestUtils.setField(employer, "id", USER_ID);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(employer));

        assertThatThrownBy(() -> service.chat(USER_ID, "Xin chào"))
                .isInstanceOf(ResponseStatusException.class);
        verifyNoInteractions(ollama);
    }

    @Test
    void cosineSimilarityXuLyDongHuongVaVectorKhongTuongThich() {
        assertThat(AssistantIndexService.cosineSimilarity(
                List.of(1d, 2d), List.of(2d, 4d))).isCloseTo(1d,
                org.assertj.core.data.Offset.offset(1e-12));
        assertThat(AssistantIndexService.cosineSimilarity(
                List.of(1d, 0d), List.of(0d, 1d))).isEqualTo(0d);
        assertThat(AssistantIndexService.cosineSimilarity(
                List.of(1d), List.of(1d, 0d))).isEqualTo(0d);
    }
}
