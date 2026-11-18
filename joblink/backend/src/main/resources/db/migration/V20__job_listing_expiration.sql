ALTER TABLE jobs
    ADD COLUMN published_at DATETIME NULL,
    ADD COLUMN listing_expires_at DATETIME
        GENERATED ALWAYS AS (
            DATE_ADD(COALESCE(published_at, created_at), INTERVAL display_days DAY)
        ) STORED;

UPDATE jobs
SET published_at = created_at
WHERE status = 'open' AND published_at IS NULL;
