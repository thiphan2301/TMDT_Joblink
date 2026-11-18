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

    @Query(value = """
        SELECT t.id, t.type, t.amount, t.balance_after, t.ref_type, t.ref_id,
               t.created_at, o.order_code, p.amount, p.gateway
        FROM token_transactions t
        LEFT JOIN orders o ON o.id = t.order_id
        LEFT JOIN payments p ON p.order_id = o.id AND p.status = 'success'
        WHERE t.wallet_id = :userId
        ORDER BY t.created_at DESC, t.id DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> findRecentTransactionsWithPaymentDetails(
            @Param("userId") Integer userId,
            @Param("limit") int limit);
}
