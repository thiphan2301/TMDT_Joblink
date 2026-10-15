package group7.joblink.repository;

import group7.joblink.entity.TokenTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TokenTransactionRepository
        extends JpaRepository<TokenTransaction, Integer> {
}