package group7.joblink.repository;

import group7.joblink.entity.AssistantDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssistantDocumentRepository
        extends JpaRepository<AssistantDocument, Long> {

    List<AssistantDocument> findBySourceType(String sourceType);

    void deleteBySourceType(String sourceType);

    void deleteBySourceTypeAndSourceIdNotIn(
            String sourceType, List<Integer> sourceIds);
}
