-- =====================================================
-- Flyway V4: Du lieu mau (seed data) cho moi truong dev
-- Chay sau V1 (schema), V2 (triggers), V3 (events).
--
-- LUU Y QUAN TRONG:
--  - Mat khau cua TAT CA user mau la: 123456 (luu dang bcrypt hash).
--  - Trigger trg_users_after_insert TU DONG tao vi token (20 token)
--    moi khi insert users -> khong insert tay vao token_wallets.
--  - Trigger token_transactions TU DONG tinh balance_after va tru/cong vi,
--    nen cot balance_after trong cac INSERT ben duoi chi la gia tri tam.
--  - Neu muon database sach (khong co du lieu mau), xoa file nay
--    truoc khi chay migrate lan dau.
-- =====================================================
use joblink;
-- ================= 1. USERS =================
-- password_hash ben duoi la bcrypt cua chuoi "123456"
INSERT INTO users (id, email, password_hash, role, status) VALUES
(1, 'admin@joblink.vn',       '$2b$10$ZJbPaPyxsuc.TJJ14lM.KOsbp89tYoj6XGRRdH3j4XNwNAGoJKXL2', 'admin',     'active'),
(2, 'hr@fpt-software.vn',     '$2b$10$ZJbPaPyxsuc.TJJ14lM.KOsbp89tYoj6XGRRdH3j4XNwNAGoJKXL2', 'employer',  'active'),
(3, 'hr@tiki.vn',             '$2b$10$ZJbPaPyxsuc.TJJ14lM.KOsbp89tYoj6XGRRdH3j4XNwNAGoJKXL2', 'employer',  'active'),
(4, 'nguyen.van.c@gmail.com', '$2b$10$ZJbPaPyxsuc.TJJ14lM.KOsbp89tYoj6XGRRdH3j4XNwNAGoJKXL2', 'candidate', 'active'),
(5, 'tran.thi.d@gmail.com',   '$2b$10$ZJbPaPyxsuc.TJJ14lM.KOsbp89tYoj6XGRRdH3j4XNwNAGoJKXL2', 'candidate', 'active'),
(6, 'le.van.e@gmail.com',     '$2b$10$ZJbPaPyxsuc.TJJ14lM.KOsbp89tYoj6XGRRdH3j4XNwNAGoJKXL2', 'candidate', 'active');

-- ================= 2. HO SO UNG VIEN =================
INSERT INTO candidate_profiles (user_id, full_name, phone, dob, address, avatar, summary, is_searchable) VALUES
(4, 'Nguyen Van C', '0901234567', '1998-05-12', 'Quan 1, TP.HCM', NULL,
 'Lap trinh vien Backend 3 nam kinh nghiem Java/Spring Boot. Da trien khai nhieu he thong microservices.', TRUE),
(5, 'Tran Thi D', '0912345678', '2000-11-03', 'Quan Cau Giay, Ha Noi', NULL,
 'Frontend Developer chuyen React, 2 nam kinh nghiem, quan tam den UI/UX.', TRUE),
(6, 'Le Van E', '0923456789', '1995-08-25', 'Quan Hai Chau, Da Nang', NULL,
 'Ky su DevOps 5 nam kinh nghiem AWS, Docker, Kubernetes.', TRUE);

-- ================= 3. KY NANG =================
INSERT INTO skills (id, name) VALUES
(1, 'Java'), (2, 'Spring Boot'), (3, 'Python'), (4, 'React'),
(5, 'MySQL'), (6, 'Docker'), (7, 'JavaScript'), (8, 'AWS'),
(9, 'Kubernetes'), (10, 'Figma');

INSERT INTO candidate_skills (candidate_id, skill_id, level, years_exp) VALUES
(4, 1, 'Senior', 3.0), (4, 2, 'Senior', 3.0), (4, 5, 'Middle', 2.5),
(5, 4, 'Middle', 2.0), (5, 7, 'Middle', 2.0), (5, 10, 'Junior', 1.0),
(6, 6, 'Senior', 5.0), (6, 8, 'Senior', 4.0), (6, 9, 'Middle', 3.0);

