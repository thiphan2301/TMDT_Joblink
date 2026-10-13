package group7.joblink.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "companies")
@Getter
@NoArgsConstructor
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "tax_code", unique = true, length = 14)
    private String taxCode;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 500)
    private String logo;

    @Column(length = 500)
    private String address;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(length = 100)
    private String industry;

    @Column(length = 50)
    private String size;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false)
    private VerificationStatus verificationStatus;

    // Giá trị khớp với ENUM trong database.
    public enum VerificationStatus {
        pending,
        verified,
        rejected
    }
}