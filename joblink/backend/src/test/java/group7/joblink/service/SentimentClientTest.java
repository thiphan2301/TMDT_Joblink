package group7.joblink.service;

import com.sun.net.httpserver.HttpServer;
import tools.jackson.databind.json.JsonMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class SentimentClientTest {

    private MockRestServiceServer server;
    private SentimentClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new SentimentClient(
                "http://sentiment.test",
                builder,
                JsonMapper.builder().build()
        );
    }

    @Test
    void guiJsonTextKhiPhanLoaiMotNhanXet() {
        server.expect(requestTo("http://sentiment.test/predict"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Content-Type", "application/json"))
                .andExpect(content().json("{\"text\":\"Môi trường tốt\"}"))
                .andRespond(withSuccess(
                        "{\"label\":\"positive\",\"confidence\":0.9}",
                        MediaType.APPLICATION_JSON
                ));

        assertThat(client.classify("Môi trường tốt").label()).isEqualTo("positive");
        server.verify();
    }

    @Test
    void guiJsonTextsKhiPhanLoaiHangLoat() {
        server.expect(requestTo("http://sentiment.test/predict/batch"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Content-Type", "application/json"))
                .andExpect(content().json("{\"texts\":[\"Tốt\",\"Không tốt\"]}"))
                .andRespond(withSuccess("""
                        [
                          {"label":"positive","confidence":0.9},
                          {"label":"negative","confidence":0.8}
                        ]
                        """, MediaType.APPLICATION_JSON));

        List<SentimentClient.Prediction> predictions =
                client.classifyBatch(List.of("Tốt", "Không tốt"));

        assertThat(predictions).extracting(SentimentClient.Prediction::label)
                .containsExactly("positive", "negative");
        server.verify();
    }

    @Test
    void guiBodyJsonQuaHttpThucTe() throws IOException {
        AtomicReference<String> receivedBody = new AtomicReference<>();
        HttpServer httpServer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        httpServer.createContext("/predict", exchange -> {
            receivedBody.set(new String(
                    exchange.getRequestBody().readAllBytes(),
                    StandardCharsets.UTF_8
            ));
            byte[] response = "{\"label\":\"positive\",\"confidence\":0.9}"
                    .getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length);
            try (var responseBody = exchange.getResponseBody()) {
                responseBody.write(response);
            }
        });
        httpServer.start();

        try {
            SentimentClient httpClient = new SentimentClient(
                    "http://127.0.0.1:" + httpServer.getAddress().getPort(),
                    RestClient.builder(),
                    JsonMapper.builder().build()
            );

            assertThat(httpClient.classify("Môi trường tốt").label()).isEqualTo("positive");
            assertThat(receivedBody.get()).isEqualTo("{\"text\":\"Môi trường tốt\"}");
        } finally {
            httpServer.stop(0);
        }
    }

}