-- ================= 4. CV =================
-- Moi ung vien toi da 1 CV mac dinh (is_default = TRUE)
INSERT INTO cvs (id, candidate_id, file_url, file_name, is_default) VALUES
(1, 4, '/uploads/cv/cv_nguyenvanc_backend.pdf',  'CV_Backend_Java.pdf', TRUE),
(2, 4, '/uploads/cv/cv_nguyenvanc_full.pdf',    'CV_Full.pdf',         FALSE),
(3, 5, '/uploads/cv/cv_tranthid_frontend.pdf',  'CV_Frontend.pdf',     TRUE),
(4, 6, '/uploads/cv/cv_levane_devops.pdf',      'CV_DevOps.pdf',       TRUE);

-- ================= 5. CONG TY =================
INSERT INTO companies (id, owner_id, name, legal_name, tax_code, description, logo, website, address,
                       industry, size, verification_status, verified_at, verified_by) VALUES
(1, 2, 'FPT Software', 'Cong ty TNHH Phan mem FPT', '0101243150',
 'Don vi xuat khau phan mem hang dau Viet Nam, chuyen gia cong va dich vu CNTT.',
 '/uploads/logo/fpt.png', 'https://fptsoftware.com', 'Tòa FPT, Duy Tan, Cau Giay, Ha Noi',
 'Cong nghe thong tin', '10000+', 'verified', NOW(), 1),
(2, 3, 'Tiki', 'Cong ty Co phan Tiki', '0309532901',
 'San thuong mai dien tu hang dau Viet Nam.',
 '/uploads/logo/tiki.png', 'https://tiki.vn', '52 Ut Tich, Tan Binh, TP.HCM',
 'Thuong mai dien tu', '1000-5000', 'verified', NOW(), 1);

-- ================= 6. TIN TUYEN DUNG =================
INSERT INTO jobs (id, company_id, title, description, requirements,
                 salary_min, salary_max, salary_unit, location, job_type, level, vacancies,
                 working_schedule, deadline, status, is_highlighted, reviewed_by, reviewed_at) VALUES
(1, 1, 'Lap trinh vien Java Backend',
 'Phat trien va bao tri he thong microservices cho khach hang Nhat Ban.',
 'Thanh thao Java 17+, Spring Boot; hieu biet ve Docker, Kafka la loi the.',
 20000000, 35000000, 'month', 'Ha Noi', 'fulltime', 'middle', 3,
 'Thu 2 - Thu 6', CURDATE() + INTERVAL 30 DAY, 'open', FALSE, 1, NOW()),
(2, 1, 'Ky su DevOps',
 'Xay dung va van hanh ha tang CI/CD tren AWS cho cac du an outsource.',
 'Kinh nghiem AWS, Terraform, Jenkins; biet Kubernetes la loi the lon.',
 25000000, 40000000, 'month', 'TP.HCM', 'fulltime', 'senior', 2,
 'Thu 2 - Thu 6', CURDATE() + INTERVAL 45 DAY, 'open', FALSE, 1, NOW()),
(3, 2, 'Frontend Developer (React)',
 'Phat trien giao dien san thuong mai dien tu Tiki, toi uu trai nghiem nguoi dung.',
 'Thanh thao React, TypeScript; co kinh nghiem lam viec voi design system.',
 18000000, 30000000, 'month', 'TP.HCM', 'fulltime', 'middle', 5,
 'Thu 2 - Thu 6', CURDATE() + INTERVAL 20 DAY, 'open', FALSE, 1, NOW()),
(4, 2, 'UI/UX Designer',
 'Thiet ke giao dien ung dung mobile va web cho he sinh thai Tiki.',
 'Thanh thao Figma; co portfolio du an thuc te.',
 15000000, 25000000, 'month', 'TP.HCM', 'fulltime', 'junior', 2,
 'Thu 2 - Thu 6', CURDATE() + INTERVAL 25 DAY, 'pending_review', FALSE, NULL, NULL),
