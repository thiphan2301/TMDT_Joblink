package group7.joblink.websocket;

import group7.joblink.service.AuthService;
import jakarta.servlet.http.HttpSession;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

// Cấu hình WebSocket cho chat realtime: đường /ws/chat.
// Cần thêm dependency spring-boot-starter-websocket vào pom.xml.
// Lúc bắt tay (handshake), interceptor đọc session đăng nhập mà
// AuthController đã lưu (thuộc tính "userId") — chưa đăng nhập thì
// từ chối kết nối, nên không ai lạ chen vào nghe/trò chuyện được.
@Configuration
@EnableWebSocket
public class ChatWebSocketConfig implements WebSocketConfigurer {

    private final ChatWebSocketHandler chatHandler;

    public ChatWebSocketConfig(ChatWebSocketHandler chatHandler) {
        this.chatHandler = chatHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(chatHandler, "/ws/chat")
                .addInterceptors(sessionHandshakeInterceptor())
                .setAllowedOrigins(
                        "http://localhost:5173",
                        "http://127.0.0.1:5173",
                        "http://localhost:3000");
    }

    private HandshakeInterceptor sessionHandshakeInterceptor() {
        return new HandshakeInterceptor() {
            @Override
            public boolean beforeHandshake(ServerHttpRequest request,
                                           ServerHttpResponse response,
                                           WebSocketHandler wsHandler,
                                           Map<String, Object> attributes) {
                if (request instanceof ServletServerHttpRequest servletRequest) {
                    HttpSession session =
                            servletRequest.getServletRequest().getSession(false);
                    Object userId = session == null ? null
                            : session.getAttribute(AuthService.SESSION_USER_ID);
                    if (userId instanceof Integer id) {
                        attributes.put("userId", id);
                        return true;
                    }
                }
                response.setStatusCode(HttpStatus.UNAUTHORIZED);
                return false;
            }

            @Override
            public void afterHandshake(ServerHttpRequest request,
                                       ServerHttpResponse response,
                                       WebSocketHandler wsHandler,
                                       Exception exception) {
                // Không cần xử lý sau bắt tay.
            }
        };
    }
}
