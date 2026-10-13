package group7.joblink.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    // NULL với tài khoản chỉ đăng nhập bằng Google/Facebook.
    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(
        name = "created_at",
        nullable = false,
        insertable = false,
        updatable = false
    )
    private LocalDateTime createdAt;

    // Tạo tài khoản mới chưa có mật khẩu (đăng ký qua mạng xã hội).
    public User(String email, Role role) {
        this.email = email;
        this.role = role;
        this.status = Status.active;
    }

    // Giá trị khớp với ENUM trong database.
    public enum Role {
        candidate,
        employer,
        admin
    }

    public enum Status {
        active,
        locked
    }
}
