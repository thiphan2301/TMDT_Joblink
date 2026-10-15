package group7.joblink.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

// Truy vấn dữ liệu cho khu vực admin bằng JdbcTemplate — cùng phong cách
// với ApplicationRepository hiện có của project. Trả Map thô, AdminService
// chịu trách nhiệm kiểm tra dữ liệu và chuyển thành DTO.
@Repository
public class AdminRepository {

    private final JdbcTemplate jdbc;

    public AdminRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /* ---------------- Tổng quan / báo cáo ---------------- */

    public long countUsers() {
        Long v = jdbc.queryForObject("SELECT COUNT(*) FROM users", Long.class);
        return v == null ? 0 : v;
    }

    public long countUsersByStatus(String status) {
        Long v = jdbc.queryForObject(
                "SELECT COUNT(*) FROM users WHERE status = ?", Long.class, status);
        return v == null ? 0 : v;
    }

    public long countJobs() {
        Long v = jdbc.queryForObject("SELECT COUNT(*) FROM jobs", Long.class);
        return v == null ? 0 : v;
    }

    public long countUsersCreatedBetween(LocalDateTime from, LocalDateTime to) {
        Long v = jdbc.queryForObject(
                "SELECT COUNT(*) FROM users WHERE created_at >= ? AND created_at < ?",
                Long.class, Timestamp.valueOf(from), Timestamp.valueOf(to));
        return v == null ? 0 : v;
    }

    public long countJobsCreatedBetween(LocalDateTime from, LocalDateTime to) {
        Long v = jdbc.queryForObject(
                "SELECT COUNT(*) FROM jobs WHERE created_at >= ? AND created_at < ?",
                Long.class, Timestamp.valueOf(from), Timestamp.valueOf(to));
        return v == null ? 0 : v;
    }

    // Doanh thu = tổng tiền đơn đã trả (paid) hoặc đã hoàn tất (fulfilled).
    public BigDecimal sumRevenueBetween(LocalDateTime from, LocalDateTime to) {
        BigDecimal v = jdbc.queryForObject("""
                SELECT COALESCE(SUM(total_amount), 0)
                FROM orders
                WHERE status IN ('paid', 'fulfilled')
                  AND created_at >= ? AND created_at < ?
                """, BigDecimal.class, Timestamp.valueOf(from), Timestamp.valueOf(to));
        return v == null ? BigDecimal.ZERO : v;
    }

    public List<Map<String, Object>> countUsersByRole() {
        return jdbc.queryForList("""
                SELECT role, COUNT(*) AS cnt FROM users GROUP BY role
                """);
    }

    /* ---------------- Người dùng ---------------- */

    // Tên hiển thị: ứng viên lấy từ candidate_profiles, nhà tuyển dụng lấy
    // tên công ty họ sở hữu, còn lại lấy phần trước @ của email.
    public List<Map<String, Object>> findUsers() {
        return jdbc.queryForList("""
                SELECT u.id, u.email, u.role, u.status, u.created_at,
                       COALESCE(cp.full_name, c.name,
                                SUBSTRING_INDEX(u.email, '@', 1)) AS full_name
                FROM users u
                LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
                LEFT JOIN companies c ON c.owner_id = u.id
                ORDER BY u.id
                """);
    }

    public boolean existsEmail(String email, Integer excludeId) {
        Long v = jdbc.queryForObject(
                "SELECT COUNT(*) FROM users WHERE email = ? AND id <> ?",
                Long.class, email, excludeId == null ? -1 : excludeId);
        return v != null && v > 0;
    }

