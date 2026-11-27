package group7.joblink.service;

import group7.joblink.dto.response.JobResponse;
import group7.joblink.entity.Company;
import group7.joblink.entity.Job;
import group7.joblink.repository.ApplicationRepository;
import group7.joblink.repository.ApplicationRepository.JobApplicationCount;
import group7.joblink.repository.JobRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.BeanUtils;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class JobServiceTest {

    private JobRepository jobRepository;
    private ApplicationRepository applicationRepository;
    private JobService service;

    @BeforeEach
    void setUp() {
        jobRepository = mock(JobRepository.class);
        applicationRepository = mock(ApplicationRepository.class);
        service = new JobService(jobRepository, applicationRepository);
    }

    @Test
    void danhSachKemSoNguoiUngTuyenTinChuaCoDonLa0() {
        when(jobRepository.findAvailableJobs(eq(Job.Status.open), any()))
                .thenReturn(List.of(job(1), job(2), job(3)));
        when(applicationRepository.countByJobIds(any()))
                .thenReturn(List.of(count(1, 5), count(3, 2)));

        List<JobResponse> jobs = service.getJobs();

        // Cùng gói, cùng ngày đăng nên thứ tự được xáo; chỉ kiểm tra số đơn.
        assertThat(jobs).extracting(JobResponse::id, JobResponse::applicationCount)
                .containsExactlyInAnyOrder(tuple(1, 5L), tuple(2, 0L), tuple(3, 2L));
        // Đếm cho cả danh sách bằng một truy vấn.
        verify(applicationRepository, times(1)).countByJobIds(any());
    }

    @Test
    void khongCoTinThiKhongDemDon() {
        when(jobRepository.findAvailableJobs(eq(Job.Status.open), any())).thenReturn(List.of());

        assertThat(service.getJobs()).isEmpty();
        verifyNoInteractions(applicationRepository);
    }

    @Test
    void chiTietTinKemSoNguoiUngTuyen() {
        when(jobRepository.findById(7)).thenReturn(Optional.of(job(7)));
        when(applicationRepository.countByJobIds(List.of(7))).thenReturn(List.of(count(7, 12)));

        assertThat(service.getJobDetail(7).applicationCount()).isEqualTo(12L);
    }

    @Test
    void xepTheoGoiRoiNgayDangCungGoiCungNgayThiXaoNgauNhien() {
        LocalDateTime today = LocalDateTime.of(2026, 11, 27, 9, 0);
        LocalDateTime yesterday = today.minusDays(1);
        List<Job> jobs = List.of(
                job(1, Job.DisplayTier.basic, today),
                job(2, Job.DisplayTier.pro, yesterday),
                job(3, Job.DisplayTier.premium, today.plusHours(2)),
                job(4, Job.DisplayTier.pro, today),
                job(5, Job.DisplayTier.premium, today),
                job(6, Job.DisplayTier.pro, today.plusMinutes(30)));

        // Một Random dùng cho mọi lần tải trang, giống JobService thật.
        Random random = new Random(42);
        Set<List<Integer>> premiumOrders = new HashSet<>();
        Set<List<Integer>> proTodayOrders = new HashSet<>();
        for (int load = 0; load < 30; load++) {
            List<Integer> ids = JobService.rankForDisplay(jobs, random).stream()
                    .map(Job::getId).toList();

            // Premium -> Pro hôm nay -> Pro hôm qua -> Basic.
            assertThat(ids.subList(0, 2)).containsExactlyInAnyOrder(3, 5);
            assertThat(ids.subList(2, 4)).containsExactlyInAnyOrder(4, 6);
            assertThat(ids.subList(4, 6)).containsExactly(2, 1);

            premiumOrders.add(ids.subList(0, 2));
            proTodayOrders.add(ids.subList(2, 4));
        }

        // Tải lại nhiều lần thì thứ tự trong nhóm thay đổi.
        assertThat(premiumOrders).hasSize(2);
        assertThat(proTodayOrders).hasSize(2);
    }

    @Test
    void tinDaDangDungNgayDangTinKhongPhaiNgayTao() {
        Job draftedEarlier = job(1, Job.DisplayTier.basic, LocalDateTime.of(2026, 11, 20, 8, 0));
        ReflectionTestUtils.setField(draftedEarlier, "publishedAt", LocalDateTime.of(2026, 11, 27, 8, 0));
        Job postedYesterday = job(2, Job.DisplayTier.basic, LocalDateTime.of(2026, 11, 26, 8, 0));

        List<Integer> ids = JobService.rankForDisplay(List.of(postedYesterday, draftedEarlier), new Random(1))
                .stream().map(Job::getId).toList();

        assertThat(ids).containsExactly(1, 2);
    }

    @Test
    void traVeGoiVaThoiDiemDangTin() {
        Job job = job(9, Job.DisplayTier.premium, LocalDateTime.of(2026, 11, 27, 9, 0));
        when(jobRepository.findById(9)).thenReturn(Optional.of(job));
        when(applicationRepository.countByJobIds(List.of(9))).thenReturn(List.of());

        JobResponse response = service.getJobDetail(9);

        assertThat(response.displayTier()).isEqualTo("premium");
        assertThat(response.postedAt()).isEqualTo(LocalDateTime.of(2026, 11, 27, 9, 0));
    }

    private static Job job(int id, Job.DisplayTier tier, LocalDateTime createdAt) {
        Job job = job(id);
        ReflectionTestUtils.setField(job, "displayTier", tier);
        ReflectionTestUtils.setField(job, "createdAt", createdAt);
        return job;
    }

    private static Job job(int id) {
        Company company = BeanUtils.instantiateClass(Company.class);
        ReflectionTestUtils.setField(company, "id", 1);
        ReflectionTestUtils.setField(company, "name", "Tiki");
        ReflectionTestUtils.setField(company, "verificationStatus", Company.VerificationStatus.verified);

        Job job = BeanUtils.instantiateClass(Job.class);
        ReflectionTestUtils.setField(job, "id", id);
        ReflectionTestUtils.setField(job, "title", "Job " + id);
        ReflectionTestUtils.setField(job, "company", company);
        ReflectionTestUtils.setField(job, "salaryUnit", Job.SalaryUnit.month);
        ReflectionTestUtils.setField(job, "status", Job.Status.open);
        return job;
    }

    private static JobApplicationCount count(int jobId, long total) {
        return new JobApplicationCount() {
            @Override
            public Integer getJobId() {
                return jobId;
            }

            @Override
            public Long getTotal() {
                return total;
            }
        };
    }
}
