package group7.joblink.service;

import group7.joblink.dto.request.*;
import group7.joblink.dto.response.AdminResponses.*;
import group7.joblink.repository.AdminRepository;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.*;

// Nghiệp vụ khu vực admin: tổng quan, người dùng, tin tuyển dụng,
// báo cáo và gói dịch vụ. Controller gọi qua AdminAccess để chặn quyền trước.
@Service
public class AdminService {

    // Giá trị mặc định CHỈ dùng khi cột trong DB bị NULL — bình thường số ngày
    // hiển thị và Token mỗi tin đọc thẳng từ jobs.display_days / jobs.token_cost
    // (migration V7, mặc định 7 ngày / 20 Token theo bản thiết kế).
    public static final int JOB_DISPLAY_DAYS_DEFAULT = 7;
    public static final int JOB_TOKEN_COST_DEFAULT = 20;

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Set<String> ROLES = Set.of("candidate", "employer", "admin");
    private static final Set<String> USER_STATUSES = Set.of("active", "locked");
    private static final Set<String> JOB_STATUSES =
            Set.of("draft", "pending_review", "open", "closed", "rejected", "expired");
    private static final String DEFAULT_PASSWORD = "123456";

    private final AdminRepository repo;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AdminService(AdminRepository repo) {
        this.repo = repo;
    }

    /* ---------------- Tổng quan & báo cáo ---------------- */

    @Transactional(readOnly = true)
    public Overview getOverview() {
        YearMonth current = YearMonth.now(VIETNAM_ZONE);
        YearMonth previous = current.minusMonths(1);

        long newThisMonth = repo.countUsersCreatedBetween(startOf(current), startOf(current.plusMonths(1)));
        long newLastMonth = repo.countUsersCreatedBetween(startOf(previous), startOf(current));
        long jobsThisMonth = repo.countJobsCreatedBetween(startOf(current), startOf(current.plusMonths(1)));
        long jobsLastMonth = repo.countJobsCreatedBetween(startOf(previous), startOf(current));
        BigDecimal revenueThisMonth = repo.sumRevenueBetween(startOf(current), startOf(current.plusMonths(1)));
        BigDecimal revenueLastMonth = repo.sumRevenueBetween(startOf(previous), startOf(current));

        return new Overview(
                repo.countUsers(),
                growthPercent(newThisMonth, newLastMonth),
                repo.countJobs(),
                growthPercent(jobsThisMonth, jobsLastMonth),
                revenueThisMonth,
                growthPercent(revenueThisMonth, revenueLastMonth),
                repo.countUsersByStatus("locked"),
                monthlySeries(6),
                distribution()
        );
    }

    @Transactional(readOnly = true)
    public Report getReport(String period) {
        int months = switch (period == null ? "6months" : period) {
            case "month" -> 1;
            case "3months" -> 3;
            default -> 6;
        };
        return new Report(monthlySeries(months), distribution());
    }

    private List<MonthlyPoint> monthlySeries(int months) {
        YearMonth current = YearMonth.now(VIETNAM_ZONE);
        List<MonthlyPoint> result = new ArrayList<>();
        for (int i = months - 1; i >= 0; i--) {
            YearMonth ym = current.minusMonths(i);
            LocalDateTime from = startOf(ym);
            LocalDateTime to = startOf(ym.plusMonths(1));
            result.add(new MonthlyPoint(
                    "T" + ym.getMonthValue(),
                    "T" + ym.getMonthValue() + "/" + ym.getYear(),
                    repo.countUsersCreatedBetween(from, to),
                    repo.countJobsCreatedBetween(from, to),
                    repo.sumRevenueBetween(from, to)
            ));
        }
        return result;
    }

