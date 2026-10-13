package group7.joblink.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "candidate_profiles")
@Getter
@NoArgsConstructor
public class CandidateProfile {

    // Dùng chung id với bảng users (quan hệ 1-1).
    @Id
    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "full_name", nullable = false, length = 255)
    private String fullName;

    @Column(length = 20)
    private String phone;

    private LocalDate dob;

    @Column(length = 500)
    private String address;

    @Column(length = 500)
    private String avatar;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(name = "is_searchable", nullable = false)
    private boolean searchable = true;

    public CandidateProfile(Integer userId, String fullName, String avatar) {
        this.userId = userId;
        this.fullName = fullName;
        this.avatar = avatar;
    }
}
