package group7.joblink.service;

import tools.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class SentimentClient {

    private static final Logger log = LoggerFactory.getLogger(SentimentClient.class);
    private static final Set<String> LABELS = Set.of("positive", "negative", "neutral");
    private static final ParameterizedTypeReference<List<Prediction>> PREDICTIONS_TYPE =
            new ParameterizedTypeReference<>() {
            };

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public SentimentClient(
            @Value("${app.sentiment.base-url:http://localhost:8001}") String baseUrl,
            RestClient.Builder builder,
            ObjectMapper objectMapper
    ) {
        restClient = builder.baseUrl(baseUrl).build();
        this.objectMapper = objectMapper;
    }

    public Prediction classify(String text) {
        try {
            return validate(restClient.post()
                    .uri("/predict")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(toJsonBytes(Map.of("text", text)))
                    .retrieve()
                    .body(Prediction.class));
        } catch (RestClientException exception) {
            log.warn("Không gọi được dịch vụ phân loại cảm xúc.", exception);
            throw unavailable();
        }
    }

    public List<Prediction> classifyBatch(List<String> texts) {
        if (texts.isEmpty()) {
            return List.of();
        }
        try {
            List<Prediction> predictions = restClient.post()
                    .uri("/predict/batch")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(toJsonBytes(Map.of("texts", texts)))
                    .retrieve()
                    .body(PREDICTIONS_TYPE);
            if (predictions == null || predictions.size() != texts.size()) {
                throw invalidResponse();
            }
            return predictions.stream().map(this::validate).toList();
        } catch (RestClientException exception) {
            log.warn("Không gọi được dịch vụ phân loại cảm xúc hàng loạt.", exception);
            throw unavailable();
        }
    }

    private byte[] toJsonBytes(Map<String, ?> body) {
        return objectMapper.writeValueAsBytes(body);
    }

    private Prediction validate(Prediction prediction) {
        if (prediction == null
                || !LABELS.contains(prediction.label())
                || !Double.isFinite(prediction.confidence())
                || prediction.confidence() < 0
                || prediction.confidence() > 1) {
            throw invalidResponse();
        }
        return prediction;
    }

    private ResponseStatusException unavailable() {
        return new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Dịch vụ phân loại cảm xúc chưa sẵn sàng. Vui lòng thử lại sau."
        );
    }

    private ResponseStatusException invalidResponse() {
        return new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "Dịch vụ phân loại cảm xúc trả về kết quả không hợp lệ."
        );
    }

    public record Prediction(String label, double confidence) {
    }
}
