ALTER TABLE users
    ADD COLUMN sessions_invalid_before BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN reset_token_hash VARCHAR(64) NULL,
    ADD COLUMN reset_expires_at DATETIME(6) NULL,
    ADD COLUMN reset_requested_at DATETIME(6) NULL,
    ADD UNIQUE INDEX uk_users_reset_token_hash (reset_token_hash);