    private List<RoleSlice> distribution() {
        Map<String, Long> counts = new HashMap<>();
        for (Map<String, Object> row : repo.countUsersByRole()) {
            counts.put(String.valueOf(row.get("role")), toLong(row.get("cnt")));
        }
        long total = counts.values().stream().mapToLong(Long::longValue).sum();
        List<RoleSlice> result = new ArrayList<>();
        result.add(slice("candidate", "Ứng viên", counts.getOrDefault("candidate", 0L), total));
        result.add(slice("employer", "Nhà tuyển dụng", counts.getOrDefault("employer", 0L), total));
        result.add(slice("admin", "Quản trị viên", counts.getOrDefault("admin", 0L), total));
        return result;
    }

    private RoleSlice slice(String role, String label, long count, long total) {
        double percent = total == 0 ? 0 : Math.round(count * 1000.0 / total) / 10.0;
        return new RoleSlice(role, label, count, percent);
    }

    private static LocalDateTime startOf(YearMonth ym) {
        return ym.atDay(1).atStartOfDay();
    }

    private static double growthPercent(long current, long previous) {
        if (previous == 0) return current == 0 ? 0 : 100;
        return Math.round((current - previous) * 1000.0 / previous) / 10.0;
    }

    private static double growthPercent(BigDecimal current, BigDecimal previous) {
        if (previous.signum() == 0) return current.signum() == 0 ? 0 : 100;
        double value = current.subtract(previous).doubleValue() * 100.0 / previous.doubleValue();
        return Math.round(value * 10) / 10.0;
    }

    /* ---------------- Người dùng ---------------- */

    @Transactional(readOnly = true)
    public List<UserRow> getUsers() {
        return repo.findUsers().stream().map(row -> new UserRow(
                toInt(row.get("id")),
                str(row.get("full_name")),
                str(row.get("email")),
                str(row.get("role")),
                str(row.get("status")),
                toDateTime(row.get("created_at"))
        )).toList();
    }

    @Transactional
    public UserRow createUser(AdminUserRequest req) {
        String email = requireEmail(req.email());
        String role = requireRole(req.role());
        String fullName = requireText(req.fullName(), "Vui lòng nhập họ và tên.");
        if (repo.existsEmail(email, null)) {
            throw conflict("Email này đã được sử dụng.");
        }
        String rawPassword = req.password() == null || req.password().isBlank()
                ? DEFAULT_PASSWORD : req.password();
        if (rawPassword.length() < 6) {
            throw badRequest("Mật khẩu cần ít nhất 6 ký tự.");
        }
        int id = repo.insertUser(email, passwordEncoder.encode(rawPassword), role);
        if ("candidate".equals(role)) {
            repo.insertCandidateProfile(id, fullName);
        } else if ("employer".equals(role)) {
            // Nhà tuyển dụng chưa có công ty: tên hiển thị tạm lấy từ họ tên,
            // lưu ở companies khi họ tạo công ty. Ở đây giữ qua profile dự phòng:
            // không có bảng employer_profiles nên bỏ qua — tên sẽ lấy từ email
            // cho tới khi công ty được tạo. (Xem README mục giới hạn.)
        }
        return findUserRow(id);
    }

    @Transactional
    public UserRow updateUser(int id, AdminUserRequest req) {
        ensureUserExists(id);
        String email = requireEmail(req.email());
        String role = requireRole(req.role());
        String fullName = requireText(req.fullName(), "Vui lòng nhập họ và tên.");
        if (repo.existsEmail(email, id)) {
            throw conflict("Email này đã được sử dụng.");
        }
        repo.updateUser(id, email, role);
        repo.updateDisplayName(id, role, fullName);
        return findUserRow(id);
    }

    @Transactional
    public void setUserStatus(int id, String status) {
        ensureUserExists(id);
        if (status == null || !USER_STATUSES.contains(status)) {
            throw badRequest("Trạng thái tài khoản không hợp lệ.");
        }
        repo.setUserStatus(id, status);
    }

    @Transactional
    public void deleteUser(int id) {
        ensureUserExists(id);
        try {
            repo.deleteUser(id);
        } catch (DataIntegrityViolationException e) {
            throw conflict("Tài khoản đã có dữ liệu liên quan (đơn hàng, tin đăng, ứng tuyển...) "
                    + "nên không xóa được. Hãy khóa tài khoản thay vì xóa.");
        }
    }

