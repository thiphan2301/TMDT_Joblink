ALTER TABLE company_reviews
    ADD COLUMN sentiment ENUM('negative', 'neutral', 'positive') NULL DEFAULT NULL,
    ADD KEY idx_company_reviews_sentiment (company_id, status, sentiment, created_at);
