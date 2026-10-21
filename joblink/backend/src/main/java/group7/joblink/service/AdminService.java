package group7.joblink.service;

import group7.joblink.dto.request.*;
import group7.joblink.dto.response.AdminResponses.*;
import group7.joblink.entity.CandidateProfile;
import group7.joblink.entity.Company;
import group7.joblink.entity.Job;
import group7.joblink.entity.Order;
import group7.joblink.entity.Promotion;
import group7.joblink.entity.ServicePackage;
import group7.joblink.entity.Subscription;
import group7.joblink.entity.TokenPackage;
import group7.joblink.entity.User;
import group7.joblink.repository.AdminCandidateProfileRepository;
import group7.joblink.repository.AdminJobRepository;
import group7.joblink.repository.AdminSocialAccountRepository;
import group7.joblink.repository.AdminSubscriptionRepository;
import group7.joblink.repository.AdminUserRepository;
import group7.joblink.repository.CompanyRepository;
import group7.joblink.repository.OrderRepository;
import group7.joblink.repository.PromotionRepository;
import group7.joblink.repository.ServicePackageRepository;
import group7.joblink.repository.TokenPackageRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

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
// Toàn bộ truy vấn đi qua các repository Spring Data JPA. Để không phải
// sửa file dùng chung của project, phần admin có các repository riêng
// (AdminUserRepository, AdminJobRepository...) trên cùng các entity sẵn có.
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
    private static final List<Order.Status> REVENUE_STATUSES =
            List.of(Order.Status.paid, Order.Status.fulfilled);

    private final AdminUserRepository userRepository;
    private final AdminCandidateProfileRepository profileRepository;
    private final AdminSocialAccountRepository socialAccountRepository;
    private final CompanyRepository companyRepository;
    private final AdminJobRepository jobRepository;
    private final OrderRepository orderRepository;
    private final ServicePackageRepository packageRepository;
    private final TokenPackageRepository tokenPackageRepository;
    private final PromotionRepository promotionRepository;
    private final AdminSubscriptionRepository subscriptionRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    // flush() chủ động sau các thao tác xóa/lưu có thể vi phạm khóa ngoại,
    // để bắt lỗi ngay trong method và trả thông báo thân thiện (409) —
    // nếu chờ tới lúc transaction commit thì lỗi đã nằm ngoài tầm tay.
    @PersistenceContext
    private EntityManager entityManager;

    public AdminService(AdminUserRepository userRepository,
                        AdminCandidateProfileRepository profileRepository,
                        AdminSocialAccountRepository socialAccountRepository,
                        CompanyRepository companyRepository,
                        AdminJobRepository jobRepository,
                        OrderRepository orderRepository,
                        ServicePackageRepository packageRepository,
                        TokenPackageRepository tokenPackageRepository,
                        PromotionRepository promotionRepository,
                        AdminSubscriptionRepository subscriptionRepository) {
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.socialAccountRepository = socialAccountRepository;
        this.companyRepository = companyRepository;
        this.jobRepository = jobRepository;
        this.orderRepository = orderRepository;
        this.packageRepository = packageRepository;
        this.tokenPackageRepository = tokenPackageRepository;
        this.promotionRepository = promotionRepository;
        this.subscriptionRepository = subscriptionRepository;
    }

    /* ---------------- Tổng quan & báo cáo ---------------- */

    // from/to = khoảng ngày admin chọn trên trang (yyyy-MM-dd).
    // Không chọn -> mặc định tháng hiện tại, tăng trưởng so với tháng trước,
    // biểu đồ 6 tháng — như hành vi ban đầu.
    // Có chọn -> thẻ Doanh thu và % tăng trưởng tính trong khoảng đã chọn,
    // so với khoảng liền trước có cùng độ dài; biểu đồ gom theo các tháng
    // nằm trong khoảng. Tổng người dùng / tin / tài khoản bị khóa luôn là
    // số hiện tại toàn hệ thống.
    @Transactional(readOnly = true)
    public Overview getOverview(LocalDate from, LocalDate to) {
        LocalDate today = LocalDate.now(VIETNAM_ZONE);
        // Có chọn khoảng ngày hay không: thẻ số liệu mặc định tính tháng
        // hiện tại, nhưng biểu đồ tăng trưởng mặc định phải đủ 6 tháng —
        // nếu lấy theo tháng hiện tại thì biểu đồ chỉ có 1 điểm, không
        // vẽ thành đường được.
        boolean explicitRange = from != null || to != null;
        LocalDate rangeFrom = from;
        LocalDate rangeTo = to;
        if (rangeFrom == null && rangeTo == null) {
            rangeFrom = today.withDayOfMonth(1);
            rangeTo = today;
        } else {
            if (rangeFrom == null) rangeFrom = rangeTo;
            if (rangeTo == null) rangeTo = rangeFrom;
        }
        if (rangeFrom.isAfter(rangeTo)) {
            throw badRequest("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
        }
        if (rangeFrom.isBefore(today.minusYears(5)) || rangeTo.isAfter(today.plusYears(1))) {
            throw badRequest("Khoảng ngày chọn quá xa, vui lòng chọn lại.");
        }

        LocalDateTime start = rangeFrom.atStartOfDay();
        LocalDateTime endExclusive = rangeTo.plusDays(1).atStartOfDay();
        long lengthDays = java.time.temporal.ChronoUnit.DAYS.between(start, endExclusive);
        LocalDateTime prevEnd = start;
        LocalDateTime prevStart = start.minusDays(lengthDays);

        long newInRange = userRepository
                .countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(start, endExclusive);
        long newInPrev = userRepository
                .countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(prevStart, prevEnd);
        long jobsInRange = jobRepository
                .countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(start, endExclusive);
        long jobsInPrev = jobRepository
                .countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(prevStart, prevEnd);
        BigDecimal revenueInRange = orderRepository
                .sumRevenueBetween(REVENUE_STATUSES, start, endExclusive);
        BigDecimal revenueInPrev = orderRepository
                .sumRevenueBetween(REVENUE_STATUSES, prevStart, prevEnd);

        return new Overview(
                userRepository.count(),
                growthPercent(newInRange, newInPrev),
                jobRepository.count(),
                growthPercent(jobsInRange, jobsInPrev),
                revenueInRange,
                growthPercent(revenueInRange, revenueInPrev),
                userRepository.countByStatus(User.Status.locked),
                explicitRange ? monthlySeries(rangeFrom, rangeTo) : monthlySeries(6),
                distribution()
        );
    }

    // period dùng khi không chọn ngày cụ thể: month | 3months | 6months.
    // Có from/to thì khoảng ngày thắng — biểu đồ trả đúng các tháng trong khoảng.
    @Transactional(readOnly = true)
    public Report getReport(String period, LocalDate from, LocalDate to) {
        if (from != null || to != null) {
            LocalDate today = LocalDate.now(VIETNAM_ZONE);
            LocalDate rangeTo = to == null ? from : to;
            LocalDate rangeFrom = from == null ? rangeTo : from;
            if (rangeFrom.isAfter(rangeTo)) {
                throw badRequest("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
            }
            if (rangeFrom.isBefore(today.minusYears(5)) || rangeTo.isAfter(today.plusYears(1))) {
                throw badRequest("Khoảng ngày chọn quá xa, vui lòng chọn lại.");
            }
            return new Report(monthlySeries(rangeFrom, rangeTo), distribution());
        }
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
            result.add(monthPoint(current.minusMonths(i), null, null));
        }
        return result;
    }

    // Gom số liệu theo từng tháng nằm trong [from, to]; mỗi tháng chỉ tính
    // phần giao với khoảng đã chọn (tháng đầu/cuối có thể bị cắt một phần).
    private List<MonthlyPoint> monthlySeries(LocalDate from, LocalDate to) {
        LocalDateTime rangeStart = from.atStartOfDay();
        LocalDateTime rangeEnd = to.plusDays(1).atStartOfDay();
        List<MonthlyPoint> result = new ArrayList<>();
        YearMonth ym = YearMonth.from(from);
        YearMonth last = YearMonth.from(to);
        while (!ym.isAfter(last)) {
            result.add(monthPoint(ym, rangeStart, rangeEnd));
            ym = ym.plusMonths(1);
        }
        return result;
    }

    private MonthlyPoint monthPoint(YearMonth ym, LocalDateTime clampFrom, LocalDateTime clampTo) {
        LocalDateTime from = startOf(ym);
        LocalDateTime to = startOf(ym.plusMonths(1));
        if (clampFrom != null && clampFrom.isAfter(from)) from = clampFrom;
        if (clampTo != null && clampTo.isBefore(to)) to = clampTo;
        return new MonthlyPoint(
                "T" + ym.getMonthValue(),
                "T" + ym.getMonthValue() + "/" + ym.getYear(),
                userRepository.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(from, to),
                jobRepository.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(from, to),
                orderRepository.sumRevenueBetween(REVENUE_STATUSES, from, to)
        );
    }

    private List<RoleSlice> distribution() {
        Map<String, Long> counts = new HashMap<>();
        for (Object[] row : userRepository.countByRole()) {
            counts.put(((User.Role) row[0]).name(), ((Number) row[1]).longValue());
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
        List<User> users = userRepository.findAllByOrderByIdAsc();
        // Ghép tên hiển thị hàng loạt: hồ sơ ứng viên + công ty sở hữu.
        Map<Integer, String> profileNames = new HashMap<>();
        for (CandidateProfile profile : profileRepository.findAll()) {
            profileNames.put(profile.getUserId(), profile.getFullName());
        }
        Map<Integer, String> companyNames = new HashMap<>();
        if (!users.isEmpty()) {
            List<Integer> ids = users.stream().map(User::getId).toList();
            for (Object[] row : companyRepository.findNamesByOwnerIds(ids)) {
                // Tên công ty đầu tiên của mỗi chủ sở hữu.
                companyNames.putIfAbsent(toInt(row[0]), str(row[1]));
            }
        }
        Map<Integer, String> planByEmployer = employerPlanMap();
        return users.stream()
                .map(u -> toUserRow(u, profileNames, companyNames, planByEmployer))
                .toList();
    }

    private UserRow toUserRow(User user, Map<Integer, String> profileNames,
                              Map<Integer, String> companyNames,
                              Map<Integer, String> planByEmployer) {
        // Gói dịch vụ chỉ áp dụng cho nhà tuyển dụng: không có lượt đăng
        // ký trả phí đang hiệu lực = đang dùng Basic (miễn phí, mặc định).
        String plan = null;
        if (user.getRole() == User.Role.employer) {
            plan = planByEmployer != null
                    ? planByEmployer.getOrDefault(user.getId(), "basic")
                    : employerPlanMap().getOrDefault(user.getId(), "basic");
        }
        return new UserRow(
                user.getId(),
                displayName(user, profileNames, companyNames),
                user.getEmail(),
                user.getRole().name(),
                user.getStatus().name(),
                user.getCreatedAt(),
                plan
        );
    }

    // Gói đang hiệu lực của từng nhà tuyển dụng: "premium" khi đăng ký
    // gói tên Premium, "pro" khi gói đăng ký có quyền ưu tiên tin đăng
    // (can_prioritize_jobs), ngược lại "basic". Một nhà có nhiều lượt
    // đăng ký hiệu lực thì lấy gói cao nhất (premium > pro > basic).
    private Map<Integer, String> employerPlanMap() {
        Map<Integer, String> map = new HashMap<>();
        for (Object[] row : subscriptionRepository.findActivePlans(LocalDateTime.now())) {
            Integer employerId = toInt(row[0]);
            boolean priority = row[2] instanceof Boolean b && b;
            String plan = "Premium".equals(str(row[1])) ? "premium"
                    : priority ? "pro" : "basic";
            String current = map.get(employerId);
            if (current == null || planRank(plan) > planRank(current)) {
                map.put(employerId, plan);
            }
        }
        return map;
    }

    private static int planRank(String plan) {
        return switch (plan) {
            case "premium" -> 3;
            case "pro" -> 2;
            default -> 1;
        };
    }

    // Gói trả phí (Pro / Premium) đều được ưu tiên + nổi bật tin đăng.
    private static boolean isPriorityPlan(String plan) {
        return "pro".equals(plan) || "premium".equals(plan);
    }

    // Tên hiển thị: ứng viên lấy từ candidate_profiles, nhà tuyển dụng lấy
    // tên công ty họ sở hữu, còn lại lấy phần trước @ của email.
    private String displayName(User user, Map<Integer, String> profileNames,
                               Map<Integer, String> companyNames) {
        String name = null;
        if (user.getRole() == User.Role.candidate) {
            name = profileNames != null
                    ? profileNames.get(user.getId())
                    : profileRepository.findById(user.getId())
                            .map(CandidateProfile::getFullName).orElse(null);
        } else if (user.getRole() == User.Role.employer) {
            name = companyNames != null
                    ? companyNames.get(user.getId())
                    : companyRepository.findFirstByOwnerId(user.getId())
                            .map(Company::getName).orElse(null);
        }
        if (name == null || name.isBlank()) {
            String email = user.getEmail();
            int at = email.indexOf('@');
            name = at > 0 ? email.substring(0, at) : email;
        }
        return name;
    }

    private UserRow findUserRow(int id) {
        User user = userRepository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng."));
        return toUserRow(user, null, null, null);
    }

    private User findUserOrThrow(int id) {
        return userRepository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng."));
    }

    @Transactional
    public UserRow createUser(AdminUserRequest req) {
        String email = requireEmail(req.email());
        String role = requireRole(req.role());
        String fullName = requireText(req.fullName(), "Vui lòng nhập họ và tên.");
        if (userRepository.existsByEmail(email)) {
            throw conflict("Email này đã được sử dụng.");
        }
        String rawPassword = req.password() == null || req.password().isBlank()
                ? DEFAULT_PASSWORD : req.password();
        if (rawPassword.length() < 6) {
            throw badRequest("Mật khẩu cần ít nhất 6 ký tự.");
        }
        User user = new User(email, User.Role.valueOf(role));
        // Trigger trg_users_after_insert tự tạo ví 20 Token cho user mới.
        user = userRepository.save(user);
        // Constructor của User không nhận mật khẩu nên đặt hash ngay sau đó.
        userRepository.updatePasswordHash(
                user.getId(), passwordEncoder.encode(rawPassword));
        if (user.getRole() == User.Role.candidate) {
            profileRepository.save(new CandidateProfile(user.getId(), fullName, null));
        }
        // Nhà tuyển dụng chưa có công ty: tên hiển thị tạm lấy từ email
        // cho tới khi công ty được tạo. (Xem README mục giới hạn.)
        return findUserRow(user.getId());
    }

    @Transactional
    public UserRow updateUser(int id, AdminUserRequest req) {
        User user = findUserOrThrow(id);
        String email = requireEmail(req.email());
        String role = requireRole(req.role());
        String fullName = requireText(req.fullName(), "Vui lòng nhập họ và tên.");
        if (userRepository.existsByEmailAndIdNot(email, id)) {
            throw conflict("Email này đã được sử dụng.");
        }
        userRepository.updateEmailAndRole(id, email, User.Role.valueOf(role));
        updateDisplayName(id, role, fullName);
        return findUserRow(id);
    }

    // Đổi tên hiển thị theo vai trò: ứng viên sửa candidate_profiles
    // (chưa có hồ sơ thì tạo), nhà tuyển dụng sửa tên công ty sở hữu.
    private void updateDisplayName(int userId, String role, String fullName) {
        if ("candidate".equals(role)) {
            int updated = profileRepository.updateFullName(userId, fullName);
            if (updated == 0) {
                profileRepository.save(new CandidateProfile(userId, fullName, null));
            }
        } else if ("employer".equals(role)) {
            companyRepository.updateNameByOwnerId(userId, fullName);
        }
    }

    // Admin đặt lại mật khẩu cho tài khoản bất kỳ. Tài khoản đăng nhập bằng
    // Google (password_hash đang NULL) cũng đặt được — sau đó đăng nhập bằng
    // mật khẩu vẫn cần API đăng nhập tương ứng ở phía auth.
    @Transactional
    public void changeUserPassword(int id, AdminPasswordRequest req) {
        findUserOrThrow(id);
        String raw = req == null ? null : req.newPassword();
        if (raw == null || raw.length() < 6) {
            throw badRequest("Mật khẩu mới cần ít nhất 6 ký tự.");
        }
        userRepository.updatePasswordHash(id, passwordEncoder.encode(raw));
    }

    @Transactional
    public void setUserStatus(int id, String status) {
        findUserOrThrow(id);
        if (status == null || !USER_STATUSES.contains(status)) {
            throw badRequest("Trạng thái tài khoản không hợp lệ.");
        }
        userRepository.updateStatus(id, User.Status.valueOf(status));
    }

    @Transactional
    public void deleteUser(int id) {
        findUserOrThrow(id);
        try {
            // Gỡ các bản ghi phụ thuộc đơn giản trước; nếu còn ràng buộc khác
            // (đơn hàng, tin đăng, ứng tuyển...) database sẽ báo lỗi khóa
            // ngoại ở bước flush và chuyển thành thông báo bên dưới.
            socialAccountRepository.deleteByUser_Id(id);
            profileRepository.findById(id).ifPresent(profileRepository::delete);
            userRepository.deleteById(id);
            entityManager.flush();
        } catch (DataIntegrityViolationException e) {
            throw conflict("Tài khoản đã có dữ liệu liên quan (đơn hàng, tin đăng, ứng tuyển...) "
                    + "nên không xóa được. Hãy khóa tài khoản thay vì xóa.");
        }
    }

    // Admin cấp gói Pro / hạ về Basic cho một nhà tuyển dụng.
    // Cấp Pro = tạo 1 đơn hàng ghi nhận (tổng tiền 0đ vì cấp tay, không
    // tính doanh thu) + 1 lượt đăng ký đang hiệu lực tới hết thời hạn gói,
    // đồng thời bật cờ ưu tiên / nổi bật cho mọi tin của nhà đó. Hạ Basic =
    // hủy các lượt đăng ký đang hiệu lực và tắt 2 cờ đó.
    @Transactional
    public UserRow setEmployerPlan(int id, AdminPlanRequest req) {
        User user = findUserOrThrow(id);
        if (user.getRole() != User.Role.employer) {
            throw badRequest("Gói dịch vụ chỉ áp dụng cho tài khoản nhà tuyển dụng.");
        }
        String plan = req == null ? null : req.plan();
        if (!"pro".equals(plan) && !"basic".equals(plan) && !"premium".equals(plan)) {
            throw badRequest("Gói không hợp lệ (chỉ có basic, pro hoặc premium).");
        }

        List<Subscription> active = subscriptionRepository
                .findByEmployerIdAndStatus(id, Subscription.Status.active);

        if ("basic".equals(plan)) {
            active.forEach(Subscription::cancel);
            subscriptionRepository.setEmployerJobFlags(id, false, false);
            return findUserRow(id);
        }

        // Đang đúng gói được chọn rồi thì giữ nguyên, không tạo đăng ký trùng.
        if (plan.equals(employerPlanMap().get(id))) {
            return findUserRow(id);
        }
        String packageName = "premium".equals(plan) ? "Premium" : "Pro";
        ServicePackage pkg = packageRepository.findByName(packageName).orElseThrow(() ->
                badRequest("Chưa có gói " + packageName + " trong hệ thống. Hãy kiểm tra "
                        + "migration gói dịch vụ đã chạy chưa, hoặc tạo gói tên \""
                        + packageName + "\" ở trang Quản lý gói dịch vụ."));

        active.forEach(Subscription::cancel);
        LocalDateTime now = LocalDateTime.now();
        String snapshot = "{\"name\":\"" + pkg.getName().replace("\\", "\\\\").replace("\"", "\\\"")
                + "\",\"price\":" + pkg.getPrice().toPlainString()
                + ",\"grantedByAdmin\":true}";
        subscriptionRepository.insertGrantOrder(
                "GRANT-" + id + "-" + System.currentTimeMillis(),
                id, pkg.getId(), pkg.getPrice(), snapshot, now);
        long orderId = subscriptionRepository.lastInsertId();
        subscriptionRepository.save(new Subscription(
                id, pkg.getId(), (int) orderId, now,
                now.plusDays(pkg.getDurationDays() == null ? 30 : pkg.getDurationDays())));
        subscriptionRepository.setEmployerJobFlags(id, true, true);
        return findUserRow(id);
    }

    /* ---------------- Tin tuyển dụng ---------------- */

    @Transactional(readOnly = true)
    public List<JobRow> getJobs() {
        List<Job> jobs = jobRepository.findAllByOrderByCreatedAtDescIdDesc();
        Map<Integer, Long> applicantsByJob = countMap(jobRepository.countApplicationsByJob());
        Map<Integer, Integer> walletByJob = walletMap();
        Map<Integer, Integer[]> displayByJob = displayMap();
        Map<Integer, Integer> ownerByCompany = new HashMap<>();
        for (Object[] row : companyRepository.findCompanyOwners()) {
            if (row[1] != null) {
                ownerByCompany.put(toInt(row[0]), toInt(row[1]));
            }
        }
        Map<Integer, String> planByEmployer = employerPlanMap();
        return jobs.stream()
                .map(j -> toJobRow(j,
                        applicantsByJob.getOrDefault(j.getId(), 0L),
                        walletByJob.get(j.getId()),
                        displayByJob.get(j.getId()),
                        j.getCompany() == null ? null
                                : planOf(ownerByCompany.get(j.getCompany().getId()), planByEmployer)))
                .toList();
    }

    // Gói của chủ sở hữu một công ty (null khi công ty chưa có chủ).
    private String planOf(Integer ownerId, Map<Integer, String> planByEmployer) {
        return ownerId == null ? null : planByEmployer.getOrDefault(ownerId, "basic");
    }

    // Số dư ví Token theo từng tin, từ truy vấn native của AdminJobRepository.
    private Map<Integer, Integer> walletMap() {
        Map<Integer, Integer> map = new HashMap<>();
        for (Object[] row : jobRepository.walletBalanceByJob()) {
            map.put(toInt(row[0]), row[1] == null ? null : toInt(row[1]));
        }
        return map;
    }

    // [display_days, token_cost] theo từng tin (2 cột V7 chưa có trong entity).
    private Map<Integer, Integer[]> displayMap() {
        Map<Integer, Integer[]> map = new HashMap<>();
        for (Object[] row : jobRepository.displayInfoByJob()) {
            map.put(toInt(row[0]), new Integer[]{
                    row[1] == null ? null : toInt(row[1]),
                    row[2] == null ? null : toInt(row[2])});
        }
        return map;
    }

    @Transactional(readOnly = true)
    public List<CompanyRow> getCompanies() {
        return companyRepository.findAllByOrderByNameAsc().stream()
                .map(c -> new CompanyRow(c.getId(), c.getName(), c.getIndustry()))
                .toList();
    }

    @Transactional
    public void createJob(AdminJobRequest req, int adminId) {
        String title = requireText(req.title(), "Vui lòng nhập tên vị trí.");
        if (req.companyId() == null) {
            throw badRequest("Vui lòng chọn công ty đăng tin.");
        }
        Company company = companyRepository.findById(req.companyId())
                .orElseThrow(() -> badRequest("Công ty đăng tin không tồn tại."));
        String status = req.status() == null ? "open" : req.status();
        if (!JOB_STATUSES.contains(status)) {
            throw badRequest("Trạng thái tin tuyển dụng không hợp lệ.");
        }
        String salaryUnit = req.salaryUnit() == null ? "month" : req.salaryUnit();
        if (!Set.of("hour", "month", "project").contains(salaryUnit)) {
            throw badRequest("Đơn vị lương không hợp lệ.");
        }
        jobRepository.insertJob(req.companyId(), title, req.description(),
                req.salaryMin(), req.salaryMax(), salaryUnit,
                req.location(), req.jobType(),
                req.level() == null ? null : req.level().toLowerCase(Locale.ROOT),
                req.workingSchedule(), req.deadline(), status,
                req.displayDays() == null ? JOB_DISPLAY_DAYS_DEFAULT : req.displayDays(),
                req.tokenCost() == null ? JOB_TOKEN_COST_DEFAULT : req.tokenCost(),
                adminId);
        if (req.industry() != null && !req.industry().isBlank()) {
            companyRepository.updateIndustryById(req.companyId(), req.industry());
        }
        // Tin mới của nhà Pro cũng phải được ưu tiên / nổi bật ngay.
        companyRepository.findOwnerIdByCompanyId(req.companyId()).ifPresent(ownerId -> {
            if (isPriorityPlan(employerPlanMap().get(ownerId))) {
                subscriptionRepository.setEmployerJobFlags(ownerId, true, true);
            }
        });
    }

    @Transactional
    public JobRow updateJob(int id, AdminJobRequest req, int adminId) {
        Job job = findJobOrThrow(id);
        String title = requireText(req.title(), "Vui lòng nhập tên vị trí.");
        String status = req.status() == null ? job.getStatus().name() : req.status();
        if (!JOB_STATUSES.contains(status)) {
            throw badRequest("Trạng thái tin tuyển dụng không hợp lệ.");
        }
        String salaryUnit = req.salaryUnit() == null ? "month" : req.salaryUnit();
        if (!Set.of("hour", "month", "project").contains(salaryUnit)) {
            throw badRequest("Đơn vị lương không hợp lệ.");
        }
        jobRepository.updateJob(id, title, req.description(),
                req.salaryMin(), req.salaryMax(), salaryUnit,
                req.location(), req.jobType(),
                req.level() == null ? null : req.level().toLowerCase(Locale.ROOT),
                req.workingSchedule(), req.deadline(), status, adminId);
        if (req.industry() != null && !req.industry().isBlank()) {
            companyRepository.updateIndustryById(job.getCompany().getId(), req.industry());
        }
        Job fresh = findJobOrThrow(id);
        Map<Integer, Long> applicantsByJob = countMap(jobRepository.countApplicationsByJob());
        Integer ownerId = fresh.getCompany() == null ? null
                : companyRepository.findOwnerIdByCompanyId(fresh.getCompany().getId()).orElse(null);
        return toJobRow(fresh, applicantsByJob.getOrDefault(id, 0L),
                walletMap().get(id), displayMap().get(id),
                planOf(ownerId, employerPlanMap()));
    }

    @Transactional
    public void setJobStatus(int id, String status, int adminId) {
        findJobOrThrow(id);
        if (status == null || !JOB_STATUSES.contains(status)) {
            throw badRequest("Trạng thái tin tuyển dụng không hợp lệ.");
        }
        jobRepository.updateJobStatus(id, status, adminId);
    }

    @Transactional
    public void deleteJob(int id) {
        Job job = findJobOrThrow(id);
        try {
            // Các hàng job_skills do Hibernate tự gỡ (Job là phía sở hữu);
            // còn đơn ứng tuyển tham chiếu tới tin sẽ làm flush báo lỗi.
            jobRepository.delete(job);
            entityManager.flush();
        } catch (DataIntegrityViolationException e) {
            throw conflict("Tin này đã có dữ liệu liên quan nên không xóa được. "
                    + "Hãy chuyển trạng thái sang Tạm dừng hoặc Hết hạn.");
        }
    }

    @Transactional(readOnly = true)
    public List<ApplicationRow> getJobApplications(int jobId) {
        findJobOrThrow(jobId);
        return jobRepository.findApplicationsByJob(jobId).stream().map(row -> new ApplicationRow(
                toInt(row[0]),
                str(row[3]),
                str(row[4]),
                str(row[1]),
                toDateTime(row[2])
        )).toList();
    }

    private Job findJobOrThrow(int id) {
        return jobRepository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tin tuyển dụng."));
    }

    private JobRow toJobRow(Job job, long applicants, Integer employerWalletBalance,
                            Integer[] displayInfo, String employerPlan) {
        LocalDateTime createdAt = job.getCreatedAt();
        BigDecimal min = job.getSalaryMin();
        BigDecimal max = job.getSalaryMax();
        // display_days / token_cost đọc từ DB qua truy vấn native (entity chưa map).
        Integer displayDaysCol = displayInfo == null ? null : displayInfo[0];
        Integer tokenCostCol = displayInfo == null ? null : displayInfo[1];
        int displayDays = displayDaysCol == null ? JOB_DISPLAY_DAYS_DEFAULT : displayDaysCol;
        int tokenCost = tokenCostCol == null ? JOB_TOKEN_COST_DEFAULT : tokenCostCol;
        Company company = job.getCompany();
        return new JobRow(
                job.getId(),
                job.getTitle(),
                company == null ? null : company.getName(),
                min, max,
                job.getSalaryUnit() == null ? null : job.getSalaryUnit().name(),
                salaryText(min, max),
                job.getLocation(),
                company == null ? null : company.getIndustry(),
                job.getLevel(),
                job.getJobType(),
                job.getWorkingSchedule(),
                job.getDeadline(),
                job.getDescription(),
                job.getStatus() == null ? null : job.getStatus().name(),
                displayDays,
                tokenCost,
                createdAt,
                createdAt == null ? null : createdAt.plusDays(displayDays),
                employerWalletBalance,
                applicants,
                employerPlan
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
        Map<Integer, Long> activeSubs = countMap(
                packageRepository.countActiveSubscriptionsByPackage());
        List<PackageRow> packages = packageRepository.findAllByOrderByPriceAsc().stream()
                .map(pkg -> new PackageRow(
                        pkg.getId(),
                        pkg.getName(),
                        pkg.getPrice(),
                        pkg.getDurationDays(),
                        pkg.getJobPostLimit(),
                        pkg.getCvViewLimit(),
                        pkg.getIncludedTokens(),
                        pkg.isCanHighlightJobs(),
                        pkg.isCanPrioritizeJobs(),
                        pkg.isCanSearchCandidates(),
                        pkg.isCanDirectContact(),
                        pkg.isActive(),
                        activeSubs.getOrDefault(pkg.getId(), 0L)
                )).toList();

        List<TokenPackageRow> tokenPackages = tokenPackageRepository
                .findAllByOrderByTokensAsc().stream()
                .map(tp -> new TokenPackageRow(
                        tp.getId(), tp.getTokens(), tp.getPrice(), tp.isActive()))
                .toList();

        Map<Integer, Long> usedCounts = countMap(promotionRepository.countUsagesByPromotion());
        List<PromotionRow> promotions = promotionRepository.findAllByOrderByIdAsc().stream()
                .map(pr -> new PromotionRow(
                        pr.getId(),
                        pr.getCode(),
                        pr.getDiscountType().name(),
                        pr.getDiscountValue(),
                        pr.getMinOrderAmount(),
                        pr.getMaxDiscountAmount(),
                        pr.getStartAt(),
                        pr.getEndAt(),
                        pr.getUsageLimit(),
                        pr.getPerUserLimit(),
                        pr.isActive(),
                        usedCounts.getOrDefault(pr.getId(), 0L)
                )).toList();

        return new Packages(packages, tokenPackages, promotions);
    }

    @Transactional
    public void createPackage(AdminPackageRequest req) {
        validatePackage(req);
        packageRepository.save(new ServicePackage(
                req.name().trim(), req.price(), req.durationDays(),
                req.jobPostLimit(), req.cvViewLimit(),
                req.includedTokens() == null ? 0 : req.includedTokens(),
                Boolean.TRUE.equals(req.canHighlightJobs()),
                Boolean.TRUE.equals(req.canPrioritizeJobs()),
                Boolean.TRUE.equals(req.canSearchCandidates()),
                Boolean.TRUE.equals(req.canDirectContact()),
                !Boolean.FALSE.equals(req.isActive())));
    }

    @Transactional
    public void updatePackage(int id, AdminPackageRequest req) {
        validatePackage(req);
        ServicePackage pkg = packageRepository.findById(id)
                .orElseThrow(() -> notFound("Không tìm thấy gói đăng ký."));
        pkg.update(req.name().trim(), req.price(), req.durationDays(),
                req.jobPostLimit(), req.cvViewLimit(),
                req.includedTokens() == null ? 0 : req.includedTokens(),
                Boolean.TRUE.equals(req.canHighlightJobs()),
                Boolean.TRUE.equals(req.canPrioritizeJobs()),
                Boolean.TRUE.equals(req.canSearchCandidates()),
                Boolean.TRUE.equals(req.canDirectContact()),
                !Boolean.FALSE.equals(req.isActive()));
    }

    @Transactional
    public void deletePackage(int id) {
        Optional<ServicePackage> pkg = packageRepository.findById(id);
        if (pkg.isEmpty()) return;
        try {
            packageRepository.delete(pkg.get());
            entityManager.flush();
        } catch (DataIntegrityViolationException e) {
            throw conflict("Gói này đã có nhà tuyển dụng sử dụng nên không xóa được. Hãy tắt gói thay vì xóa.");
        }
    }

    @Transactional
    public void createTokenPackage(AdminTokenPackageRequest req) {
        validateTokenPackage(req);
        tokenPackageRepository.save(new TokenPackage(
                req.tokens(), req.price(), !Boolean.FALSE.equals(req.isActive())));
    }

    @Transactional
    public void updateTokenPackage(int id, AdminTokenPackageRequest req) {
        validateTokenPackage(req);
        TokenPackage tp = tokenPackageRepository.findById(id)
                .orElseThrow(() -> notFound("Không tìm thấy gói Token."));
        tp.update(req.tokens(), req.price(), !Boolean.FALSE.equals(req.isActive()));
    }

    @Transactional
    public void deleteTokenPackage(int id) {
        Optional<TokenPackage> tp = tokenPackageRepository.findById(id);
        if (tp.isEmpty()) return;
        try {
            tokenPackageRepository.delete(tp.get());
            entityManager.flush();
        } catch (DataIntegrityViolationException e) {
            throw conflict("Gói Token này đã có đơn hàng nên không xóa được. Hãy tắt gói thay vì xóa.");
        }
    }

    @Transactional
    public void createPromotion(AdminPromotionRequest req) {
        validatePromotion(req);
        try {
            promotionRepository.save(new Promotion(
                    req.code().trim().toUpperCase(Locale.ROOT),
                    Promotion.DiscountType.valueOf(req.discountType()),
                    req.discountValue(), req.minOrderAmount(), req.maxDiscountAmount(),
                    req.startAt(), req.endAt(), req.usageLimit(), req.perUserLimit(),
                    !Boolean.FALSE.equals(req.isActive())));
            entityManager.flush();
        } catch (DataIntegrityViolationException e) {
            throw conflict("Mã khuyến mãi này đã tồn tại.");
        }
    }

    @Transactional
    public void updatePromotion(int id, AdminPromotionRequest req) {
        validatePromotion(req);
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> notFound("Không tìm thấy khuyến mãi."));
        try {
            promotion.update(req.code().trim().toUpperCase(Locale.ROOT),
                    Promotion.DiscountType.valueOf(req.discountType()),
                    req.discountValue(), req.minOrderAmount(), req.maxDiscountAmount(),
                    req.startAt(), req.endAt(), req.usageLimit(), req.perUserLimit(),
                    !Boolean.FALSE.equals(req.isActive()));
            entityManager.flush();
        } catch (DataIntegrityViolationException e) {
            throw conflict("Mã khuyến mãi này đã tồn tại.");
        }
    }

    @Transactional
    public void deletePromotion(int id) {
        promotionRepository.findById(id).ifPresent(promotionRepository::delete);
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

    // Các truy vấn đếm dạng [khóa, số lượng] -> Map để tra cứu theo id.
    private Map<Integer, Long> countMap(List<Object[]> rows) {
        Map<Integer, Long> map = new HashMap<>();
        for (Object[] row : rows) {
            map.put(toInt(row[0]), toLong(row[1]));
        }
        return map;
    }

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

    static long toLong(Object v) {
        return v == null ? 0 : ((Number) v).longValue();
    }

    static String str(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    static LocalDateTime toDateTime(Object v) {
        if (v == null) return null;
        if (v instanceof LocalDateTime ldt) return ldt;
        if (v instanceof Timestamp ts) return ts.toLocalDateTime();
        return LocalDateTime.parse(String.valueOf(v).replace(' ', 'T'));
    }
}
