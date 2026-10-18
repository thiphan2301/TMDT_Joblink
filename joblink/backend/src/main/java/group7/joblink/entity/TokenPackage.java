package group7.joblink.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

// Gói Token bán lẻ (bảng token_packages): mua một lần, nạp Token vào ví.
@Entity
@Table(name = "token_packages")
@Getter
@NoArgsConstructor
public class TokenPackage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private Integer tokens;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal price;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    public TokenPackage(Integer tokens, BigDecimal price, boolean active) {
        update(tokens, price, active);
    }

    public void update(Integer tokens, BigDecimal price, boolean active) {
        this.tokens = tokens;
        this.price = price;
        this.active = active;
    }
}
