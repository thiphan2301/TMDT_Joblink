CREATE TABLE assistant_documents (
    id BIGINT NOT NULL AUTO_INCREMENT,
    source_type VARCHAR(20) NOT NULL,
    source_id INT NOT NULL,
    content LONGTEXT NOT NULL,
    embedding LONGTEXT NOT NULL,
    content_hash CHAR(64) NOT NULL,
    indexed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_assistant_documents_source UNIQUE (source_type, source_id),
    INDEX idx_assistant_documents_source_type (source_type)
);
