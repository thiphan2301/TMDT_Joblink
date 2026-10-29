ALTER TABLE company_reviews ADD COLUMN updated_at DATETIME DEFAULT NULL;
ALTER TABLE company_reviews MODIFY COLUMN rating INT;