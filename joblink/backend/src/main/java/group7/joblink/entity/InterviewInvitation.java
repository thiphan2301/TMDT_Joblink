package group7.joblink.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// Lời mời phỏng vấn nhà tuyển dụng gửi cho một đơn ứng tuyển.
@Entity
@Table(name = "interview_invitations")
@Getter
@NoArgsConstructor
public class InterviewInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    @Column(length = 500)
    private String location;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    // Giá trị khớp với ENUM trong database.
    public enum Status {
        pending,
        accepted,
        declined
    }
}
