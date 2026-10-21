-- Ảnh bìa cho hồ sơ công ty: trang Hồ sơ công ty phía nhà tuyển
-- dụng cho tải ảnh bìa từ máy tính (giống logo); database chỉ giữ
-- đường dẫn API của ảnh, file nằm ở thư mục ảnh của máy chủ.
ALTER TABLE companies ADD COLUMN cover VARCHAR(500) NULL;