    private UserRow findUserRow(int id) {
        return getUsers().stream()
                .filter(u -> u.id() == id)
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy người dùng."));
    }

    private void ensureUserExists(int id) {
        if (!repo.userExists(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng.");
        }
    }

    /* ---------------- Tin tuyển dụng ---------------- */

    @Transactional(readOnly = true)
    public List<JobRow> getJobs() {
        return repo.findJobs().stream().map(this::toJobRow).toList();
    }

    @Transactional(readOnly = true)
    public List<CompanyRow> getCompanies() {
        return repo.findCompanies().stream().map(row -> new CompanyRow(
                toInt(row.get("id")),
                str(row.get("name")),
                str(row.get("industry"))
        )).toList();
    }

    @Transactional
    public void createJob(AdminJobRequest req, int adminId) {
        String title = requireText(req.title(), "Vui lòng nhập tên vị trí.");
        if (req.companyId() == null) {
            throw badRequest("Vui lòng chọn công ty đăng tin.");
        }
        if (!repo.companyExists(req.companyId())) {
            throw badRequest("Công ty đăng tin không tồn tại.");
        }
        String status = req.status() == null ? "open" : req.status();
        if (!JOB_STATUSES.contains(status)) {
            throw badRequest("Trạng thái tin tuyển dụng không hợp lệ.");
        }
        String salaryUnit = req.salaryUnit() == null ? "month" : req.salaryUnit();
        if (!Set.of("hour", "month", "project").contains(salaryUnit)) {
            throw badRequest("Đơn vị lương không hợp lệ.");
        }
        repo.insertJob(req.companyId(), title, req.description(),
                req.salaryMin(), req.salaryMax(), salaryUnit,
                req.location(), req.jobType(),
                req.level() == null ? null : req.level().toLowerCase(Locale.ROOT),
                req.workingSchedule(), req.deadline(), status,
                req.displayDays(), req.tokenCost(), adminId);
        if (req.industry() != null && !req.industry().isBlank()) {
            repo.updateCompanyIndustry(req.companyId(), req.industry());
        }
    }

    @Transactional
    public JobRow updateJob(int id, AdminJobRequest req, int adminId) {
        Map<String, Object> existing = findJobOrThrow(id);
        String title = requireText(req.title(), "Vui lòng nhập tên vị trí.");
        String status = req.status() == null ? str(existing.get("status")) : req.status();
        if (!JOB_STATUSES.contains(status)) {
            throw badRequest("Trạng thái tin tuyển dụng không hợp lệ.");
        }
        String salaryUnit = req.salaryUnit() == null ? "month" : req.salaryUnit();
        if (!Set.of("hour", "month", "project").contains(salaryUnit)) {
            throw badRequest("Đơn vị lương không hợp lệ.");
        }
        repo.updateJob(id, title, req.description(), req.salaryMin(), req.salaryMax(),
                salaryUnit, req.location(), req.jobType(),
                req.level() == null ? null : req.level().toLowerCase(Locale.ROOT),
                req.workingSchedule(), req.deadline(), status, adminId);
        if (req.industry() != null && !req.industry().isBlank()) {
            repo.updateCompanyIndustry(toInt(existing.get("company_id")), req.industry());
        }
        return toJobRow(findJobOrThrow(id));
    }

    @Transactional
    public void setJobStatus(int id, String status, int adminId) {
        findJobOrThrow(id);
        if (status == null || !JOB_STATUSES.contains(status)) {
            throw badRequest("Trạng thái tin tuyển dụng không hợp lệ.");
        }
        repo.setJobStatus(id, status, adminId);
    }

    @Transactional
    public void deleteJob(int id) {
        findJobOrThrow(id);
        try {
            repo.deleteJob(id);
        } catch (DataIntegrityViolationException e) {
            throw conflict("Tin này đã có dữ liệu liên quan nên không xóa được. "
                    + "Hãy chuyển trạng thái sang Tạm dừng hoặc Hết hạn.");
        }
    }

    @Transactional(readOnly = true)
    public List<ApplicationRow> getJobApplications(int jobId) {
        findJobOrThrow(jobId);
        return repo.findApplications(jobId).stream().map(row -> new ApplicationRow(
                toInt(row.get("id")),
                str(row.get("candidate_name")),
                str(row.get("candidate_email")),
                str(row.get("status")),
                toDateTime(row.get("applied_at"))
        )).toList();
    }

    private Map<String, Object> findJobOrThrow(int id) {
        List<Map<String, Object>> rows = repo.findJob(id);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tin tuyển dụng.");
        }
        return rows.get(0);
    }

