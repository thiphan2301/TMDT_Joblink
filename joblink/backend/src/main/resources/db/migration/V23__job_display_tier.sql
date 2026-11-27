-- =====================================================
-- Flyway V23: Goi dich vu cua tin tuyen dung tai thoi diem dang
--
--  - display_tier luu goi (basic / pro / premium) cua nha tuyen dung
--    LUC DANG TIN (lan dau chuyen sang 'open'). Mua goi moi, het han
--    hay bi ha goi khong lam doi quyen loi cua tin da dang truoc do.
--  - Trang viec lam xep tin theo display_tier (premium > pro > basic),
--    cung goi thi tin dang moi hon truoc, cung goi + cung ngay dang
--    thi xao ngau nhien moi lan tai trang.
--  - Du lieu cu: tin dang co co uu tien -> 'pro'; neu luc dang tin nha
--    tuyen dung co luot dang ky Premium con hieu luc -> 'premium';
--    con lai 'basic'.
-- =====================================================

ALTER TABLE jobs
    ADD COLUMN display_tier ENUM('basic', 'pro', 'premium') NOT NULL DEFAULT 'basic';

UPDATE jobs
SET display_tier = 'pro'
WHERE is_prioritized = 1;

UPDATE jobs j
JOIN companies c ON c.id = j.company_id
SET j.display_tier = 'premium'
WHERE j.is_prioritized = 1
  AND EXISTS (
      SELECT 1
      FROM subscriptions s
      JOIN packages p ON p.id = s.package_id
      WHERE s.employer_id = c.owner_id
        AND p.name = 'Premium'
        AND s.start_at <= COALESCE(j.published_at, j.created_at)
        AND s.end_at > COALESCE(j.published_at, j.created_at)
  );
