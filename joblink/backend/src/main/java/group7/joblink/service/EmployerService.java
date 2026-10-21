package group7.joblink.service;

import group7.joblink.dto.request.EmployerRequests.CompanyUpdateRequest;
import group7.joblink.dto.request.EmployerRequests.EmployerJobRequest;
import group7.joblink.dto.response.EmployerResponses.*;
import group7.joblink.entity.*;
import group7.joblink.repository.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

// Nghiệp vụ khu vực nhà tuyển dụng: tổng quan, CRUD tin tuyển dụng của
// chính mình, quản lý đơn ứng tuyển, tìm kiếm ứng viên (gói trả phí),
// hồ sơ công ty, đánh giá & phản hồi, gói dịch vụ + ví Token.
// Mọi thao tác đều bị giới hạn trong các công ty thuộc sở hữu của nhà
// tuyển dụng đang đăng nhập (companies.owner_id).
@Service
public class EmployerService {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Set<String> EMPLOYER_JOB_STATUSES = Set.of("draft", "open", "closed");
    private static final int JOB_DISPLAY_DAYS_DEFAULT = 7;
    private static final int JOB_TOKEN_COST_DEFAULT = 20;

    private final EmployerJobRepository jobRepository;
    private final JobRepository publicJobRepository;
    private final CompanyRepository companyRepository;
    private final EmployerApplicationRepository applicationRepository;
    private final EmployerCandidateRepository candidateRepository;
    private final EmployerCompanyRepository employerCompanyRepository;
    private final EmployerReviewRepository reviewRepository;
    private final EmployerTokenRepository tokenRepository;
    private final EmployerImageStorageService imageStorage;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final TokenWalletRepository walletRepository;
    private final AdminSubscriptionRepository subscriptionRepository;
    private final ServicePackageRepository packageRepository;
    private final TokenPackageRepository tokenPackageRepository;
    private final OrderRepository orderRepository;

    public EmployerService(EmployerJobRepository jobRepository,
                           JobRepository publicJobRepository,
                           CompanyRepository companyRepository,
                           EmployerApplicationRepository applicationRepository,
                           EmployerCandidateRepository candidateRepository,
                           EmployerCompanyRepository employerCompanyRepository,
                           EmployerReviewRepository reviewRepository,
                           EmployerTokenRepository tokenRepository,
                           EmployerImageStorageService imageStorage,
                           ChatMessageRepository chatMessageRepository,
                           UserRepository userRepository,
                           TokenWalletRepository walletRepository,
                           AdminSubscriptionRepository subscriptionRepository,
                           ServicePackageRepository packageRepository,
                           TokenPackageRepository tokenPackageRepository,
                           OrderRepository orderRepository) {
        this.jobRepository = jobRepository;
        this.publicJobRepository = publicJobRepository;
        this.companyRepository = companyRepository;
        this.applicationRepository = applicationRepository;
        this.candidateRepository = candidateRepository;
        this.employerCompanyRepository = employerCompanyRepository;
        this.reviewRepository = reviewRepository;
        this.tokenRepository = tokenRepository;
        this.imageStorage = imageStorage;
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.packageRepository = packageRepository;
        this.tokenPackageRepository = tokenPackageRepository;
        this.orderRepository = orderRepository;
    }

    /* ---------------- Tổng quan ---------------- */

    // from/to: khoảng ngày cho biểu đồ "Phân tích tuyển dụng"
    // (null = 30 ngày gần nhất). Các thẻ số liệu luôn là tổng toàn cục.
    @Transactional(readOnly = true)
    public Dashboard getDashboard(int employerId, LocalDate from, LocalDate to) {
        PlanSnapshot plan = currentPlan(employerId);
        LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);
        LocalDate today = now.toLocalDate();
        if (from == null || to == null) {
            to = today;
            from = today.minusDays(29);
        }
        if (from.isAfter(to)) {
            throw badRequest("Ngày bắt đầu không được sau ngày kết thúc.");
        }
        if (from.plusDays(366).isBefore(to)) {
            throw badRequest("Khoảng ngày cho biểu đồ tối đa là 1 năm.");
        }

        List<RecentApplication> recent = applicationRepository
                .findRecentRows(employerId, 5).stream()
                .map(r -> new RecentApplication(toInt(r[0]), toInt(r[1]), str(r[2]),
                        str(r[3]), str(r[4]), str(r[5]), toDateTime(r[6])))
                .toList();

