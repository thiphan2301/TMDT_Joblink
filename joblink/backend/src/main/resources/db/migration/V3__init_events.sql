-- Flyway V3: Event Scheduler jobs
-- Chay dinh ky moi ngay: het han tin, het han goi, tat khuyen mai het han
--
-- LUU Y: Event chi chay khi Event Scheduler cua MySQL dang bat.
-- Chay 1 lan voi quyen admin (VD trong MySQL Workbench):
--     SET GLOBAL event_scheduler = ON;

DELIMITER $$

-- 1. Het han tin tuyen dung da qua deadline
CREATE EVENT IF NOT EXISTS ev_expire_jobs
ON SCHEDULE EVERY 1 DAY STARTS CURRENT_TIMESTAMP
ON COMPLETION PRESERVE
DO BEGIN
    UPDATE jobs SET status = 'expired'
    WHERE deadline < CURDATE() AND status = 'open';
END$$

-- 2. Het han goi dang ky da qua end_at
CREATE EVENT IF NOT EXISTS ev_expire_subscriptions
ON SCHEDULE EVERY 1 DAY STARTS CURRENT_TIMESTAMP
ON COMPLETION PRESERVE
DO BEGIN
    UPDATE subscriptions SET status = 'expired'
    WHERE end_at < NOW() AND status = 'active';
END$$

-- 3. Tat khuyen mai da het han
CREATE EVENT IF NOT EXISTS ev_deactivate_expired_promotions
ON SCHEDULE EVERY 1 DAY STARTS CURRENT_TIMESTAMP
ON COMPLETION PRESERVE
DO BEGIN
    UPDATE promotions SET is_active = FALSE
    WHERE end_at < NOW() AND is_active = TRUE;
END$$

DELIMITER ;
