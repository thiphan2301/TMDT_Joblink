package group7.joblink.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

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

    // Kỹ năng của ứng viên (bảng candidate_skills).
    // Cột level, years_exp giữ nguyên với kỹ năng không bị xóa.
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "candidate_skills",
        joinColumns = @JoinColumn(name = "candidate_id"),
        inverseJoinColumns = @JoinColumn(name = "skill_id")
    )
    private Set<Skill> skills = new HashSet<>();

    public CandidateProfile(Integer userId, String fullName, String avatar) {
        this.userId = userId;
        this.fullName = fullName;
        this.avatar = avatar;
    }

    // Cập nhật thông tin cá nhân (dữ liệu đã được kiểm tra ở service).
    public void updateInfo(
            String fullName,
            String phone,
            LocalDate dob,
            String address,
            String summary,
            boolean searchable) {
        this.fullName = fullName;
        this.phone = phone;
        this.dob = dob;
        this.address = address;
        this.summary = summary;
        this.searchable = searchable;
    }

    // Thay danh sách kỹ năng: chỉ xóa kỹ năng bị bỏ và thêm kỹ năng mới.
    public void replaceSkills(Collection<Skill> newSkills) {
        Set<Integer> newIds = newSkills.stream()
                .map(Skill::getId)
                .collect(Collectors.toSet());

        skills.removeIf(skill -> !newIds.contains(skill.getId()));

        Set<Integer> currentIds = skills.stream()
                .map(Skill::getId)
                .collect(Collectors.toSet());

        newSkills.stream()
                .filter(skill -> !currentIds.contains(skill.getId()))
                .forEach(skills::add);
    }
}
