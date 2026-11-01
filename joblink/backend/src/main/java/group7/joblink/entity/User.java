
package group7.joblink.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    // NULL nếu tài khoản chỉ đăng nhập bằng Google
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
            insertable = false,
            updatable = false
    )
    private LocalDateTime createdAt;

    @Column(name = "reset_token_hash", length = 64)
    private String resetTokenHash;
    @Column(name = "reset_expires_at")
    private LocalDateTime resetExpiresAt;
    @Column(name = "reset_requested_at")
    private LocalDateTime resetRequestedAt;

    public String getResetTokenHash() { return resetTokenHash; }
    public void setResetTokenHash(String value) { resetTokenHash = value; }
    public LocalDateTime getResetExpiresAt() { return resetExpiresAt; }
    public void setResetExpiresAt(LocalDateTime value) { resetExpiresAt = value; }
    public LocalDateTime getResetRequestedAt() { return resetRequestedAt; }
    public void setResetRequestedAt(LocalDateTime value) { resetRequestedAt = value; }

    @Column(name = "sessions_invalid_before", nullable = false)
    private long sessionsInvalidBefore;
    public long getSessionsInvalidBefore() { return sessionsInvalidBefore; }
    public void setSessionsInvalidBefore(long value) { sessionsInvalidBefore = value; }

    public enum Role {
        candidate,
        employer,
        admin
    }

    public enum Status {
        active,
        locked
    }

    public User() {
    }

    public User(String email, Role role) {
        this.email = email;
        this.role = role;
        this.status = Status.active;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
