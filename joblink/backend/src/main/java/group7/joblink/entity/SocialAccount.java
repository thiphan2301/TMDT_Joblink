package group7.joblink.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// Liên kết giữa tài khoản JobLink và tài khoản Google/Facebook.
@Entity
@Table(name = "social_accounts")
@Getter
@NoArgsConstructor
public class SocialAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Provider provider;

    // Mã định danh cố định do Google/Facebook cấp (Google: "sub").
    @Column(name = "provider_user_id", nullable = false, length = 255)
    private String providerUserId;

    @Column(
        name = "created_at",
        nullable = false,
        insertable = false,
        updatable = false
    )
    private LocalDateTime createdAt;

    public SocialAccount(User user, Provider provider, String providerUserId) {
        this.user = user;
        this.provider = provider;
        this.providerUserId = providerUserId;
    }

    // Giá trị khớp với ENUM trong database.
    public enum Provider {
        google,
        facebook
    }
}
