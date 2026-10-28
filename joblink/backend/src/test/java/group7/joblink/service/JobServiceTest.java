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

import java.util.List;
import java.util.Optional;

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
        when(applicationRepository.countByJobIds(List.of(1, 2, 3)))
                .thenReturn(List.of(count(1, 5), count(3, 2)));

        List<JobResponse> jobs = service.getJobs();

        assertThat(jobs).extracting(JobResponse::id, JobResponse::applicationCount)
                .containsExactly(tuple(1, 5L), tuple(2, 0L), tuple(3, 2L));
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
