package group7.joblink.service;

import group7.joblink.dto.response.JobResponse;
import group7.joblink.entity.Company;
import group7.joblink.entity.Job;
import group7.joblink.entity.Skill;
import group7.joblink.repository.ApplicationRepository;
import group7.joblink.repository.JobRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.TreeMap;
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

    // Gói cao hơn trước; cùng gói thì ngày đăng mới hơn trước.
    private static final Comparator<RankGroup> RANK_ORDER = Comparator
            .comparing(RankGroup::tier).reversed()
            .thenComparing(RankGroup::postedOn,
                    Comparator.nullsLast(Comparator.reverseOrder()));

    private final JobRepository jobRepository;
    private final ApplicationRepository applicationRepository;
    private final Random random;

    @Autowired
    public JobService(
            JobRepository jobRepository,
            ApplicationRepository applicationRepository) {
        this(jobRepository, applicationRepository, new Random());
    }

    // Test truyền Random có seed cố định để kiểm tra thứ tự xáo.
    JobService(
            JobRepository jobRepository,
            ApplicationRepository applicationRepository,
            Random random) {
        this.jobRepository = jobRepository;
        this.applicationRepository = applicationRepository;
        this.random = random;
    }

    // Lấy danh sách việc làm đang nhận hồ sơ, theo thứ tự hiển thị công khai.
    public List<JobResponse> getJobs() {
        LocalDate today = LocalDate.now(VIETNAM_ZONE);

        List<Job> jobs = rankForDisplay(
                jobRepository.findAvailableJobs(Job.Status.open, today),
                random);

        // Đếm số đơn của tất cả tin bằng một truy vấn.
        Map<Integer, Long> counts = countApplications(
                jobs.stream().map(Job::getId).toList());

        return jobs.stream()
                .map(job -> toResponse(
                        job,
                        today,
                        counts.getOrDefault(job.getId(), 0L)))
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

        return toResponse(
                job,
                today,
                countApplications(List.of(id)).getOrDefault(id, 0L));
    }

    // Thứ tự hiển thị công khai:
    //  1. Gói lúc đăng tin cao hơn trước (premium > pro > basic).
    //  2. Cùng gói: ngày đăng mới hơn trước.
    //  3. Cùng gói + cùng ngày đăng: xáo ngẫu nhiên mỗi lần tải trang, để các
    //     nhà tuyển dụng cùng gói đăng tin cùng lúc có cơ hội hiển thị như nhau.
    static List<Job> rankForDisplay(List<Job> jobs, Random random) {
        Map<RankGroup, List<Job>> groups = new TreeMap<>(RANK_ORDER);
        for (Job job : jobs) {
            groups.computeIfAbsent(RankGroup.of(job), key -> new ArrayList<>()).add(job);
        }

        List<Job> ranked = new ArrayList<>(jobs.size());
        for (List<Job> group : groups.values()) {
            Collections.shuffle(group, random);
            ranked.addAll(group);
        }
        return ranked;
    }

    // Thời điểm đăng: lần đầu mở tin; tin cũ chưa ghi thì lấy ngày tạo.
    private static LocalDateTime postedAt(Job job) {
        return job.getPublishedAt() != null ? job.getPublishedAt() : job.getCreatedAt();
    }

    private static Job.DisplayTier tierOf(Job job) {
        return job.getDisplayTier() == null ? Job.DisplayTier.basic : job.getDisplayTier();
    }

    private record RankGroup(Job.DisplayTier tier, LocalDate postedOn) {
        static RankGroup of(Job job) {
            LocalDateTime posted = postedAt(job);
            return new RankGroup(tierOf(job), posted == null ? null : posted.toLocalDate());
        }
    }

    private Map<Integer, Long> countApplications(List<Integer> jobIds) {
        if (jobIds.isEmpty()) {
            return Map.of();
        }

        return applicationRepository.countByJobIds(jobIds)
                .stream()
                .collect(Collectors.toMap(
                        ApplicationRepository.JobApplicationCount::getJobId,
                        ApplicationRepository.JobApplicationCount::getTotal));
    }

    // Chuyển Entity thành DTO để trả về frontend.
    private JobResponse toResponse(
            Job job,
            LocalDate today,
            long applicationCount) {
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
                tierOf(job).name(),
                postedAt(job),
                applicationCount,

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