-- V9: Rút gọn gói dịch vụ của nhà tuyển dụng còn 2 gói: Basic (miễn phí)
-- và Pro (trả phí). Yêu cầu nghiệp vụ: nhà tuyển dụng có gói Pro thì tin
-- đăng được ưu tiên lên đầu + hiển thị nổi bật, và được tìm hồ sơ ứng viên
-- (3 quyền này khớp đúng 3 cột can_prioritize_jobs / can_highlight_jobs /
-- can_search_candidates có sẵn trong bảng packages).
--
-- Các gói cũ của dữ liệu mẫu V4 (Cơ bản / Chuyên nghiệp / Doanh nghiệp)
-- được TẮT (is_active = 0) thay vì xóa, vì đã có đơn hàng và lượt đăng ký
-- tham chiếu tới — trang quản lý gói của admin vẫn xem/sửa được chúng.

UPDATE packages SET is_active = 0;

-- Basic: gói mặc định của mọi nhà tuyển dụng, không cần đăng ký —
-- hệ thống coi nhà tuyển dụng không có gói trả phí nào đang hiệu lực
-- là đang dùng Basic. Dòng này chủ yếu để admin nhìn thấy và chỉnh giới hạn.
INSERT INTO packages (name, price, duration_days, job_post_limit, cv_view_limit,
                      included_tokens, can_highlight_jobs, can_prioritize_jobs,
                      can_search_candidates, can_direct_contact, is_active)
SELECT 'Basic', 0, 365, 5, 20, 0, 0, 0, 0, 0, 1
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE name = 'Basic');

-- Pro: 499.000đ / 30 ngày, tặng 100 Token, không giới hạn số tin đăng và
-- lượt xem CV, bật cả 3 quyền ưu tiên / nổi bật / tìm ứng viên + liên hệ
-- trực tiếp. Giá và giới hạn chỉnh lại được ở trang Quản lý gói dịch vụ.
INSERT INTO packages (name, price, duration_days, job_post_limit, cv_view_limit,
                      included_tokens, can_highlight_jobs, can_prioritize_jobs,
                      can_search_candidates, can_direct_contact, is_active)
SELECT 'Pro', 499000, 30, NULL, NULL, 100, 1, 1, 1, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE name = 'Pro');
