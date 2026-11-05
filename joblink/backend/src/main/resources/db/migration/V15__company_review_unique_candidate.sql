ALTER TABLE company_reviews
    ADD CONSTRAINT uq_company_review_user UNIQUE (company_id, candidate_id);