    private JobRow toJobRow(Map<String, Object> row) {
        LocalDateTime createdAt = toDateTime(row.get("created_at"));
        BigDecimal min = toDecimal(row.get("salary_min"));
        BigDecimal max = toDecimal(row.get("salary_max"));
        Integer displayDaysCol = toIntOrNull(row.get("display_days"));
        Integer tokenCostCol = toIntOrNull(row.get("token_cost"));
        int displayDays = displayDaysCol == null ? JOB_DISPLAY_DAYS_DEFAULT : displayDaysCol;
        int tokenCost = tokenCostCol == null ? JOB_TOKEN_COST_DEFAULT : tokenCostCol;
        return new JobRow(
                toInt(row.get("id")),
                str(row.get("title")),
                str(row.get("company_name")),
                min, max,
                str(row.get("salary_unit")),
                salaryText(min, max),
                str(row.get("location")),
                str(row.get("industry")),
                str(row.get("level")),
                str(row.get("job_type")),
                str(row.get("working_schedule")),
                toDate(row.get("deadline")),
                str(row.get("description")),
                str(row.get("status")),
                displayDays,
                tokenCost,
                createdAt,
                createdAt == null ? null : createdAt.plusDays(displayDays),
                row.get("employer_wallet_balance") == null
                        ? null : toInt(row.get("employer_wallet_balance")),
                toLong(row.get("applicants"))
        );
    }

    // "25 – 40 triệu" từ salary_min/max (VNĐ) — giống cách frontend trình bày.
    private String salaryText(BigDecimal min, BigDecimal max) {
        if (min == null && max == null) return "Thương lượng";
        long minM = min == null ? 0 : Math.round(min.doubleValue() / 1_000_000);
        long maxM = max == null ? 0 : Math.round(max.doubleValue() / 1_000_000);
        if (minM > 0 && maxM > 0) return minM + " – " + maxM + " triệu";
        return (maxM > 0 ? maxM : minM) + " triệu";
    }

    /* ---------------- Gói dịch vụ ---------------- */

    @Transactional(readOnly = true)
    public Packages getPackages() {
        List<PackageRow> packages = repo.findPackages().stream().map(row -> new PackageRow(
                toInt(row.get("id")),
                str(row.get("name")),
                toDecimal(row.get("price")),
                toIntOrNull(row.get("duration_days")),
                toIntOrNull(row.get("job_post_limit")),
                toIntOrNull(row.get("cv_view_limit")),
                toInt(row.get("included_tokens")),
                toBool(row.get("can_highlight_jobs")),
                toBool(row.get("can_prioritize_jobs")),
                toBool(row.get("can_search_candidates")),
                toBool(row.get("can_direct_contact")),
                toBool(row.get("is_active")),
                toLong(row.get("active_subscriptions"))
        )).toList();

        List<TokenPackageRow> tokenPackages = repo.findTokenPackages().stream().map(row ->
                new TokenPackageRow(
                        toInt(row.get("id")),
                        toInt(row.get("tokens")),
                        toDecimal(row.get("price")),
                        toBool(row.get("is_active"))
                )).toList();

        List<PromotionRow> promotions = repo.findPromotions().stream().map(row -> new PromotionRow(
                toInt(row.get("id")),
                str(row.get("code")),
                str(row.get("discount_type")),
                toDecimal(row.get("discount_value")),
                toDecimal(row.get("min_order_amount")),
                toDecimal(row.get("max_discount_amount")),
                toDateTime(row.get("start_at")),
                toDateTime(row.get("end_at")),
                toIntOrNull(row.get("usage_limit")),
                toIntOrNull(row.get("per_user_limit")),
                toBool(row.get("is_active")),
                toLong(row.get("used_count"))
        )).toList();

        return new Packages(packages, tokenPackages, promotions);
    }

