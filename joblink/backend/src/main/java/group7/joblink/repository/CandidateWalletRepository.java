package group7.joblink.repository;

import group7.joblink.entity.TokenWallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

// Tổng hợp ví Token của ứng viên: tổng đã nhận / đã chi tính thẳng
// từ sổ giao dịch token_transactions (wallet_id = user_id).
public interface CandidateWalletRepository extends JpaRepository<TokenWallet, Integer> {

    // Trả một hàng [total_received, total_spent].
    @Query(value = """
        SELECT COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0),
               COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0)
        FROM token_transactions
        WHERE wallet_id = :userId
        """, nativeQuery = true)
    List<Object[]> findTotals(@Param("userId") Integer userId);
}
