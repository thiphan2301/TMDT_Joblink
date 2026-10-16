package group7.joblink.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "cvs")
@Getter
@NoArgsConstructor
public class Cv {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false)
    private CandidateProfile candidate;

    // Tên lưu trên ổ đĩa, do backend tạo, không dùng tên người dùng gửi lên.
    @Column(name = "file_url", nullable = false, length = 500)
    private String fileUrl;

    // Tên gốc để hiển thị cho người dùng.
    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "is_default", nullable = false)
    private boolean defaultCv;

    @Column(
            name = "uploaded_at",
            nullable = false,
            insertable = false,
            updatable = false
    )
    private LocalDateTime uploadedAt;

    public Cv(
            CandidateProfile candidate,
            String fileUrl,
            String fileName,
            boolean defaultCv) {

        this.candidate = candidate;
        this.fileUrl = fileUrl;
        this.fileName = fileName;
        this.defaultCv = defaultCv;
    }

    public void changeDefault(boolean defaultCv) {
        this.defaultCv = defaultCv;
    }
}