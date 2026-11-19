package group7.joblink.service;

import group7.joblink.dto.response.CandidateResponses.AssistantJobCard;
import group7.joblink.entity.AssistantDocument;
import group7.joblink.repository.AssistantDocumentRepository;
import group7.joblink.repository.AssistantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AssistantIndexService {

    private static final Logger log =
            LoggerFactory.getLogger(AssistantIndexService.class);
    private static final String SOURCE_TYPE = "job";
    private static final int MAX_DOCUMENT_CHARACTERS = 2500;

    private final AssistantRepository assistantRepository;
    private final AssistantDocumentRepository documentRepository;
    private final OllamaAssistantClient ollama;
    private final ObjectMapper objectMapper;

    public AssistantIndexService(
            AssistantRepository assistantRepository,
            AssistantDocumentRepository documentRepository,
            OllamaAssistantClient ollama,
            ObjectMapper objectMapper) {
        this.assistantRepository = assistantRepository;
        this.documentRepository = documentRepository;
        this.ollama = ollama;
        this.objectMapper = objectMapper;
    }

    public synchronized List<RelevantJob> findRelevantJobs(
            String question, int limit) {
        List<Object[]> rows = assistantRepository.findPublicJobDocuments();
        refresh(rows);
        if (rows.isEmpty()) {
            return List.of();
        }

        List<Double> queryVector = ollama.embed(List.of(question)).get(0);
        Map<Integer, Object[]> currentJobs = rows.stream()
                .collect(Collectors.toMap(row -> integer(row[0]), row -> row));
        List<AssistantDocument> documents =
                documentRepository.findBySourceType(SOURCE_TYPE);

        return documents.stream()
                .filter(document -> currentJobs.containsKey(document.getSourceId()))
                .map(document -> new ScoredJob(
                        document,
                        card(currentJobs.get(document.getSourceId())),
                        cosineSimilarity(queryVector, parseVector(document.getEmbedding()))))
                .filter(scored -> scored.score() > 0)
                .sorted(Comparator.comparingDouble(ScoredJob::score).reversed())
                .limit(limit)
                .map(scored -> new RelevantJob(scored.card(), scored.document().getContent()))
                .toList();
    }

    @Scheduled(
            fixedDelayString = "${app.assistant.index.fixed-delay-ms:3600000}",
            initialDelayString = "${app.assistant.index.initial-delay-ms:20000}")
    public void refreshScheduled() {
        try {
            refresh(assistantRepository.findPublicJobDocuments());
        } catch (ResponseStatusException exception) {
            log.warn("Chưa làm mới được chỉ mục việc làm cho trợ lý: {}",
                    exception.getReason());
        }
    }

    private void refresh(List<Object[]> rows) {
        List<AssistantDocument> existing =
                documentRepository.findBySourceType(SOURCE_TYPE);
        Map<Integer, AssistantDocument> bySourceId = existing.stream()
                .collect(Collectors.toMap(
                        AssistantDocument::getSourceId, document -> document));
        List<Integer> currentIds = new ArrayList<>(rows.size());
        List<PendingDocument> changed = new ArrayList<>();

        for (Object[] row : rows) {
            Integer jobId = integer(row[0]);
            String content = documentContent(row);
            String hash = sha256(ollama.embeddingModelName() + "\n" + content);
            currentIds.add(jobId);
            AssistantDocument previous = bySourceId.get(jobId);
            if (previous == null || !hash.equals(previous.getContentHash())) {
                changed.add(new PendingDocument(jobId, content, hash, previous));
            }
        }

        if (!changed.isEmpty()) {
            List<List<Double>> vectors = ollama.embed(
                    changed.stream().map(PendingDocument::content).toList());
            List<AssistantDocument> updates = new ArrayList<>(changed.size());
            for (int i = 0; i < changed.size(); i++) {
                PendingDocument pending = changed.get(i);
                String embedding = objectMapper.writeValueAsString(vectors.get(i));
                if (pending.existing() == null) {
                    updates.add(new AssistantDocument(
                            SOURCE_TYPE, pending.sourceId(), pending.content(),
                            embedding, pending.contentHash()));
                } else {
                    pending.existing().update(
                            pending.content(), embedding, pending.contentHash());
                    updates.add(pending.existing());
                }
            }
            documentRepository.saveAll(updates);
        }

        if (currentIds.isEmpty()) {
            documentRepository.deleteBySourceType(SOURCE_TYPE);
        } else {
            documentRepository.deleteBySourceTypeAndSourceIdNotIn(
                    SOURCE_TYPE, currentIds);
        }
    }

    private static String documentContent(Object[] row) {
        String content = """
                Tin tuyển dụng đang mở
                Vị trí: %s
                Công ty: %s
                Địa điểm: %s
                Loại công việc: %s
                Cấp bậc: %s
                Lương: %s - %s %s
                Mô tả: %s
                Yêu cầu: %s
                Giới thiệu công ty: %s
                """.formatted(
                text(row[1]), text(row[4]), text(row[6]), text(row[7]),
                text(row[8]), text(row[9]), text(row[10]), text(row[11]),
                text(row[2]), text(row[3]), text(row[5]));
        return content.length() <= MAX_DOCUMENT_CHARACTERS
                ? content
                : content.substring(0, MAX_DOCUMENT_CHARACTERS);
    }

    private static AssistantJobCard card(Object[] row) {
        return new AssistantJobCard(
                integer(row[0]),
                text(row[1]),
                text(row[4]),
                decimal(row[9]),
                decimal(row[10]),
                text(row[11]),
                text(row[6]));
    }

    private List<Double> parseVector(String json) {
        return objectMapper.readValue(json,
                new tools.jackson.core.type.TypeReference<>() {});
    }

    static double cosineSimilarity(List<Double> left, List<Double> right) {
        if (left.isEmpty() || left.size() != right.size()) {
            return 0;
        }
        double dot = 0;
        double leftNorm = 0;
        double rightNorm = 0;
        for (int i = 0; i < left.size(); i++) {
            double a = left.get(i);
            double b = right.get(i);
            dot += a * b;
            leftNorm += a * a;
            rightNorm += b * b;
        }
        if (leftNorm == 0 || rightNorm == 0) {
            return 0;
        }
        return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
    }

    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable.", exception);
        }
    }

    private static String text(Object value) {
        return value == null ? "không có thông tin" : value.toString();
    }

    private static Integer integer(Object value) {
        return value == null ? null : ((Number) value).intValue();
    }

    private static BigDecimal decimal(Object value) {
        if (value == null) {
            return null;
        }
        return value instanceof BigDecimal amount
                ? amount
                : new BigDecimal(value.toString());
    }

    public record RelevantJob(AssistantJobCard card, String content) {
    }

    private record PendingDocument(
            Integer sourceId,
            String content,
            String contentHash,
            AssistantDocument existing) {
    }

    private record ScoredJob(
            AssistantDocument document,
            AssistantJobCard card,
            double score) {
    }
}
