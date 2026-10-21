-- V10: Thêm gói Premium — cấp cao nhất trên Pro, hiển thị nhãn xanh dương
-- ở giao diện admin. Đồng thời tắt lại 3 gói cũ của dữ liệu mẫu V4 cho
-- đúng mô hình gói hiện hành: chỉ Basic / Pro / Premium là đang bán.

UPDATE packages SET is_active = 0
WHERE name IN ('Goi Co ban', 'Goi Chuyen nghiep', 'Goi Doanh nghiep');

-- Premium: 999.000đ / 30 ngày, tặng 300 Token, không giới hạn số tin đăng
-- và lượt xem CV, đủ mọi quyền như Pro (ưu tiên + nổi bật + tìm ứng viên
-- + liên hệ trực tiếp). Giá và giới hạn chỉnh lại được ở trang Quản lý
-- gói dịch vụ.
INSERT INTO packages (name, price, duration_days, job_post_limit, cv_view_limit,
                      included_tokens, can_highlight_jobs, can_prioritize_jobs,
                      can_search_candidates, can_direct_contact, is_active)
SELECT 'Premium', 999000, 30, NULL, NULL, 300, 1, 1, 1, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE name = 'Premium');
