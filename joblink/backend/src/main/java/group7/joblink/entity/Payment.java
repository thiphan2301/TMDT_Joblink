package group7.joblink.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Getter
@NoArgsConstructor
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(length = 50)
    private String gateway;

    @Column(name = "transaction_code", length = 100)
    private String transactionCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "paid_at", insertable = false, updatable = false)
    private LocalDateTime paidAt;

    public Payment(Order order, BigDecimal amount, String gateway) {
        this.order = order;
        this.amount = amount;
        this.gateway = gateway;
        this.status = Status.pending;
    }

    public void markSuccess(String transactionCode) {
        this.transactionCode = transactionCode;
        this.status = Status.success;
    }

    public void markFailed() {
        this.status = Status.failed;
    }

    public enum Status {
        pending,
        success,
        failed,
        refunded
    }
}