(5, 1, 'Thuc tap sinh Backend',
 'Chuong trinh thuc tap 6 thang cho sinh vien nam cuoi nganh CNTT.',
 'Nam vung OOP, co kien thuc co ban ve Java va SQL.',
 3000000, 5000000, 'month', 'Ha Noi', 'intern', 'fresher', 10,
 'Thu 2 - Thu 6', CURDATE() + INTERVAL 60 DAY, 'draft', FALSE, NULL, NULL),
(6, 2, 'Senior Python Developer',
 'Xay dung he thong goi y san pham bang machine learning.',
 'Thanh thao Python, co kinh nghiem ML/data pipeline.',
 35000000, 55000000, 'month', 'TP.HCM', 'fulltime', 'senior', 2,
 'Thu 2 - Thu 6', CURDATE() + INTERVAL 60 DAY, 'open', TRUE, 1, NOW());

INSERT INTO job_skills (job_id, skill_id) VALUES
(1, 1), (1, 2), (1, 5),
(2, 6), (2, 8), (2, 9),
(3, 4), (3, 7),
(6, 3), (6, 5);

-- ================= 7. UNG TUYEN =================
INSERT INTO applications (id, job_id, candidate_id, cv_id, cover_letter, status) VALUES
(1, 1, 4, 1, 'Toi co 3 nam kinh nghiem Java/Spring Boot, rat mong duoc dong gop cho du an.', 'viewed'),
(2, 3, 5, 3, 'Toi dam me frontend va co 2 nam kinh nghiem React trong du an thuong mai dien tu.', 'invited'),
(3, 1, 6, 4, 'Toi muon thu suc o vi tri backend de mo rong ky nang.', 'pending');

INSERT INTO application_status_history (application_id, from_status, to_status, changed_by, note) VALUES
(1, 'pending', 'viewed', 2, 'Nha tuyen dung da xem ho so'),
(2, 'pending', 'viewed', 3, 'Nha tuyen dung da xem ho so'),
(2, 'viewed', 'invited', 3, 'Moi phong van vong 1');

INSERT INTO interview_invitations (application_id, scheduled_at, location, notes, status) VALUES
(2, NOW() + INTERVAL 2 DAY, 'Tang 10, 52 Ut Tich, Tan Binh, TP.HCM',
 'Phong van truc tiep vong 1: kiem tra ky thuat React + giai bai tap nho.', 'pending');

INSERT INTO wishlists (candidate_id, job_id) VALUES
(4, 3), (5, 6);

-- ================= 8. DANH GIA CONG TY =================
INSERT INTO company_reviews (id, company_id, candidate_id, rating, content, status) VALUES
(1, 1, 4, 5, 'Moi truong lam viec chuyen nghiep, dong nghiep than thien, co hoi onsite Nhat Ban.', 'visible'),
(2, 2, 5, 4, 'Cong viec thu vi, ap luc vua phai, che do phuc loi tot.', 'visible');

INSERT INTO review_replies (review_id, employer_id, content) VALUES
(1, 2, 'Cam on ban da danh gia! FPT Software luon co gang cai thien moi truong lam viec.');

-- ================= 9. CHAT =================
INSERT INTO conversations (id, candidate_id, employer_id, job_id) VALUES
(1, 4, 2, 1);

INSERT INTO messages (conversation_id, sender_id, content, is_read) VALUES
(1, 4, 'Chao anh/chi, em muon hoi them ve yeu cau tieng Nhat cua vi tri Java Backend a.', TRUE),
(1, 2, 'Chao em, vi tri nay khong bat buoc tieng Nhat, co N3 la loi the nhe.', TRUE),
(1, 4, 'Da em hieu roi a, em se nop ho so ngay. Cam on anh/chi!', FALSE);

INSERT INTO chatbot_sessions (id, user_id, title) VALUES
(1, 4, 'Tu van viet CV');

INSERT INTO chatbot_messages (session_id, role, content) VALUES
(1, 'user', 'Lam sao de CV backend cua minh noi bat hon?'),
(1, 'bot', 'Ban nen nhan manh cac du an microservices, chi ro cong nghe (Spring Boot, Kafka) va ket qua cu the (vd: toi uu 30% thoi gian phan hoi).');

