package group7.joblink.repository;

import group7.joblink.entity.TokenWallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

// Lịch sử giao dịch Token của nhà tuyển dụng (trang Ví Token).
// token_transactions.wallet_id chính là user_id của chủ ví.
public interface EmployerTokenRepository extends JpaRepository<TokenWallet, Integer> {

    // Trả [id, type, amount, balance_after, ref_type, ref_id, created_at]
    @Query(value = """
        SELECT id, type, amount, balance_after, ref_type, ref_id, created_at
        FROM token_transactions
        WHERE wallet_id = :userId
        ORDER BY created_at DESC, id DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> findRecentTransactions(@Param("userId") Integer userId,
                                          @Param("limit") int limit);
}