    @Transactional
    public void createPackage(AdminPackageRequest req) {
        validatePackage(req);
        repo.insertPackage(req.name().trim(), req.price(), req.durationDays(),
                req.jobPostLimit(), req.cvViewLimit(),
                req.includedTokens() == null ? 0 : req.includedTokens(),
                Boolean.TRUE.equals(req.canHighlightJobs()),
                Boolean.TRUE.equals(req.canPrioritizeJobs()),
                Boolean.TRUE.equals(req.canSearchCandidates()),
                Boolean.TRUE.equals(req.canDirectContact()),
                !Boolean.FALSE.equals(req.isActive()));
    }

    @Transactional
    public void updatePackage(int id, AdminPackageRequest req) {
        validatePackage(req);
        int updated = repo.updatePackage(id, req.name().trim(), req.price(), req.durationDays(),
                req.jobPostLimit(), req.cvViewLimit(),
                req.includedTokens() == null ? 0 : req.includedTokens(),
                Boolean.TRUE.equals(req.canHighlightJobs()),
                Boolean.TRUE.equals(req.canPrioritizeJobs()),
                Boolean.TRUE.equals(req.canSearchCandidates()),
                Boolean.TRUE.equals(req.canDirectContact()),
                !Boolean.FALSE.equals(req.isActive()));
        if (updated == 0) throw notFound("Không tìm thấy gói đăng ký.");
    }

    @Transactional
    public void deletePackage(int id) {
        try {
            repo.deletePackage(id);
        } catch (DataIntegrityViolationException e) {
            throw conflict("Gói này đã có nhà tuyển dụng sử dụng nên không xóa được. Hãy tắt gói thay vì xóa.");
        }
    }

    @Transactional
    public void createTokenPackage(AdminTokenPackageRequest req) {
        validateTokenPackage(req);
        repo.insertTokenPackage(req.tokens(), req.price(), !Boolean.FALSE.equals(req.isActive()));
    }

    @Transactional
    public void updateTokenPackage(int id, AdminTokenPackageRequest req) {
        validateTokenPackage(req);
        int updated = repo.updateTokenPackage(id, req.tokens(), req.price(),
                !Boolean.FALSE.equals(req.isActive()));
        if (updated == 0) throw notFound("Không tìm thấy gói Token.");
    }

    @Transactional
    public void deleteTokenPackage(int id) {
        try {
            repo.deleteTokenPackage(id);
        } catch (DataIntegrityViolationException e) {
            throw conflict("Gói Token này đã có đơn hàng nên không xóa được. Hãy tắt gói thay vì xóa.");
        }
    }

    @Transactional
    public void createPromotion(AdminPromotionRequest req) {
        validatePromotion(req);
        try {
            repo.insertPromotion(req.code().trim().toUpperCase(Locale.ROOT), req.discountType(),
                    req.discountValue(), req.minOrderAmount(), req.maxDiscountAmount(),
                    req.startAt(), req.endAt(), req.usageLimit(), req.perUserLimit(),
                    !Boolean.FALSE.equals(req.isActive()));
        } catch (DataIntegrityViolationException e) {
            throw conflict("Mã khuyến mãi này đã tồn tại.");
        }
    }

