package group7.joblink.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "token_transactions")
@Getter
@NoArgsConstructor
public class TokenTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wallet_id", nullable = false)
    private TokenWallet wallet;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;

    @Column(nullable = false)
    private Integer amount;

    // Giá trị gửi ban đầu là 0; BEFORE INSERT trigger tính lại.
    @Column(name = "balance_after", nullable = false, updatable = false)
    private Integer balanceAfter;

    @Column(
            name = "idempotency_key",
            nullable = false,
            unique = true,
            length = 100
    )
    private String idempotencyKey;

    @Column(name = "order_id")
    private Integer orderId;

    @Column(name = "ref_type", length = 50)
    private String refType;

    @Column(name = "ref_id")
    private Integer refId;

    @Column(
            name = "created_at",
            nullable = false,
            insertable = false,
            updatable = false
    )
    private LocalDateTime createdAt;

    public static TokenTransaction forApplication(
            TokenWallet wallet,
            Integer applicationId,
            int cost) {

        TokenTransaction transaction = new TokenTransaction();

        transaction.wallet = wallet;
        transaction.type = Type.spend;
        transaction.amount = -cost;
        transaction.balanceAfter = 0;
        transaction.idempotencyKey = "application:" + applicationId;
        transaction.refType = "application";
        transaction.refId = applicationId;

        return transaction;
    }

    public enum Type {
        welcome,
        purchase,
        spend,
        refund,
        adjustment
    }
}