-- =====================================================
-- Flyway V7: Thoi gian hien thi va chi phi Token cua tin tuyen dung
--
--  - admin quy dinh moi tin hien thi 7 ngay, ton 20 Token,
--  - Them 2 cot vao bang jobs, mac dinh 7 ngay / 20 Token cho ca
--    tin cu lan tin moi; het han hien thi = created_at + display_days.
-- =====================================================

ALTER TABLE jobs
    ADD COLUMN display_days INT NOT NULL DEFAULT 7,
    ADD COLUMN token_cost INT NOT NULL DEFAULT 20;
