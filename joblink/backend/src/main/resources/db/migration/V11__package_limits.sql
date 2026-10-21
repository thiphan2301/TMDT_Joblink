-- V11: Đặt giới hạn HỮU HẠN cho Pro và Premium.
-- V9/V10 để trống (NULL = không giới hạn, giao diện hiện "∞") cho cả hai
-- gói — như vậy Premium không hơn Pro ở điểm nào đáng kể, không ai có lý
-- do mua Premium. Nay phân cấp rõ theo số lượng: Premium gấp 5 lần số
-- tin đăng và gần 7 lần số lượt xem CV so với Pro.

UPDATE packages SET job_post_limit = 20,  cv_view_limit = 300  WHERE name = 'Pro';
UPDATE packages SET job_post_limit = 100, cv_view_limit = 2000 WHERE name = 'Premium';
