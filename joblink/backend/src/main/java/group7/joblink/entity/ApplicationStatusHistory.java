package group7.joblink.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "application_status_history")
@Getter
@NoArgsConstructor
public class ApplicationStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status")
    private Application.Status fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false)
    private Application.Status toStatus;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "changed_by", nullable = false)
    private User changedBy;

    @Column(
            name = "changed_at",
            nullable = false,
            insertable = false,
            updatable = false
    )
    private LocalDateTime changedAt;

    @Column(columnDefinition = "TEXT")
    private String note;

    public ApplicationStatusHistory(
            Application application,
            User changedBy) {

        this.application = application;
        this.fromStatus = null;
        this.toStatus = Application.Status.pending;
        this.changedBy = changedBy;
        this.note = "Ứng viên nộp hồ sơ";
    }
}