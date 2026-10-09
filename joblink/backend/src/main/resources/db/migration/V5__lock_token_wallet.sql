DROP TRIGGER IF EXISTS trg_token_transactions_before_insert;

DELIMITER $$

CREATE TRIGGER trg_token_transactions_before_insert
BEFORE INSERT ON token_transactions
FOR EACH ROW
BEGIN
    DECLARE v_balance INT DEFAULT NULL;

    SELECT balance
    INTO v_balance
    FROM token_wallets
    WHERE user_id = NEW.wallet_id
    FOR UPDATE;

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

DELIMITER ;