package group7.joblink.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class OllamaAssistantClient {

    private static final Logger log =
            LoggerFactory.getLogger(OllamaAssistantClient.class);
    private static final int EMBEDDING_BATCH_SIZE = 32;

    private final RestClient restClient;
    private final String chatModel;
    private final String embeddingModel;
    private final ObjectMapper objectMapper;

    public OllamaAssistantClient(
            @Value("${app.assistant.ollama.base-url:http://localhost:11434}")
            String baseUrl,
            @Value("${app.assistant.ollama.chat-model:qwen2.5:3b}")
            String chatModel,
            @Value("${app.assistant.ollama.embedding-model:nomic-embed-text}")
            String embeddingModel,
            @Value("${app.assistant.ollama.timeout-seconds:120}")
            int timeoutSeconds,
            ObjectMapper objectMapper) {
        requireLocalUrl(baseUrl);
        if (timeoutSeconds < 1 || timeoutSeconds > 600) {
            throw new IllegalArgumentException(
                    "app.assistant.ollama.timeout-seconds phải từ 1 đến 600.");
        }
        this.chatModel = chatModel;
        this.embeddingModel = embeddingModel;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory requestFactory =
                new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(3));
        requestFactory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
    }

    public String chat(String systemPrompt, String userPrompt) {
        JsonNode response = post("/api/chat", Map.of(
                "model", chatModel,
                "stream", false,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)),
                "options", Map.of("temperature", 0.2, "num_predict", 450)));
        log.debug("Ollama prompt system={} user={}", systemPrompt, userPrompt);
        String content = response.path("message").path("content").asString("");
        if (content.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Ollama trả về câu trả lời trống. Vui lòng thử lại.");
        }
        log.debug("Ollama response={}", content.trim());
        return content.trim();
    }

    public List<List<Double>> embed(List<String> texts) {
        if (texts.isEmpty()) {
            return List.of();
        }
        List<List<Double>> result = new ArrayList<>();
        for (int start = 0; start < texts.size(); start += EMBEDDING_BATCH_SIZE) {
            List<String> batch = texts.subList(
                    start, Math.min(start + EMBEDDING_BATCH_SIZE, texts.size()));
            JsonNode response = post("/api/embed", Map.of(
                    "model", embeddingModel,
                    "input", batch));
            JsonNode embeddings = response.path("embeddings");
            if (!embeddings.isArray() || embeddings.size() != batch.size()) {
                throw invalidResponse();
            }
            for (JsonNode embedding : embeddings) {
                if (!embedding.isArray() || embedding.isEmpty()) {
                    throw invalidResponse();
                }
                List<Double> vector = new ArrayList<>(embedding.size());
                for (JsonNode value : embedding) {
                    double component = value.asDouble(Double.NaN);
                    if (!Double.isFinite(component)) {
                        throw invalidResponse();
                    }
                    vector.add(component);
                }
                result.add(List.copyOf(vector));
            }
        }
        return List.copyOf(result);
    }

    public String embeddingModelName() {
        return embeddingModel;
    }

    private JsonNode post(String path, Map<String, ?> body) {
        try {
            String payload = objectMapper.writeValueAsString(body);
            String response = restClient.post()
                    .uri(path)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(String.class);
            if (response == null || response.isBlank()) {
                throw invalidResponse();
            }
            return objectMapper.readTree(response);
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 404) {
                throw new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                            "Không tìm thấy model Ollama đã cấu hình hoặc endpoint "
                                    + "không được hỗ trợ. Hãy kiểm tra model "
                                + "chat và embedding theo hướng dẫn trong README.");
            }
            log.warn("Ollama local trả lỗi HTTP {}.", exception.getStatusCode());
            throw unavailable();
        } catch (RestClientException exception) {
            log.warn("Không kết nối được Ollama local.", exception);
            throw unavailable();
        } catch (JacksonException exception) {
            log.warn("Ollama local trả về JSON không hợp lệ.");
            throw invalidResponse();
        }
    }

    private static void requireLocalUrl(String baseUrl) {
        URI uri = URI.create(baseUrl);
        String host = uri.getHost();
        if (!"http".equalsIgnoreCase(uri.getScheme())
                || host == null
                || !(host.equalsIgnoreCase("localhost")
                || host.equals("127.0.0.1")
                || host.equals("::1")
                || host.equals("[::1]"))) {
            throw new IllegalArgumentException(
                    "Ollama phải chạy local tại localhost; không cấu hình máy chủ từ xa.");
        }
    }

    private ResponseStatusException unavailable() {
        return new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Không kết nối được Ollama local. Hãy khởi động Ollama và kiểm "
                        + "tra các model đã tải.");
    }

    private ResponseStatusException invalidResponse() {
        return new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "Ollama trả về dữ liệu không hợp lệ.");
    }
}
