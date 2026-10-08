package group7.joblink.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/jobs")
public class JobController {

    private final JdbcTemplate jdbcTemplate;

    public JobController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping
    public List<Map<String, Object>> getJobs() {
        String sql = """
                SELECT
                    j.id,
                    j.title,
                    j.description,
                    j.requirements,
                    j.salary_min AS salaryMin,
                    j.salary_max AS salaryMax,
                    j.salary_unit AS salaryUnit,
                    j.location,
                    j.job_type AS jobType,
                    j.level,
                    j.working_schedule AS workingSchedule,
                    j.deadline,
                    j.created_at AS createdAt,
                    j.is_highlighted AS highlighted,
                    j.is_prioritized AS prioritized,
                    c.id AS companyId,
                    c.name AS companyName,
                    c.logo AS companyLogo,
                    c.industry,
                    c.address AS companyAddress,
                    c.latitude,
                    c.longitude,
                    c.verification_status AS verificationStatus,
                    (
                        SELECT GROUP_CONCAT(s.name SEPARATOR ', ')
                        FROM job_skills js
                        JOIN skills s ON s.id = js.skill_id
                        WHERE js.job_id = j.id
                    ) AS skills
                FROM jobs j
                JOIN companies c ON c.id = j.company_id
                WHERE j.status = 'open'
                  AND (j.deadline IS NULL OR j.deadline >= CURRENT_DATE)
                ORDER BY j.is_prioritized DESC, j.created_at DESC, j.id DESC
                """;

        return jdbcTemplate.queryForList(sql);
    }

    @GetMapping("/{id}")
    public Map<String, Object> getJobDetail(@PathVariable("id") int id) {
        String sql = """
                SELECT
                    j.id,
                    j.title,
                    j.description,
                    j.requirements,
                    j.salary_min AS salaryMin,
                    j.salary_max AS salaryMax,
                    j.salary_unit AS salaryUnit,
                    j.location,
                    j.job_type AS jobType,
                    j.level,
                    j.working_schedule AS workingSchedule,
                    j.vacancies,
                    j.deadline,
                    j.status,
                    (
                        j.status = 'open'
                        AND (j.deadline IS NULL OR j.deadline >= CURRENT_DATE)
                    ) AS acceptingApplications,
                    c.id AS companyId,
                    c.name AS companyName,
                    c.logo AS companyLogo,
                    c.description AS companyDescription,
                    c.address AS companyAddress,
                    c.industry,
                    c.size AS companySize,
                    c.verification_status AS verificationStatus,
                    (
                        SELECT GROUP_CONCAT(s.name SEPARATOR ', ')
                        FROM job_skills js
                        JOIN skills s ON s.id = js.skill_id
                        WHERE js.job_id = j.id
                    ) AS skills
                FROM jobs j
                JOIN companies c ON c.id = j.company_id
                WHERE j.id = ?
                  AND j.status IN ('open', 'closed', 'expired')
                """;

        List<Map<String, Object>> results = jdbcTemplate.queryForList(sql, id);

        if (results.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Không tìm thấy việc làm");
        }

        Map<String, Object> job = results.getFirst();

        String status = (String) job.get("status");

        // Lấy ngày hết hạn từ kết quả truy vấn
        java.sql.Date deadline = (java.sql.Date) job.get("deadline");

        // Ngày hiện tại theo giờ Việt Nam
        java.time.LocalDate today = java.time.LocalDate.now(
                java.time.ZoneId.of("Asia/Ho_Chi_Minh"));

        // Hạn là hôm nay thì vẫn được ứng tuyển
        boolean isExpired = deadline != null
                && deadline.toLocalDate().isBefore(today);

        boolean accepting = "open".equals(status) && !isExpired;

        job.put("acceptingApplications", accepting);

        return job;
    }
}