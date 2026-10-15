package group7.joblink.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "token_wallets")
@Getter
@NoArgsConstructor
public class TokenWallet {

    @Id
    @Column(name = "user_id")
    private Integer userId;

    // Ví đã do trigger tạo và cập nhật. nên ko cần ghi đề số dư
    @Column(nullable = false, insertable = false, updatable = false)
    private Integer balance;
}