        // Tin đang hoạt động (status open), tối đa 5 tin mới nhất.
        List<Integer> ownIds = jobRepository.findOwnJobIds(employerId);
        Map<Integer, Job> jobsById = new HashMap<>();
        publicJobRepository.findAllById(ownIds).forEach(j -> jobsById.put(j.getId(), j));
        Map<Integer, Long> applicantsByJob = countMap(
                applicationRepository.countByJobIds(ownIds.isEmpty() ? List.of(-1) : ownIds));
        Map<Integer, Long> newByJob = countMap(applicationRepository
                .countNewByJobIds(ownIds.isEmpty() ? List.of(-1) : ownIds, now.minusDays(7)));
        List<ActiveJob> activeJobs = ownIds.stream()
                .map(jobsById::get)
                .filter(j -> j != null && j.getStatus() != null
                        && "open".equals(j.getStatus().name()))
                .limit(5)
                .map(j -> new ActiveJob(j.getId(), j.getTitle(), j.getDeadline(),
                        applicantsByJob.getOrDefault(j.getId(), 0L),
                        newByJob.getOrDefault(j.getId(), 0L)))
                .toList();

        // Số đơn theo ngày trong khoảng đã chọn (ngày không có đơn = 0).
        Map<String, Long> byDay = new HashMap<>();
        for (Object[] r : applicationRepository.countByDay(
                employerId, from.atStartOfDay())) {
            byDay.put(r[0].toString(), toLong(r[1]));
        }
        List<DayCount> series = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            series.add(new DayCount(d.toString(), byDay.getOrDefault(d.toString(), 0L)));
        }

        // Công ty chính: tên + độ hoàn thiện hồ sơ.
        String companyName = null;
        int completeness = 0;
        Optional<Company> mainCompany = companyRepository.findFirstByOwnerId(employerId);
        if (mainCompany.isPresent()) {
            companyName = mainCompany.get().getName();
            completeness = companyCompleteness(mainCompany.get().getId());
        }

        return new Dashboard(
                jobRepository.countJobsForEmployer(employerId),
                jobRepository.countJobsForEmployerByStatus(employerId, "open"),
                applicationRepository.countAllForEmployer(employerId),
                applicationRepository.countNewForEmployer(employerId, now.minusDays(7)),
                applicationRepository.countForEmployerByStatus(employerId, "pending"),
                applicationRepository.countForEmployerByStatus(employerId, "invited"),
                walletBalance(employerId),
                plan.tier(),
                plan.pkg() == null ? null : plan.pkg().getName(),
                plan.endsAt(),
                chatMessageRepository.countUnreadForUser(employerId),
                companyName,
                completeness,
                recent,
                activeJobs,
                series
        );
    }

    @Transactional(readOnly = true)
    public List<CompanyOption> getCompanies(int employerId) {
        return jobRepository.findOwnCompanies(employerId).stream()
                .map(r -> new CompanyOption(toInt(r[0]), str(r[1]), str(r[2])))
                .toList();
    }

    /* ---------------- Tin tuyển dụng ---------------- */

    @Transactional(readOnly = true)
    public List<EmployerJobRow> getJobs(int employerId) {
        List<Integer> ids = jobRepository.findOwnJobIds(employerId);
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<Integer, Job> byId = new HashMap<>();
        publicJobRepository.findAllById(ids).forEach(j -> byId.put(j.getId(), j));
        Map<Integer, Long> applicantsByJob = countMap(applicationRepository.countByJobIds(ids));
        Map<Integer, Long> newByJob = countMap(applicationRepository.countNewByJobIds(
                ids, LocalDateTime.now(VIETNAM_ZONE).minusDays(7)));
        Map<Integer, Integer[]> displayByJob = new HashMap<>();
        for (Object[] row : jobRepository.findDisplayInfo(ids)) {
            displayByJob.put(toInt(row[0]),
                    new Integer[]{toInt(row[1]), row[2] == null ? null : toInt(row[2])});
        }
        return ids.stream()
                .map(id -> toJobRow(byId.get(id),
                        applicantsByJob.getOrDefault(id, 0L),
                        newByJob.getOrDefault(id, 0L),
                        displayByJob.get(id)))
                .toList();
    }

    @Transactional(readOnly = true)
    public EmployerJobRow getJob(int employerId, int jobId) {
        Job job = requireOwnJob(employerId, jobId);
        Map<Integer, Integer[]> displayByJob = new HashMap<>();
        for (Object[] row : jobRepository.findDisplayInfo(List.of(jobId))) {
            displayByJob.put(toInt(row[0]),
                    new Integer[]{toInt(row[1]), row[2] == null ? null : toInt(row[2])});
        }
        long newCount = countMap(applicationRepository.countNewByJobIds(
                List.of(jobId), LocalDateTime.now(VIETNAM_ZONE).minusDays(7)))
                .getOrDefault(jobId, 0L);
        return toJobRow(job, applicationRepository.countByJobId(jobId), newCount,
                displayByJob.get(jobId));
    }

    @Transactional
    public EmployerJobRow createJob(int employerId, EmployerJobRequest req) {
        validateJobRequest(req);
        if (jobRepository.countOwnedCompany(req.companyId(), employerId) == 0) {
            throw forbidden("Công ty đăng tin không thuộc sở hữu của bạn.");
        }
        boolean priority = isPriorityPlan(currentPlan(employerId).tier());
        jobRepository.insertJob(req.companyId(), req.title().trim(),
                req.description(), req.requirements(),
                req.salaryMin(), req.salaryMax(),
                req.salaryUnit() == null ? "month" : req.salaryUnit(),
                req.location(), req.jobType(),
                req.level() == null ? null : req.level().toLowerCase(Locale.ROOT),
                req.vacancies() == null ? 1 : req.vacancies(),
                req.workingSchedule(), req.deadline(),
                req.status() == null ? "open" : req.status(),
                priority, priority,
                req.displayDays() == null ? JOB_DISPLAY_DAYS_DEFAULT : req.displayDays(),
                req.tokenCost() == null ? JOB_TOKEN_COST_DEFAULT : req.tokenCost());
        long newId = jobRepository.lastInsertId();
        return getJob(employerId, (int) newId);
    }

    @Transactional
    public EmployerJobRow updateJob(int employerId, int jobId, EmployerJobRequest req) {
        requireOwnJob(employerId, jobId);
        validateJobRequest(req);
        jobRepository.updateJob(jobId, req.title().trim(),
                req.description(), req.requirements(),
                req.salaryMin(), req.salaryMax(),
                req.salaryUnit() == null ? "month" : req.salaryUnit(),
                req.location(), req.jobType(),
                req.level() == null ? null : req.level().toLowerCase(Locale.ROOT),
                req.vacancies() == null ? 1 : req.vacancies(),
                req.workingSchedule(), req.deadline(),
                req.status() == null ? "open" : req.status());
        return getJob(employerId, jobId);
    }

    @Transactional
    public void setJobStatus(int employerId, int jobId, String status) {
        requireOwnJob(employerId, jobId);
        if (status == null || !EMPLOYER_JOB_STATUSES.contains(status)) {
            throw badRequest("Trạng thái tin không hợp lệ (chỉ có draft, open, closed).");
        }
        jobRepository.updateJobStatus(jobId, status);
    }

    @Transactional
    public void deleteJob(int employerId, int jobId) {
        Job job = requireOwnJob(employerId, jobId);
        // Khóa ngoại của applications là ON DELETE CASCADE — xóa tin sẽ
        // xóa luôn mọi đơn ứng tuyển, nên chặn khi tin đã có đơn.
        if (applicationRepository.countByJobId(jobId) > 0) {
            throw conflict("Tin này đã có ứng viên ứng tuyển nên không xóa được. "
                    + "Hãy đóng tin (trạng thái closed) thay vì xóa.");
        }
        jobRepository.delete(job);
    }

    /* ---------------- Đơn ứng tuyển ---------------- */

    @Transactional(readOnly = true)
    public List<EmployerApplicationRow> getApplications(int employerId, int jobId) {
        requireOwnJob(employerId, jobId);
        return applicationRepository.findByJobIdOrderByAppliedAtDesc(jobId).stream()
                .map(this::toApplicationRow)
                .toList();
    }

    // Toàn bộ đơn trên mọi tin (trang Quản lý ứng viên), có bộ lọc.
    @Transactional(readOnly = true)
    public List<GlobalApplicationRow> getApplicationsGlobal(
            int employerId, Integer jobId, String status, String q) {
        if (jobId != null) {
            requireOwnJob(employerId, jobId);
        }
        String statusFilter = (status == null || status.isBlank()) ? null : status;
        return applicationRepository
                .findGlobalRows(employerId, jobId, statusFilter, q).stream()
                .map(r -> new GlobalApplicationRow(
                        toInt(r[0]), toInt(r[1]), str(r[2]), str(r[3]), str(r[4]),
                        str(r[5]), str(r[6]), str(r[7]), toDateTime(r[8]),
                        toInt(r[9]), str(r[10]),
                        splitCsv(str(r[11])), toLong(r[12])))
                .toList();
    }

    @Transactional(readOnly = true)
    public ApplicationSummary getApplicationSummary(int employerId) {
        return new ApplicationSummary(
                applicationRepository.countAllForEmployer(employerId),
                applicationRepository.countForEmployerByStatus(employerId, "pending"),
                applicationRepository.countForEmployerByStatus(employerId, "viewed"),
                applicationRepository.countForEmployerByStatus(employerId, "invited"),
                applicationRepository.countForEmployerByStatus(employerId, "rejected"),
                applicationRepository.countForEmployerByStatus(employerId, "hired"));
    }

    @Transactional(readOnly = true)
    public ApplicationDetail getApplicationDetail(int employerId, int applicationId) {
        Application app = requireOwnApplication(employerId, applicationId);
        CandidateProfile profile = app.getCandidate();
        Job job = app.getJob();
        return new ApplicationDetail(
                app.getId(),
                app.getStatus().name(),
                app.getAppliedAt(),
                app.getCoverLetter(),
                profile.getUserId(),
                profile.getFullName(),
                userRepository.findById(profile.getUserId())
                        .map(User::getEmail).orElse(null),
                profile.getPhone(),
                profile.getAvatar(),
                profile.getSummary(),
                profile.getAddress(),
                app.getCv() == null ? null : app.getCv().getFileName(),
                app.getCv() == null ? null : app.getCv().getFileUrl(),
                job.getId(),
                job.getTitle(),
                job.getCompany() == null ? null : job.getCompany().getName()
        );
    }

    @Transactional
    public EmployerApplicationRow updateApplicationStatus(
            int employerId, int applicationId, String status) {
        Application app = requireOwnApplication(employerId, applicationId);
        Application.Status next;
        try {
            next = Application.Status.valueOf(status == null ? "" : status);
        } catch (IllegalArgumentException e) {
            throw badRequest("Trạng thái đơn không hợp lệ "
                    + "(pending, viewed, invited, rejected, hired).");
        }
        Application.Status current = app.getStatus();
        if (next != current) {
            applicationRepository.updateStatus(applicationId, next);
            applicationRepository.insertHistory(
                    applicationId, current.name(), next.name(), employerId);
        }
        return toApplicationRow(applicationRepository.findById(applicationId)
                .orElseThrow(() -> notFound("Không tìm thấy đơn ứng tuyển.")));
    }

    /* ---------------- Tìm kiếm ứng viên ---------------- */

    @Transactional(readOnly = true)
    public CandidateSearchResponse searchCandidates(
            int employerId, String q, String skill, String location) {
        PlanSnapshot plan = currentPlan(employerId);
        ServicePackage pkg = plan.pkg();
        if (pkg == null || !pkg.isCanSearchCandidates()) {
            throw forbidden("Tính năng Tìm kiếm ứng viên chỉ có ở gói Pro và Premium. "
                    + "Hãy nâng cấp gói để mở khóa kho hồ sơ ứng viên.");
        }
        boolean direct = pkg.isCanDirectContact();
        List<CandidateCard> items = candidateRepository
                .searchRows(employerId, q, skill, location).stream()
                .map(r -> new CandidateCard(
                        toInt(r[0]), str(r[1]), str(r[2]), str(r[3]), str(r[4]),
                        direct ? str(r[5]) : null,
                        direct ? str(r[6]) : null,
                        splitCsv(str(r[7])), toLong(r[8]),
                        r[9] == null ? null : new BigDecimal(r[9].toString()),
                        toLong(r[10]) > 0))
                .toList();
        long viewsUsed = plan.subscriptionId() == null ? 0
                : candidateRepository.countViews(plan.subscriptionId());
        return new CandidateSearchResponse(items, items.size(), viewsUsed,
                pkg.getCvViewLimit(), direct);
    }

    @Transactional
    public CandidateDetail getCandidateDetail(int employerId, int candidateId) {
        CandidateProfile profile = candidateRepository.findById(candidateId)
                .orElseThrow(() -> notFound("Không tìm thấy hồ sơ ứng viên."));
        boolean hasApplied = applicationRepository
                .countApplicationsFromCandidate(candidateId, employerId) > 0;
        if (!profile.isSearchable() && !hasApplied) {
            throw notFound("Không tìm thấy hồ sơ ứng viên.");
        }

        PlanSnapshot plan = currentPlan(employerId);
        ServicePackage pkg = plan.pkg();
        Integer viewsLimit = pkg == null ? null : pkg.getCvViewLimit();
        long viewsUsed = 0;

        // Xem qua đường tìm kiếm (không phải đơn ứng tuyển sẵn) thì phải
        // có quyền của gói và tính 1 lượt xem hồ sơ — mở lại hồ sơ đã
        // xem trong cùng lượt đăng ký thì không tính thêm.
        if (!hasApplied) {
            if (pkg == null || !pkg.isCanSearchCandidates()) {
                throw forbidden("Tính năng Tìm kiếm ứng viên chỉ có ở gói Pro và Premium. "
                        + "Hãy nâng cấp gói để mở khóa kho hồ sơ ứng viên.");
            }
            Integer subscriptionId = plan.subscriptionId();
            if (subscriptionId != null) {
                viewsUsed = candidateRepository.countViews(subscriptionId);
                boolean alreadyViewed =
                        candidateRepository.countViewOf(subscriptionId, candidateId) > 0;
                if (!alreadyViewed) {
                    if (viewsLimit != null && viewsUsed >= viewsLimit) {
                        throw forbidden("Bạn đã dùng hết " + viewsLimit
                                + " lượt xem hồ sơ của gói hiện tại.");
                    }
                    try {
                        candidateRepository.recordView(subscriptionId, candidateId, employerId);
                        viewsUsed++;
                    } catch (DataIntegrityViolationException ignored) {
                        // Đã có lượt xem (UNIQUE) — coi như đã xem.
                    }
                }
            }
        }

        boolean contactVisible = hasApplied
                || (pkg != null && pkg.isCanDirectContact());
        User user = userRepository.findById(candidateId).orElse(null);

        List<CandidateSkill> skills = candidateRepository.findSkills(candidateId).stream()
                .map(r -> new CandidateSkill(str(r[0]), str(r[1]),
                        r[2] == null ? null : new BigDecimal(r[2].toString())))
                .toList();
        List<CandidateCv> cvs = candidateRepository.findCvs(candidateId).stream()
                .map(r -> new CandidateCv(toInt(r[0]), str(r[1]), str(r[2]),
                        toLong(r[3]) > 0, toDateTime(r[4])))
                .toList();
        List<MyApplication> myApplications = candidateRepository
                .findMyApplications(candidateId, employerId).stream()
                .map(r -> new MyApplication(toInt(r[0]), str(r[1]), str(r[2]),
                        toDateTime(r[3])))
                .toList();
        List<SimilarCandidate> similar = candidateRepository.findSimilar(candidateId).stream()
                .map(r -> new SimilarCandidate(toInt(r[0]), str(r[1]), str(r[2]),
                        str(r[3]), splitCsv(str(r[4]))))
                .toList();

        return new CandidateDetail(
                candidateId,
                profile.getFullName(),
                profile.getAvatar(),
                profile.getAddress(),
                profile.getDob(),
                profile.getSummary(),
                contactVisible && user != null ? user.getEmail() : null,
                contactVisible ? profile.getPhone() : null,
                contactVisible,
                skills,
                cvs,
                myApplications,
                similar,
                viewsUsed,
                viewsLimit
        );
    }

    /* ---------------- Hồ sơ công ty ---------------- */

    @Transactional(readOnly = true)
    public CompanyProfile getCompanyProfile(int employerId, Integer companyId) {
        Integer id = resolveCompanyId(employerId, companyId);
        List<Object[]> rows = employerCompanyRepository.findProfileRow(id);
        if (rows.isEmpty()) {
            throw notFound("Không tìm thấy công ty.");
        }
        return toCompanyProfile(rows.get(0));
    }

    @Transactional
    public CompanyProfile updateCompanyProfile(
            int employerId, int companyId, CompanyUpdateRequest req) {
        if (req == null || req.name() == null || req.name().isBlank()) {
            throw badRequest("Vui lòng nhập tên công ty.");
        }
        if (jobRepository.countOwnedCompany(companyId, employerId) == 0) {
            throw forbidden("Công ty không thuộc sở hữu của bạn.");
        }
        employerCompanyRepository.updateProfile(companyId, employerId,
                req.name().trim(), req.legalName(), req.taxCode(), req.website(),
                req.industry(), req.size(), req.address(), req.description(),
                req.logo(), req.cover());
        return getCompanyProfile(employerId, companyId);
    }

    // Tải logo công ty lên từ máy tính: lưu file qua
    // EmployerImageStorageService, database giữ đường dẫn API của ảnh.
    @Transactional
    public CompanyProfile uploadCompanyLogo(int employerId, int companyId,
                                            MultipartFile file) {
        if (jobRepository.countOwnedCompany(companyId, employerId) == 0) {
            throw forbidden("Công ty không thuộc sở hữu của bạn.");
        }
        String storageName = imageStorage.store(file);
        String logoUrl = "/api/employer/company-images/" + storageName;
        employerCompanyRepository.updateLogo(companyId, employerId, logoUrl);
        return getCompanyProfile(employerId, companyId);
    }

    // Tải ảnh bìa công ty lên từ máy tính — cùng cơ chế lưu trữ với
    // logo, đường dẫn API được giữ trong companies.cover (V12).
    @Transactional
    public CompanyProfile uploadCompanyCover(int employerId, int companyId,
                                             MultipartFile file) {
        if (jobRepository.countOwnedCompany(companyId, employerId) == 0) {
            throw forbidden("Công ty không thuộc sở hữu của bạn.");
        }
        String storageName = imageStorage.store(file);
        String coverUrl = "/api/employer/company-images/" + storageName;
        employerCompanyRepository.updateCover(companyId, employerId, coverUrl);
        return getCompanyProfile(employerId, companyId);
    }

    // companyId trống = công ty đầu tiên của nhà tuyển dụng.
    private Integer resolveCompanyId(int employerId, Integer companyId) {
        if (companyId != null) {
            if (jobRepository.countOwnedCompany(companyId, employerId) == 0) {
                throw forbidden("Công ty không thuộc sở hữu của bạn.");
            }
            return companyId;
        }
        return companyRepository.findFirstByOwnerId(employerId)
                .map(Company::getId)
                .orElseThrow(() -> notFound(
                        "Tài khoản chưa sở hữu công ty nào trong hệ thống."));
    }

    private int companyCompleteness(int companyId) {
        List<Object[]> rows = employerCompanyRepository.findProfileRow(companyId);
        if (rows.isEmpty()) {
            return 0;
        }
        return completenessOf(rows.get(0));
    }

    // % hoàn thiện = tỷ lệ trường đã điền trong 9 trường hồ sơ
    // (tên, pháp danh, mã số thuế, website, lĩnh vực, quy mô,
    //  địa chỉ, giới thiệu, logo).
    private int completenessOf(Object[] row) {
        int filled = 0;
        for (int i = 1; i <= 9; i++) {
            Object v = row[i];
            if (v != null && !v.toString().isBlank()) {
                filled++;
            }
        }
        return Math.round(filled * 100f / 9f);
    }

    private CompanyProfile toCompanyProfile(Object[] r) {
        return new CompanyProfile(
                toInt(r[0]), str(r[1]), str(r[2]), str(r[3]), str(r[4]),
                str(r[5]), str(r[6]), str(r[7]), str(r[8]), str(r[9]),
                str(r[10]), str(r[11]), completenessOf(r));
    }

    /* ---------------- Đánh giá & phản hồi ---------------- */

    @Transactional(readOnly = true)
    public ReviewsResponse getReviews(int employerId) {
        List<ReviewRow> reviews = reviewRepository.findReviewRows(employerId).stream()
                .map(r -> new ReviewRow(
                        toInt(r[0]), toInt(r[1]), str(r[2]), toInt(r[3]),
                        str(r[4]), str(r[5]), toInt(r[6]), str(r[7]), str(r[8]),
                        toDateTime(r[9]), str(r[10]), toDateTime(r[11])))
                .toList();

        long total = reviews.size();
        double average = total == 0 ? 0
                : Math.round(reviews.stream().mapToInt(ReviewRow::rating)
                             .average().orElse(0) * 10) / 10.0;
        Map<Integer, Long> dist = new HashMap<>();
        for (Object[] r : reviewRepository.countByRating(employerId)) {
            dist.put(toInt(r[0]), toLong(r[1]));
        }
        List<DayCount> distribution = new ArrayList<>();
        long positive = 0;
        for (int star = 5; star >= 1; star--) {
            long c = dist.getOrDefault(star, 0L);
            distribution.add(new DayCount(String.valueOf(star), c));
            if (star >= 4) {
                positive += c;
            }
        }
        long replied = reviewRepository.countReplied(employerId);
        ReviewStats stats = new ReviewStats(
                total,
                average,
                total == 0 ? 0 : Math.round(replied * 100.0 / total),
                total == 0 ? 0 : Math.round(positive * 100.0 / total),
                distribution);
        return new ReviewsResponse(stats, reviews);
    }

    @Transactional
    public ReviewsResponse replyToReview(int employerId, int reviewId, String content) {
        if (content == null || content.isBlank()) {
            throw badRequest("Vui lòng nhập nội dung phản hồi.");
        }
        if (reviewRepository.countOwnReview(reviewId, employerId) == 0) {
            throw notFound("Không tìm thấy đánh giá thuộc công ty của bạn.");
        }
        reviewRepository.insertReply(reviewId, employerId, content.trim());
        return getReviews(employerId);
    }

    /* ---------------- Gói dịch vụ + ví Token ---------------- */

    @Transactional(readOnly = true)
    public PlanInfo getPlan(int employerId) {
        PlanSnapshot plan = currentPlan(employerId);
        ServicePackage pkg = plan.pkg();
        return new PlanInfo(
                plan.tier(),
                pkg == null ? null : pkg.getId(),
                pkg == null ? null : pkg.getName(),
                pkg == null ? null : pkg.getPrice(),
                pkg == null ? null : pkg.getDurationDays(),
                pkg == null ? null : pkg.getJobPostLimit(),
                pkg == null ? null : pkg.getCvViewLimit(),
                pkg == null ? null : pkg.getIncludedTokens(),
                pkg != null && pkg.isCanHighlightJobs(),
                pkg != null && pkg.isCanPrioritizeJobs(),
                pkg != null && pkg.isCanSearchCandidates(),
                pkg != null && pkg.isCanDirectContact(),
                plan.endsAt(),
                walletBalance(employerId)
        );
    }

    @Transactional(readOnly = true)
    public PackagesResponse getPackages(int employerId) {
        List<PackageCard> packages = packageRepository.findAll().stream()
                .filter(ServicePackage::isActive)
                .sorted(Comparator.comparing(
                        ServicePackage::getPrice,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .map(p -> new PackageCard(p.getId(), p.getName(), p.getPrice(),
                        p.getDurationDays(), p.getJobPostLimit(), p.getCvViewLimit(),
                        p.getIncludedTokens(), p.isCanHighlightJobs(),
                        p.isCanPrioritizeJobs(), p.isCanSearchCandidates(),
                        p.isCanDirectContact()))
                .toList();
        List<TokenPackageCard> tokenPackages = tokenPackageRepository.findAll().stream()
                .filter(TokenPackage::isActive)
                .sorted(Comparator.comparing(
                        TokenPackage::getTokens,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                // Bảng token_packages không có cột tên — tên hiển thị
                // ghép từ số Token, giống cách khu vực admin trình bày.
                .map(t -> new TokenPackageCard(t.getId(),
                        "Gói " + t.getTokens() + " Token", t.getTokens(),
                        t.getPrice()))
                .toList();
        return new PackagesResponse(currentPlan(employerId).tier(), packages, tokenPackages);
    }

    @Transactional(readOnly = true)
    public List<SubscriptionRow> getSubscriptionHistory(int employerId) {
        LocalDateTime now = LocalDateTime.now();
        return subscriptionRepository.findAll().stream()
                .filter(s -> employerId == s.getEmployerId())
                .sorted(Comparator.comparing(Subscription::getStartAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(s -> {
                    Order order = orderRepository.findById(s.getOrderId()).orElse(null);
                    String packageName = packageRepository.findById(s.getPackageId())
                            .map(ServicePackage::getName).orElse(null);
                    String status;
                    if (s.getStatus() == Subscription.Status.cancelled) {
                        status = "cancelled";
                    } else if (s.getEndAt() != null && !s.getEndAt().isAfter(now)) {
                        status = "expired";
                    } else {
                        status = "active";
                    }
                    return new SubscriptionRow(
                            order == null ? null : order.getOrderCode(),
                            packageName,
                            s.getStartAt(),
                            s.getEndAt(),
                            order == null ? null : order.getTotalAmount(),
                            status);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public WalletInfo getWallet(int employerId) {
        List<TokenTxnRow> transactions = tokenRepository
                .findRecentTransactions(employerId, 30).stream()
                .map(r -> new TokenTxnRow(toInt(r[0]), str(r[1]), toInt(r[2]),
                        toInt(r[3]), str(r[4]), toInt(r[5]), toDateTime(r[6])))
                .toList();
        return new WalletInfo(walletBalance(employerId), transactions);
    }

    /* ---------------- Hỗ trợ ---------------- */

    // Gói hiện tại của nhà tuyển dụng: lượt đăng ký còn hiệu lực thuộc
    // gói cao nhất (premium > pro > basic); không có = Basic mặc định.
    private PlanSnapshot currentPlan(int employerId) {
        LocalDateTime now = LocalDateTime.now();
        String tier = "basic";
        ServicePackage best = packageRepository.findByName("Basic").orElse(null);
        LocalDateTime endsAt = null;
        Integer subscriptionId = null;
        int bestRank = 1;
        List<Subscription> active = subscriptionRepository
                .findByEmployerIdAndStatus(employerId, Subscription.Status.active);
        for (Subscription sub : active) {
            if (sub.getEndAt() == null || !sub.getEndAt().isAfter(now)) {
                continue;
            }
            ServicePackage pkg = packageRepository.findById(sub.getPackageId()).orElse(null);
            if (pkg == null || !pkg.isActive()) {
                continue;
            }
            String t = "Premium".equals(pkg.getName()) ? "premium"
                    : pkg.isCanPrioritizeJobs() ? "pro" : "basic";
            int rank = t.equals("premium") ? 3 : t.equals("pro") ? 2 : 1;
            if (rank > bestRank
                    || (rank == bestRank && (endsAt == null || sub.getEndAt().isAfter(endsAt)))) {
                bestRank = rank;
                tier = t;
                best = pkg;
                endsAt = sub.getEndAt();
                subscriptionId = sub.getId();
            }
        }
        return new PlanSnapshot(tier, best, endsAt, subscriptionId);
    }

    private record PlanSnapshot(String tier, ServicePackage pkg, LocalDateTime endsAt,
                                Integer subscriptionId) {
    }

    private static boolean isPriorityPlan(String tier) {
        return "pro".equals(tier) || "premium".equals(tier);
    }

    private Integer walletBalance(int employerId) {
        return walletRepository.findById(employerId)
                .map(TokenWallet::getBalance).orElse(0);
    }

    private Job requireOwnJob(int employerId, int jobId) {
        Job job = publicJobRepository.findById(jobId)
                .orElseThrow(() -> notFound("Không tìm thấy tin tuyển dụng."));
        Integer ownerId = job.getCompany() == null ? null
                : companyRepository.findOwnerIdByCompanyId(job.getCompany().getId())
                  .orElse(null);
        if (ownerId == null || ownerId != employerId) {
            throw forbidden("Tin tuyển dụng không thuộc công ty của bạn.");
        }
        return job;
    }

    private Application requireOwnApplication(int employerId, int applicationId) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> notFound("Không tìm thấy đơn ứng tuyển."));
        requireOwnJob(employerId, app.getJob().getId());
        return app;
    }

    private void validateJobRequest(EmployerJobRequest req) {
        if (req == null || req.title() == null || req.title().isBlank()) {
            throw badRequest("Vui lòng nhập tên vị trí.");
        }
        if (req.companyId() == null) {
            throw badRequest("Vui lòng chọn công ty đăng tin.");
        }
        if (req.salaryUnit() != null
                && !Set.of("hour", "month", "project").contains(req.salaryUnit())) {
            throw badRequest("Đơn vị lương không hợp lệ.");
        }
        if (req.status() != null && !EMPLOYER_JOB_STATUSES.contains(req.status())) {
            throw badRequest("Trạng thái tin không hợp lệ (chỉ có draft, open, closed).");
        }
        if (req.salaryMin() != null && req.salaryMax() != null
                && req.salaryMin().compareTo(req.salaryMax()) > 0) {
            throw badRequest("Lương tối thiểu không được lớn hơn lương tối đa.");
        }
    }

    private EmployerJobRow toJobRow(Job job, long applicants, long newApplicants,
                                    Integer[] displayInfo) {
        if (job == null) {
            return null;
        }
        Integer displayDaysCol = displayInfo == null ? null : displayInfo[0];
        Integer tokenCostCol = displayInfo == null ? null : displayInfo[1];
        int displayDays = displayDaysCol == null ? JOB_DISPLAY_DAYS_DEFAULT : displayDaysCol;
        int tokenCost = tokenCostCol == null ? JOB_TOKEN_COST_DEFAULT : tokenCostCol;
        LocalDateTime createdAt = job.getCreatedAt();
        Company company = job.getCompany();
        return new EmployerJobRow(
                job.getId(),
                job.getTitle(),
                company == null ? null : company.getId(),
                company == null ? null : company.getName(),
                job.getSalaryMin(),
                job.getSalaryMax(),
                job.getSalaryUnit() == null ? null : job.getSalaryUnit().name(),
                salaryText(job.getSalaryMin(), job.getSalaryMax()),
                job.getLocation(),
                job.getLevel(),
                job.getJobType(),
                job.getWorkingSchedule(),
                job.getDeadline(),
                job.getDescription(),
                job.getRequirements(),
                job.getVacancies(),
                job.getStatus() == null ? null : job.getStatus().name(),
                displayDays,
                tokenCost,
                createdAt,
                createdAt == null ? null : createdAt.plusDays(displayDays),
                applicants,
                newApplicants
        );
    }

    private EmployerApplicationRow toApplicationRow(Application app) {
        CandidateProfile profile = app.getCandidate();
        return new EmployerApplicationRow(
                app.getId(),
                profile.getUserId(),
                profile.getFullName(),
                profile.getAvatar(),
                userRepository.findById(profile.getUserId())
                        .map(User::getEmail).orElse(null),
                app.getCv() == null ? null : app.getCv().getFileName(),
                app.getStatus().name(),
                app.getAppliedAt()
        );
    }

    // "25 – 40 triệu" từ salary_min/max (VNĐ) — giống cách admin trình bày.
    private String salaryText(BigDecimal min, BigDecimal max) {
        if (min == null && max == null) return "Thương lượng";
        long minM = min == null ? 0 : Math.round(min.doubleValue() / 1_000_000);
        long maxM = max == null ? 0 : Math.round(max.doubleValue() / 1_000_000);
        if (minM > 0 && maxM > 0) return minM + " – " + maxM + " triệu";
        return (maxM > 0 ? maxM : minM) + " triệu";
    }

    private static Map<Integer, Long> countMap(List<Object[]> rows) {
        Map<Integer, Long> map = new HashMap<>();
        for (Object[] r : rows) {
            map.put(toInt(r[0]), toLong(r[1]));
        }
        return map;
    }

    private static List<String> splitCsv(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    private static Integer toInt(Object value) {
        return value == null ? null : ((Number) value).intValue();
    }

    private static long toLong(Object value) {
        if (value == null) return 0L;
        // Cột BOOLEAN của MySQL có thể trả về Boolean thay vì số.
        if (value instanceof Boolean b) return b ? 1L : 0L;
        return ((Number) value).longValue();
    }

    private static String str(Object value) {
        return value == null ? null : value.toString();
    }

    private static LocalDateTime toDateTime(Object value) {
        if (value == null) return null;
        if (value instanceof LocalDateTime ldt) return ldt;
        if (value instanceof Timestamp ts) return ts.toLocalDateTime();
        if (value instanceof Date d) return d.toLocalDate().atStartOfDay();
        return LocalDateTime.parse(value.toString().replace(' ', 'T'));
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static ResponseStatusException forbidden(String message) {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, message);
    }

    private static ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }

    private static ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}