-- ================= 10. GOI DANG KY & GOI TOKEN =================
INSERT INTO packages (id, name, price, duration_days, job_post_limit, cv_view_limit, included_tokens,
                      can_highlight_jobs, can_prioritize_jobs, can_search_candidates, can_direct_contact, is_active) VALUES
(1, 'Goi Co ban',       99000,   30,   5,    50,   0, FALSE, FALSE, FALSE, FALSE, TRUE),
(2, 'Goi Chuyen nghiep', 499000, 90,  20,   300,  50, TRUE,  TRUE,  TRUE,  FALSE, TRUE),
(3, 'Goi Doanh nghiep', 1999000, 365, 100, 2000, 200, TRUE,  TRUE,  TRUE,  TRUE,  TRUE);

INSERT INTO token_packages (id, tokens, price, is_active) VALUES
(1, 10, 49000, TRUE),
(2, 50, 199000, TRUE),
(3, 120, 399000, TRUE);

-- ================= 11. KHUYEN MAI =================
INSERT INTO promotions (id, code, discount_type, discount_value, min_order_amount, max_discount_amount,
                        start_at, end_at, usage_limit, per_user_limit, is_active) VALUES
(1, 'WELCOME10', 'percent', 10, NULL, 50000,
 NOW() - INTERVAL 1 DAY, NOW() + INTERVAL 30 DAY, 1000, 1, TRUE),
(2, 'TET2026', 'fixed_amount', 100000, 500000, 100000,
 NOW() - INTERVAL 60 DAY, NOW() - INTERVAL 10 DAY, 500, 1, FALSE);

-- ================= 12. DON HANG / THANH TOAN =================
-- Don 1: mua goi Chuyen nghiep, ap ma WELCOME10 giam 10% (49900), da thanh toan
INSERT INTO orders (id, order_code, user_id, order_type, package_id, token_package_id,
                    subtotal, discount_amount, total_amount, promotion_id, product_snapshot,
                    status, paid_at) VALUES
(1, 'JL2026000001', 2, 'subscription', 2, NULL,
 499000, 49900, 449100, 1,
 '{"ten_goi":"Goi Chuyen nghiep","thoi_han_ngay":90,"so_tin_dang":20,"token_kem":50}',
 'paid', NOW());

-- Don 2: mua goi 50 token, chua thanh toan
INSERT INTO orders (id, order_code, user_id, order_type, package_id, token_package_id,
                    subtotal, discount_amount, total_amount, promotion_id, product_snapshot,
                    status) VALUES
(2, 'JL2026000002', 3, 'token', NULL, 2,
 199000, 0, 199000, NULL,
 '{"so_token":50,"don_gia":199000}',
 'pending');

INSERT INTO promotion_usages (promotion_id, user_id, order_id) VALUES
(1, 2, 1);

INSERT INTO payments (order_id, amount, gateway, transaction_code, status, paid_at) VALUES
(1, 449100, 'vnpay', 'VNP2026000001', 'success', NOW());

INSERT INTO subscriptions (employer_id, package_id, order_id, start_at, end_at, status) VALUES
(2, 2, 1, NOW(), NOW() + INTERVAL 90 DAY, 'active');

INSERT INTO candidate_profile_views (subscription_id, candidate_id, viewed_by) VALUES
(1, 4, 2),
(1, 5, 2);

-- ================= 13. GIAO DICH TOKEN =================
-- Vi cua moi user da duoc trigger tu dong tao san voi 20 token.
-- Giao dich 1: user 2 duoc cong 50 token kem theo goi Chuyen nghiep (don 1) -> vi: 70
INSERT INTO token_transactions (wallet_id, type, amount, balance_after, idempotency_key, order_id, ref_type, ref_id) VALUES
(2, 'purchase', 50, 0, 'seed-txn-001', 1, 'subscription', 1);

-- Giao dich 2: user 3 tieu 10 token de lam noi bat tin dang (job 6) -> vi: 10
INSERT INTO token_transactions (wallet_id, type, amount, balance_after, idempotency_key, order_id, ref_type, ref_id) VALUES
(3, 'spend', -10, 0, 'seed-txn-002', NULL, 'job', 6);
