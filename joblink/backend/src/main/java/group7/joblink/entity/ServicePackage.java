package group7.joblink.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

// Gói đăng ký nhà tuyển dụng mua theo thời hạn (bảng packages).
// Đặt tên ServicePackage để tránh trùng java.lang.Package.
@Entity
@Table(name = "packages")
@Getter
@NoArgsConstructor
public class ServicePackage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal price;

    @Column(name = "duration_days", nullable = false)
    private Integer durationDays;

    @Column(name = "job_post_limit")
    private Integer jobPostLimit;

    @Column(name = "cv_view_limit")
    private Integer cvViewLimit;

    @Column(name = "included_tokens", nullable = false)
    private Integer includedTokens = 0;

    @Column(name = "can_highlight_jobs", nullable = false)
    private boolean canHighlightJobs;

    @Column(name = "can_prioritize_jobs", nullable = false)
    private boolean canPrioritizeJobs;

    @Column(name = "can_search_candidates", nullable = false)
    private boolean canSearchCandidates;

    @Column(name = "can_direct_contact", nullable = false)
    private boolean canDirectContact;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    public ServicePackage(String name, BigDecimal price, Integer durationDays,
                          Integer jobPostLimit, Integer cvViewLimit, Integer includedTokens,
                          boolean canHighlightJobs, boolean canPrioritizeJobs,
                          boolean canSearchCandidates, boolean canDirectContact,
                          boolean active) {
        update(name, price, durationDays, jobPostLimit, cvViewLimit, includedTokens,
                canHighlightJobs, canPrioritizeJobs, canSearchCandidates,
                canDirectContact, active);
    }

    // Cập nhật toàn bộ thông tin gói (admin sửa gói ở trang Quản lý gói dịch vụ).
    public void update(String name, BigDecimal price, Integer durationDays,
                       Integer jobPostLimit, Integer cvViewLimit, Integer includedTokens,
                       boolean canHighlightJobs, boolean canPrioritizeJobs,
                       boolean canSearchCandidates, boolean canDirectContact,
                       boolean active) {
        this.name = name;
        this.price = price;
        this.durationDays = durationDays;
        this.jobPostLimit = jobPostLimit;
        this.cvViewLimit = cvViewLimit;
        this.includedTokens = includedTokens;
        this.canHighlightJobs = canHighlightJobs;
        this.canPrioritizeJobs = canPrioritizeJobs;
        this.canSearchCandidates = canSearchCandidates;
        this.canDirectContact = canDirectContact;
        this.active = active;
    }
}
