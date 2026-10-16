CREATE TABLE email_otps (
                            email VARCHAR(255) NOT NULL PRIMARY KEY,
                            password_hash VARCHAR(255) NOT NULL,
                            role VARCHAR(20) NOT NULL,
                            otp_hash VARCHAR(255) NOT NULL,
                            expires_at DATETIME(6) NOT NULL,
                            last_sent_at DATETIME(6) NOT NULL,
                            attempts INT NOT NULL DEFAULT 0,
                            send_count INT NOT NULL DEFAULT 0
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;