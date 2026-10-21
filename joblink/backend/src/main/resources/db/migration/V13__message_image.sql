-- Chat gui anh dinh kem: them cot duong dan anh cho bang messages.
-- Tin chi co anh thi content de rong va image_url chua duong dan
-- /api/chat/images/<ten file>; tin chu thi image_url NULL.
ALTER TABLE messages ADD COLUMN image_url VARCHAR(500) NULL;
