package group7.joblink.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "company_reviews",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_company_review_user",
                        columnNames = {"company_id", "candidate_id"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
public class CompanyReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false)
    private User user;

    @Column(name = "rating", columnDefinition = "INT", nullable = true)
    private Integer rating;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    private String status;
    @Column(name="created_at")
    private LocalDateTime  createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;


    @PrePersist
    public void prePersist() {
        if(this.status == null){
            this.status = "visible"; //gán giá trị mặc định
        }
        if(this.createdAt == null){
            this.createdAt = LocalDateTime.now(); // gán thời gian lúc insert
        }
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

}