    public int insertUser(String email, String passwordHash, String role) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO users (email, password_hash, role, status) VALUES (?, ?, ?, 'active')",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, email);
            ps.setString(2, passwordHash);
            ps.setString(3, role);
            return ps;
        }, keys);
        // Trigger trg_users_after_insert tự tạo ví 20 Token cho user mới.
        return keys.getKey().intValue();
    }

    public void insertCandidateProfile(int userId, String fullName) {
        jdbc.update("INSERT INTO candidate_profiles (user_id, full_name) VALUES (?, ?)",
                userId, fullName);
    }

    public void updateUser(int id, String email, String role) {
        jdbc.update("UPDATE users SET email = ?, role = ? WHERE id = ?", email, role, id);
    }

    // Đổi tên hiển thị theo vai trò: ứng viên sửa candidate_profiles
    // (chưa có hồ sơ thì tạo), nhà tuyển dụng sửa tên công ty sở hữu.
    public void updateDisplayName(int userId, String role, String fullName) {
        if ("candidate".equals(role)) {
            int updated = jdbc.update(
                    "UPDATE candidate_profiles SET full_name = ? WHERE user_id = ?",
                    fullName, userId);
            if (updated == 0) {
                insertCandidateProfile(userId, fullName);
            }
        } else if ("employer".equals(role)) {
            jdbc.update("UPDATE companies SET name = ? WHERE owner_id = ?", fullName, userId);
        }
    }

    public void setUserStatus(int id, String status) {
        jdbc.update("UPDATE users SET status = ? WHERE id = ?", status, id);
    }

    public boolean userExists(int id) {
        Long v = jdbc.queryForObject(
                "SELECT COUNT(*) FROM users WHERE id = ?", Long.class, id);
        return v != null && v > 0;
    }

    // Xóa các bản ghi phụ thuộc đơn giản trước; nếu còn ràng buộc khác
    // (đơn hàng, tin đăng...) database sẽ báo lỗi khóa ngoại và service
    // chuyển thành thông báo "hãy khóa thay vì xóa".
    public void deleteUser(int id) {
        jdbc.update("DELETE FROM candidate_skills WHERE candidate_id = ?", id);
        jdbc.update("DELETE FROM candidate_profiles WHERE user_id = ?", id);
        jdbc.update("DELETE FROM social_accounts WHERE user_id = ?", id);
        jdbc.update("DELETE FROM users WHERE id = ?", id);
    }

    /* ---------------- Tin tuyển dụng ---------------- */

    private static final String JOB_SELECT = """
            SELECT j.id, j.title, j.description, j.salary_min, j.salary_max,
                   j.salary_unit, j.location, j.job_type, j.level, j.vacancies,
                   j.working_schedule, j.deadline, j.status, j.created_at,
                   j.display_days, j.token_cost,
                   j.company_id,
                   c.name AS company_name, c.industry AS industry,
                   tw.balance AS employer_wallet_balance,
                   (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicants
            FROM jobs j
            JOIN companies c ON c.id = j.company_id
            LEFT JOIN token_wallets tw ON tw.user_id = c.owner_id
            """;

    public List<Map<String, Object>> findJobs() {
        return jdbc.queryForList(JOB_SELECT + " ORDER BY j.created_at DESC, j.id DESC");
    }

    public List<Map<String, Object>> findJob(int id) {
        return jdbc.queryForList(JOB_SELECT + " WHERE j.id = ?", id);
    }

    public void updateJob(int id, String title, String description,
                          BigDecimal salaryMin, BigDecimal salaryMax, String salaryUnit,
                          String location, String jobType, String level,
                          String workingSchedule, java.time.LocalDate deadline, String status,
                          int adminId) {
        jdbc.update("""
                UPDATE jobs
                SET title = ?, description = ?, salary_min = ?, salary_max = ?,
                    salary_unit = ?, location = ?, job_type = ?, level = ?,
                    working_schedule = ?, deadline = ?, status = ?,
                    reviewed_by = ?, reviewed_at = NOW()
                WHERE id = ?
                """,
                title, description, salaryMin, salaryMax, salaryUnit, location,
                jobType, level, workingSchedule,
                deadline == null ? null : java.sql.Date.valueOf(deadline),
                status, adminId, id);
    }

    public void updateCompanyIndustry(int companyId, String industry) {
        jdbc.update("UPDATE companies SET industry = ? WHERE id = ?", industry, companyId);
    }

    public void setJobStatus(int id, String status, int adminId) {
        jdbc.update("""
                UPDATE jobs SET status = ?, reviewed_by = ?, reviewed_at = NOW()
                WHERE id = ?
                """, status, adminId, id);
    }

    public void deleteJob(int id) {
        jdbc.update("DELETE FROM job_skills WHERE job_id = ?", id);
        jdbc.update("DELETE FROM jobs WHERE id = ?", id);
    }

    public List<Map<String, Object>> findCompanies() {
        return jdbc.queryForList("""
                SELECT id, name, industry FROM companies ORDER BY name
                """);
    }

    public boolean companyExists(int id) {
        Long v = jdbc.queryForObject(
                "SELECT COUNT(*) FROM companies WHERE id = ?", Long.class, id);
        return v != null && v > 0;
    }

    // displayDays / tokenCost = null thì bỏ qua 2 cột đó để database dùng
    // giá trị mặc định của cột (V7). Tin mới tạo mặc định 1 chỗ trống (vacancies=1).
    public void insertJob(int companyId, String title, String description,
                          BigDecimal salaryMin, BigDecimal salaryMax, String salaryUnit,
                          String location, String jobType, String level,
                          String workingSchedule, java.time.LocalDate deadline,
                          String status, Integer displayDays, Integer tokenCost,
                          int adminId) {
        if (displayDays != null && tokenCost != null) {
            jdbc.update("""
                    INSERT INTO jobs (company_id, title, description, salary_min, salary_max,
                                      salary_unit, location, job_type, level, vacancies,
                                      working_schedule, deadline, status,
                                      display_days, token_cost, reviewed_by, reviewed_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, NOW())
                    """, companyId, title, description, salaryMin, salaryMax, salaryUnit,
                    location, jobType, level, workingSchedule,
                    deadline == null ? null : java.sql.Date.valueOf(deadline),
                    status, displayDays, tokenCost, adminId);
        } else {
            jdbc.update("""
                    INSERT INTO jobs (company_id, title, description, salary_min, salary_max,
                                      salary_unit, location, job_type, level, vacancies,
                                      working_schedule, deadline, status,
                                      reviewed_by, reviewed_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, NOW())
                    """, companyId, title, description, salaryMin, salaryMax, salaryUnit,
                    location, jobType, level, workingSchedule,
                    deadline == null ? null : java.sql.Date.valueOf(deadline),
                    status, adminId);
        }
    }

    public List<Map<String, Object>> findApplications(int jobId) {
        return jdbc.queryForList("""
                SELECT a.id, a.status, a.applied_at,
                       COALESCE(cp.full_name, SUBSTRING_INDEX(u.email, '@', 1)) AS candidate_name,
                       u.email AS candidate_email
                FROM applications a
                JOIN users u ON u.id = a.candidate_id
                LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
                WHERE a.job_id = ?
                ORDER BY a.applied_at DESC, a.id DESC
                """, jobId);
    }

    /* ---------------- Gói dịch vụ ---------------- */

    public List<Map<String, Object>> findPackages() {
        return jdbc.queryForList("""
                SELECT p.*,
                       (SELECT COUNT(*) FROM subscriptions s
                        WHERE s.package_id = p.id AND s.status = 'active') AS active_subscriptions
                FROM packages p
                ORDER BY p.price
                """);
    }

    public void insertPackage(String name, BigDecimal price, Integer durationDays,
                              Integer jobPostLimit, Integer cvViewLimit, Integer includedTokens,
                              boolean highlight, boolean prioritize, boolean search,
                              boolean contact, boolean active) {
        jdbc.update("""
                INSERT INTO packages (name, price, duration_days, job_post_limit, cv_view_limit,
                                      included_tokens, can_highlight_jobs, can_prioritize_jobs,
                                      can_search_candidates, can_direct_contact, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, name, price, durationDays, jobPostLimit, cvViewLimit, includedTokens,
                highlight, prioritize, search, contact, active);
    }

    public int updatePackage(int id, String name, BigDecimal price, Integer durationDays,
                             Integer jobPostLimit, Integer cvViewLimit, Integer includedTokens,
                             boolean highlight, boolean prioritize, boolean search,
                             boolean contact, boolean active) {
        return jdbc.update("""
                UPDATE packages
                SET name = ?, price = ?, duration_days = ?, job_post_limit = ?,
                    cv_view_limit = ?, included_tokens = ?, can_highlight_jobs = ?,
                    can_prioritize_jobs = ?, can_search_candidates = ?,
                    can_direct_contact = ?, is_active = ?
                WHERE id = ?
                """, name, price, durationDays, jobPostLimit, cvViewLimit, includedTokens,
                highlight, prioritize, search, contact, active, id);
    }

    public void deletePackage(int id) {
        jdbc.update("DELETE FROM packages WHERE id = ?", id);
    }

    public List<Map<String, Object>> findTokenPackages() {
        return jdbc.queryForList("SELECT * FROM token_packages ORDER BY tokens");
    }

    public void insertTokenPackage(Integer tokens, BigDecimal price, boolean active) {
        jdbc.update("INSERT INTO token_packages (tokens, price, is_active) VALUES (?, ?, ?)",
                tokens, price, active);
    }

    public int updateTokenPackage(int id, Integer tokens, BigDecimal price, boolean active) {
        return jdbc.update(
                "UPDATE token_packages SET tokens = ?, price = ?, is_active = ? WHERE id = ?",
                tokens, price, active, id);
    }

    public void deleteTokenPackage(int id) {
        jdbc.update("DELETE FROM token_packages WHERE id = ?", id);
    }

    public List<Map<String, Object>> findPromotions() {
        return jdbc.queryForList("""
                SELECT pr.*,
                       (SELECT COUNT(*) FROM promotion_usages pu
                        WHERE pu.promotion_id = pr.id) AS used_count
                FROM promotions pr
                ORDER BY pr.id
                """);
    }

    public void insertPromotion(String code, String type, BigDecimal value,
                                BigDecimal minOrder, BigDecimal maxDiscount,
                                LocalDateTime startAt, LocalDateTime endAt,
                                Integer usageLimit, Integer perUserLimit, boolean active) {
        jdbc.update("""
                INSERT INTO promotions (code, discount_type, discount_value, min_order_amount,
                                        max_discount_amount, start_at, end_at, usage_limit,
                                        per_user_limit, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, code, type, value, minOrder, maxDiscount,
                startAt == null ? null : Timestamp.valueOf(startAt),
                endAt == null ? null : Timestamp.valueOf(endAt),
                usageLimit, perUserLimit, active);
    }

    public int updatePromotion(int id, String code, String type, BigDecimal value,
                               BigDecimal minOrder, BigDecimal maxDiscount,
                               LocalDateTime startAt, LocalDateTime endAt,
                               Integer usageLimit, Integer perUserLimit, boolean active) {
        return jdbc.update("""
                UPDATE promotions
                SET code = ?, discount_type = ?, discount_value = ?, min_order_amount = ?,
                    max_discount_amount = ?, start_at = ?, end_at = ?, usage_limit = ?,
                    per_user_limit = ?, is_active = ?
                WHERE id = ?
                """, code, type, value, minOrder, maxDiscount,
                startAt == null ? null : Timestamp.valueOf(startAt),
                endAt == null ? null : Timestamp.valueOf(endAt),
                usageLimit, perUserLimit, active, id);
    }

    public void deletePromotion(int id) {
        jdbc.update("DELETE FROM promotions WHERE id = ?", id);
    }
}
