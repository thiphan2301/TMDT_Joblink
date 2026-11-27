package group7.joblink.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "jobs")
@Getter
@NoArgsConstructor
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String requirements;

    @Column(name = "salary_min", precision = 15, scale = 2)
    private BigDecimal salaryMin;

    @Column(name = "salary_max", precision = 15, scale = 2)
    private BigDecimal salaryMax;

    @Enumerated(EnumType.STRING)
    @Column(name = "salary_unit", nullable = false)
    private SalaryUnit salaryUnit;

    @Column(length = 255)
    private String location;

    @Column(name = "job_type", length = 50)
    private String jobType;

    @Column(length = 50)
    private String level;

    @Column(nullable = false)
    private Integer vacancies;

    @Column(name = "working_schedule", length = 255)
    private String workingSchedule;

    private LocalDate deadline;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(name = "is_highlighted", nullable = false)
    private boolean highlighted;

    @Column(name = "is_prioritized", nullable = false)
    private boolean prioritized;

    // Gói của nhà tuyển dụng lúc đăng tin (không đổi khi họ mua / hết gói sau đó).
    @Enumerated(EnumType.STRING)
    @Column(name = "display_tier", nullable = false)
    private DisplayTier displayTier = DisplayTier.basic;

    // Lần đầu tin chuyển sang "open"; null nếu chưa từng đăng.
    @Column(
        name = "published_at",
        insertable = false,
        updatable = false
    )
    private LocalDateTime publishedAt;

    @Column(
        name = "created_at",
        nullable = false,
        insertable = false,
        updatable = false
    )
    private LocalDateTime createdAt;

    @Column(
        name = "listing_expires_at",
        insertable = false,
        updatable = false
    )
    private LocalDateTime listingExpiresAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "job_skills",
        joinColumns = @JoinColumn(name = "job_id"),
        inverseJoinColumns = @JoinColumn(name = "skill_id")
    )
    private Set<Skill> skills = new HashSet<>();

    public enum Status {
        draft,
        pending_review,
        open,
        closed,
        rejected,
        expired
    }

    public enum SalaryUnit {
        hour,
        month,
        project
    }

    // Thứ tự khai báo = thứ hạng hiển thị tăng dần (basic < pro < premium).
    public enum DisplayTier {
        basic,
        pro,
        premium;

        // "pro" -> pro; giá trị lạ hoặc null -> basic.
        public static DisplayTier of(String tier) {
            for (DisplayTier value : values()) {
                if (value.name().equals(tier)) {
                    return value;
                }
            }
            return basic;
        }
    }
}