-- Flyway V2: Triggers
-- MySQL triggers: tu dong tao vi token, dong bo so du vi, tu set paid_at

DELIMITER $$

-- 1. Tu tao vi token (tang 20 token chao mung) khi co user moi
CREATE TRIGGER trg_users_after_insert AFTER INSERT ON users FOR EACH ROW
BEGIN
    INSERT INTO token_wallets (user_id, balance) VALUES (NEW.id, 20);
END$$

-- 2. Truoc khi ghi giao dich token: tu tinh balance_after + chan tru am so du
CREATE TRIGGER trg_token_transactions_before_insert BEFORE INSERT ON token_transactions FOR EACH ROW
BEGIN
    DECLARE v_balance INT;

    SELECT balance INTO v_balance FROM token_wallets WHERE user_id = NEW.wallet_id;

    IF v_balance IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Token wallet does not exist';
    END IF;

    IF v_balance + NEW.amount < 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Insufficient token balance';
    END IF;

    SET NEW.balance_after = v_balance + NEW.amount;
END$$

-- 3. Sau khi ghi giao dich token: cong/tru so du vi
CREATE TRIGGER trg_token_transactions_after_insert AFTER INSERT ON token_transactions FOR EACH ROW
BEGIN
    UPDATE token_wallets SET balance = NEW.balance_after WHERE user_id = NEW.wallet_id;
END$$

-- 4. Tu set paid_at khi don hang chuyen sang 'paid'
CREATE TRIGGER trg_orders_before_update BEFORE UPDATE ON orders FOR EACH ROW
BEGIN
    IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
        SET NEW.paid_at = CURRENT_TIMESTAMP;
    END IF;
END$$

-- 5. Tu set paid_at khi thanh toan chuyen sang 'success'
CREATE TRIGGER trg_payments_before_update BEFORE UPDATE ON payments FOR EACH ROW
BEGIN
    IF NEW.status = 'success' AND OLD.status <> 'success' THEN
        SET NEW.paid_at = CURRENT_TIMESTAMP;
    END IF;
END$$

DELIMITER ;
