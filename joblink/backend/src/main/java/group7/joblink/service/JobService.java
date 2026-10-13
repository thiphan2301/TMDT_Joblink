package group7.joblink.service;

import group7.joblink.dto.response.JobResponse;
import group7.joblink.entity.Company;
import group7.joblink.entity.Job;
import group7.joblink.entity.Skill;
import group7.joblink.repository.JobRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class JobService {

    private static final ZoneId VIETNAM_ZONE =
            ZoneId.of("Asia/Ho_Chi_Minh");

    // Các trạng thái được phép xem chi tiết công khai.
    private static final Set<Job.Status> PUBLIC_STATUSES = Set.of(
            Job.Status.open,
            Job.Status.closed,
            Job.Status.expired
    );

    private final JobRepository jobRepository;

    public JobService(JobRepository jobRepository) {
        this.jobRepository = jobRepository;
    }

    // Lấy danh sách việc làm đang nhận hồ sơ.
    public List<JobResponse> getJobs() {
        LocalDate today = LocalDate.now(VIETNAM_ZONE);

        return jobRepository
                .findAvailableJobs(Job.Status.open, today)
                .stream()
                .map(job -> toResponse(job, today))
                .toList();
    }

    // Lấy chi tiết; không cho xem tin nháp, chờ duyệt hoặc bị từ chối.
    public JobResponse getJobDetail(Integer id) {
        Job job = jobRepository.findById(id)
                .filter(value ->
                        PUBLIC_STATUSES.contains(value.getStatus()))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy việc làm"
                ));

        LocalDate today = LocalDate.now(VIETNAM_ZONE);

        return toResponse(job, today);
    }

    // Chuyển Entity thành DTO để trả về frontend.
    private JobResponse toResponse(Job job, LocalDate today) {
        Company company = job.getCompany();

        // Không đặt hạn hoặc hạn từ hôm nay trở đi.
        boolean withinDeadline =
                job.getDeadline() == null
                || !job.getDeadline().isBefore(today);

        boolean acceptingApplications =
                job.getStatus() == Job.Status.open
                && withinDeadline;

        // Giữ dạng chuỗi kỹ năng như API trước đây.
        String skills = job.getSkills().isEmpty()
                ? null
                : job.getSkills().stream()
                    .map(Skill::getName)
                    .sorted()
                    .collect(Collectors.joining(", "));

        return new JobResponse(
                job.getId(),
                job.getTitle(),
                job.getDescription(),
                job.getRequirements(),

                job.getSalaryMin(),
                job.getSalaryMax(),
                job.getSalaryUnit().name(),

                job.getLocation(),
                job.getJobType(),
                job.getLevel(),
                job.getWorkingSchedule(),
                job.getVacancies(),

                job.getDeadline(),
                job.getCreatedAt(),
                job.getStatus().name(),
                acceptingApplications,
                job.isHighlighted(),
                job.isPrioritized(),

                company.getId(),
                company.getName(),
                company.getLogo(),
                company.getDescription(),
                company.getAddress(),
                company.getIndustry(),
                company.getSize(),
                company.getLatitude(),
                company.getLongitude(),
                company.getVerificationStatus().name(),

                skills
        );
    }
}