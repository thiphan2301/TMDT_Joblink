-- =====================================================
-- Flyway V6: Dang nhap bang mang xa hoi (Google, Facebook)
--
--  - Tai khoan tao qua Google/Facebook khong co mat khau
--    -> cho phep users.password_hash = NULL
--  - Bang social_accounts luu lien ket user <-> tai khoan mang xa hoi.
--    provider_user_id la ma dinh danh co dinh ma Google/Facebook cap
--    (Google: truong "sub" trong ID token), khong doi khi user doi email.
--  - Moi user chi lien ket toi da 1 tai khoan cho moi provider.
-- =====================================================

ALTER TABLE users MODIFY password_hash VARCHAR(255) NULL;

CREATE TABLE social_accounts (
                                 id INT NOT NULL AUTO_INCREMENT,
                                 user_id INT NOT NULL,
                                 provider ENUM('google','facebook') NOT NULL,
                                 provider_user_id VARCHAR(255) NOT NULL,
                                 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 PRIMARY KEY (id),
                                 UNIQUE KEY uq_social_accounts_provider_user (provider, provider_user_id),
                                 UNIQUE KEY uq_social_accounts_user_provider (user_id, provider),
                                 CONSTRAINT fk_social_accounts_user FOREIGN KEY (user_id)
                                     REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
