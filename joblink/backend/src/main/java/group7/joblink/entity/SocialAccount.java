package group7.joblink.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "social_accounts", uniqueConstraints = {
        @UniqueConstraint(name = "uq_social_provider_user", columnNames = {"provider", "provider_user_id"}),
        @UniqueConstraint(name = "uq_social_user_provider", columnNames = {"user_id", "provider"})
})
public class SocialAccount {
    public enum Provider { google, facebook }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Provider provider;

    @Column(name = "provider_user_id", nullable = false, length = 255)
    private String providerUserId;

    protected SocialAccount() {}

    public SocialAccount(User user, Provider provider, String providerUserId) {
        this.user = user;
        this.provider = provider;
        this.providerUserId = providerUserId;
    }
    public Long getId() { return id; }
    public User getUser() { return user; }
    public Provider getProvider() { return provider; }
    public String getProviderUserId() { return providerUserId; }
}
