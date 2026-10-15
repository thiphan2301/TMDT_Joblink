-- Chỉ sử dụng V7 nếu lịch sử Flyway chưa có version 7.
-- Nếu DB đã có social_accounts hãy đối chiếu cấu trúc trước khi chạy.
CREATE TABLE social_accounts (
                                 id BIGINT NOT NULL AUTO_INCREMENT,
                                 user_id INT NOT NULL,
                                 provider ENUM('google','facebook') NOT NULL,
                                 provider_user_id VARCHAR(255) NOT NULL,
                                 PRIMARY KEY (id),
                                 CONSTRAINT uq_social_provider_user UNIQUE (provider, provider_user_id),
                                 CONSTRAINT uq_social_user_provider UNIQUE (user_id, provider),
                                 CONSTRAINT fk_social_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
