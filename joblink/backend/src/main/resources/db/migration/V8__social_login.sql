
-- =====================================================
-- Flyway V7: Dang nhap bang mang xa hoi (Google, Facebook)
--
--  - Tai khoan tao qua Google/Facebook khong co mat khau
--    -> cho phep users.password_hash = NULL
--
--  - Bang social_accounts luu lien ket user
--    voi tai khoan mang xa hoi.
--
--  - provider_user_id la ma dinh danh co dinh
--    do Google/Facebook cap.
--
--  - Google su dung truong "sub" trong ID token,
--    khong thay doi khi nguoi dung doi email.
--
--  - Moi user chi lien ket toi da 1 tai khoan
--    cho moi provider.
--
--  - Khi xoa user, lien ket mang xa hoi
--    se tu dong bi xoa.
--
--  - Khoa chinh social_accounts.id su dung BIGINT
--    de dong bo voi Java Entity su dung Long.
-- =====================================================


-- 1. Cho phep tai khoan Google khong co mat khau
ALTER TABLE users
    MODIFY COLUMN password_hash VARCHAR(255) NULL;


-- 2. Tao bang lien ket tai khoan mang xa hoi
CREATE TABLE social_accounts (

    -- Khoa chinh BIGINT
                                 id BIGINT NOT NULL AUTO_INCREMENT,

    -- ID nguoi dung trong bang users
                                 user_id INT NOT NULL,

    -- Nha cung cap dang nhap
                                 provider ENUM('google', 'facebook') NOT NULL,

    -- ID nguoi dung do Google/Facebook cung cap
                                 provider_user_id VARCHAR(255) NOT NULL,

    -- Thoi gian lien ket tai khoan
                                 created_at TIMESTAMP NOT NULL
                                     DEFAULT CURRENT_TIMESTAMP,

                                 PRIMARY KEY (id),

    -- Moi tai khoan Google/Facebook chi lien ket 1 lan
                                 UNIQUE KEY uq_social_accounts_provider_user
                                     (provider, provider_user_id),

    -- Moi user chi co 1 tai khoan cho moi provider
                                 UNIQUE KEY uq_social_accounts_user_provider
                                     (user_id, provider),

    -- Khoa ngoai lien ket voi bang users
                                 CONSTRAINT fk_social_accounts_user
                                     FOREIGN KEY (user_id)
                                         REFERENCES users(id)
                                         ON DELETE CASCADE

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
