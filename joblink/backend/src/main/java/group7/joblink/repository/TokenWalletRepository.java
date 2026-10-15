package group7.joblink.repository;

import group7.joblink.entity.TokenWallet;
import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface TokenWalletRepository
        extends JpaRepository<TokenWallet, Integer> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT w
        FROM TokenWallet w
        WHERE w.userId = :userId
        """)
    Optional<TokenWallet> findForUpdate(
            @Param("userId") Integer userId);
}