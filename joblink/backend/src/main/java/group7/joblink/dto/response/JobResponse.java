package group7.joblink.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record JobResponse(
    Integer id,
    String title,
    String description,
    String requirements,

    BigDecimal salaryMin,
    BigDecimal salaryMax,
    String salaryUnit,

    String location,
    String jobType,
    String level,
    String workingSchedule,
    Integer vacancies,

    LocalDate deadline,
    LocalDateTime createdAt,
    String status,
    boolean acceptingApplications,
    boolean highlighted,
    boolean prioritized,
    // Số người đã ứng tuyển, dùng để sắp xếp "nhiều người ứng tuyển nhất".
    long applicationCount,

    Integer companyId,
    String companyName,
    String companyLogo,
    String companyDescription,
    String companyAddress,
    String industry,
    String companySize,
    BigDecimal latitude,
    BigDecimal longitude,
    String verificationStatus,

    String skills
) {
}