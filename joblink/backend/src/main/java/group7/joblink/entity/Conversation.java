package group7.joblink.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// Cuộc trò chuyện giữa 1 ứng viên và 1 nhà tuyển dụng (bảng conversations).
// Mỗi cặp ứng viên - nhà tuyển dụng chỉ có tối đa 1 cuộc trò chuyện
// (UNIQUE candidate_id + employer_id); job_id là tin tuyển dụng gắn với
// cuộc trò chuyện lúc mở, có thể trống.
@Entity
@Table(name = "conversations")
@Getter
@NoArgsConstructor
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "candidate_id", nullable = false)
    private Integer candidateId;

    @Column(name = "employer_id", nullable = false)
    private Integer employerId;

    @Column(name = "job_id")
    private Integer jobId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Conversation(Integer candidateId, Integer employerId, Integer jobId) {
        this.candidateId = candidateId;
        this.employerId = employerId;
        this.jobId = jobId;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