    @Transactional
    public void updatePromotion(int id, AdminPromotionRequest req) {
        validatePromotion(req);
        int updated;
        try {
            updated = repo.updatePromotion(id, req.code().trim().toUpperCase(Locale.ROOT),
                    req.discountType(), req.discountValue(), req.minOrderAmount(),
                    req.maxDiscountAmount(), req.startAt(), req.endAt(),
                    req.usageLimit(), req.perUserLimit(), !Boolean.FALSE.equals(req.isActive()));
        } catch (DataIntegrityViolationException e) {
            throw conflict("Mã khuyến mãi này đã tồn tại.");
        }
        if (updated == 0) throw notFound("Không tìm thấy khuyến mãi.");
    }

    @Transactional
    public void deletePromotion(int id) {
        repo.deletePromotion(id);
    }

    private void validatePackage(AdminPackageRequest req) {
        if (req.name() == null || req.name().isBlank()) throw badRequest("Vui lòng nhập tên gói.");
        if (req.price() == null || req.price().signum() < 0) throw badRequest("Giá gói chưa hợp lệ.");
        if (req.durationDays() == null || req.durationDays() <= 0) throw badRequest("Thời hạn gói phải lớn hơn 0 ngày.");
    }

    private void validateTokenPackage(AdminTokenPackageRequest req) {
        if (req.tokens() == null || req.tokens() <= 0) throw badRequest("Số Token phải lớn hơn 0.");
        if (req.price() == null || req.price().signum() < 0) throw badRequest("Giá gói chưa hợp lệ.");
    }

    private void validatePromotion(AdminPromotionRequest req) {
        if (req.code() == null || req.code().isBlank()) throw badRequest("Vui lòng nhập mã khuyến mãi.");
        if (!Set.of("percent", "fixed_amount").contains(
                req.discountType() == null ? "" : req.discountType())) {
            throw badRequest("Loại giảm giá không hợp lệ.");
        }
        if (req.discountValue() == null || req.discountValue().signum() <= 0) {
            throw badRequest("Mức giảm phải lớn hơn 0.");
        }
        if ("percent".equals(req.discountType()) && req.discountValue().doubleValue() > 100) {
            throw badRequest("Giảm theo phần trăm không được quá 100%.");
        }
        if (req.startAt() != null && req.endAt() != null && req.endAt().isBefore(req.startAt())) {
            throw badRequest("Ngày kết thúc phải sau ngày bắt đầu.");
        }
    }

    /* ---------------- Tiện ích ---------------- */

    private String requireEmail(String email) {
        String value = requireText(email, "Vui lòng nhập email.")
                .trim().toLowerCase(Locale.ROOT);
        if (!value.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw badRequest("Email chưa đúng định dạng.");
        }
        return value;
    }

    private String requireRole(String role) {
        if (role == null || !ROLES.contains(role)) {
            throw badRequest("Vai trò không hợp lệ.");
        }
        return role;
    }

    private String requireText(String value, String message) {
        if (value == null || value.isBlank()) throw badRequest(message);
        return value.trim();
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    private ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }

    static int toInt(Object v) {
        return v == null ? 0 : ((Number) v).intValue();
    }

    static Integer toIntOrNull(Object v) {
        return v == null ? null : ((Number) v).intValue();
    }

    static long toLong(Object v) {
        return v == null ? 0 : ((Number) v).longValue();
    }

    static boolean toBool(Object v) {
        if (v instanceof Boolean b) return b;
        return v != null && ((Number) v).intValue() != 0;
    }

    static String str(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    static BigDecimal toDecimal(Object v) {
        if (v == null) return null;
        if (v instanceof BigDecimal b) return b;
        return new BigDecimal(String.valueOf(v));
    }

    static LocalDateTime toDateTime(Object v) {
        if (v == null) return null;
        if (v instanceof LocalDateTime t) return t;
        if (v instanceof Timestamp t) return t.toLocalDateTime();
        return LocalDateTime.parse(String.valueOf(v).replace(' ', 'T'));
    }

    static LocalDate toDate(Object v) {
        if (v == null) return null;
        if (v instanceof LocalDate d) return d;
        if (v instanceof java.sql.Date d) return d.toLocalDate();
        return LocalDate.parse(String.valueOf(v));
    }
}
