package group7.joblink.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "assistant_documents",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_assistant_documents_source",
                columnNames = {"source_type", "source_id"}))
@Getter
@NoArgsConstructor
public class AssistantDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_type", nullable = false, length = 20)
    private String sourceType;

    @Column(name = "source_id", nullable = false)
    private Integer sourceId;

    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String content;

    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String embedding;

    @Column(name = "content_hash", nullable = false, length = 64)
    private String contentHash;

    @Column(name = "indexed_at", nullable = false,
            insertable = false, updatable = false)
    private LocalDateTime indexedAt;

    public AssistantDocument(
            String sourceType,
            Integer sourceId,
            String content,
            String embedding,
            String contentHash) {
        this.sourceType = sourceType;
        this.sourceId = sourceId;
        this.content = content;
        this.embedding = embedding;
        this.contentHash = contentHash;
    }

    public void update(String content, String embedding, String contentHash) {
        this.content = content;
        this.embedding = embedding;
        this.contentHash = contentHash;
    }
}
