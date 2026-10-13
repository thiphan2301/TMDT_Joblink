package group7.joblink.repository;

import group7.joblink.entity.SocialAccount;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SocialAccountRepository
        extends JpaRepository<SocialAccount, Integer> {

    // Tìm liên kết theo mã Google/Facebook; tải kèm user.
    @EntityGraph(attributePaths = {"user"})
    Optional<SocialAccount> findByProviderAndProviderUserId(
        SocialAccount.Provider provider,
        String providerUserId
    );

    // User đã liên kết tài khoản của provider này chưa.
    boolean existsByUser_IdAndProvider(
        Integer userId,
        SocialAccount.Provider provider
    );
}
