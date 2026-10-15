package group7.joblink.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "applications", uniqueConstraints = @UniqueConstraint(name = "uq_applications_job_candidate", columnNames = {"job_id", "candidate_id"})
)
@Getter
@NoArgsConstructor
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false)
    private CandidateProfile candidate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cv_id", nullable = false)
    private Cv cv;

    @Column(name = "cover_letter", columnDefinition = "TEXT")
    private String coverLetter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(
            name = "applied_at",
            nullable = false,
            insertable = false,
            updatable = false
    )
    private LocalDateTime appliedAt;

    @Column(
            name = "updated_at",
            nullable = false,
            insertable = false,
            updatable = false
    )
    private LocalDateTime updatedAt;

    public Application(Job job, CandidateProfile candidate, Cv cv) {
        this.job = job;
        this.candidate = candidate;
        this.cv = cv;
        this.status = Status.pending;
    }

    public enum Status {
        pending,
        viewed,
        invited,
        rejected,
        hired
    }
}