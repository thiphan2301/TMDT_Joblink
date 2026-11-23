-- Giữ lịch sử, không xóa hồ sơ đã rút.
ALTER TABLE applications MODIFY status ENUM('pending','viewed','invited','rejected','hired','withdrawn') NOT NULL DEFAULT 'pending';
ALTER TABLE application_status_history
 MODIFY from_status ENUM('pending','viewed','invited','rejected','hired','withdrawn') NULL,
 MODIFY to_status ENUM('pending','viewed','invited','rejected','hired','withdrawn') NOT NULL;
