package group7.joblink.repository;

import group7.joblink.entity.TokenWallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

// Lịch sử giao dịch Token của nhà tuyển dụng (trang Ví Token).
// token_transactions.wallet_id chính là user_id của chủ ví.
public interface EmployerTokenRepository extends JpaRepository<TokenWallet, Integer> {

    // Trả thông tin giao dịch Token kèm đơn hàng và cổng thanh toán (nếu có).
    @Query(value = """
        SELECT t.id, t.type, t.amount, t.balance_after, t.ref_type, t.ref_id,
               t.created_at, o.order_code, o.total_amount, p.gateway
        FROM token_transactions t
        LEFT JOIN orders o ON o.id = t.order_id
        LEFT JOIN payments p ON p.order_id = o.id
        WHERE t.wallet_id = :userId
        ORDER BY t.created_at DESC, t.id DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> findRecentTransactions(@Param("userId") Integer userId,
                                          @Param("limit") int limit);
}
