package group7.joblink.websocket;

import group7.joblink.service.ChatService;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

// Đầu xử lý WebSocket của chat realtime tại /ws/chat. Danh tính người
// dùng lấy từ thuộc tính phiên bắt tay (ChatWebSocketConfig đã kiểm tra
// đăng nhập trước khi cho kết nối). Tin gửi đến được lưu qua ChatService
// rồi đẩy ngay cho cả hai phía của cuộc trò chuyện.
@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private final ChatService chatService;
    private final ChatSessionRegistry registry;

    public ChatWebSocketHandler(ChatService chatService,
                                ChatSessionRegistry registry) {
        this.chatService = chatService;
        this.registry = registry;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        Integer userId = userIdOf(session);
        if (userId != null) {
            registry.register(userId, session);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        Integer userId = userIdOf(session);
        if (userId == null) {
            return;
        }
        String payload = message.getPayload();
        try {
            String type = ChatJson.stringField(payload, "type");
            Integer conversationId = ChatJson.intField(payload, "conversationId");
            if (conversationId == null) {
                throw new IllegalArgumentException("Thiếu conversationId.");
            }
            if ("send".equals(type)) {
                String content = ChatJson.stringField(payload, "content");
                ChatService.SentMessage sent =
                        chatService.sendMessage(userId, conversationId, content);
                String event = ChatJson.messageEvent(sent.message());
                registry.sendToUser(sent.candidateId(), event);
                registry.sendToUser(sent.employerId(), event);
            } else if ("read".equals(type)) {
                chatService.markRead(userId, conversationId);
                // Báo cho đối phương biết tin của họ đã được đọc.
                var conversation = chatService.listConversations(userId).stream()
                        .filter(c -> c.id().equals(conversationId))
                        .findFirst().orElse(null);
                if (conversation != null) {
                    registry.sendToUser(conversation.partnerId(),
                            ChatJson.readEvent(conversationId, userId));
                }
            }
        } catch (ResponseStatusException e) {
            registry.sendToUser(userId,
                    ChatJson.errorEvent(e.getReason() == null ? "Thao tác thất bại." : e.getReason()));
        } catch (Exception e) {
            registry.sendToUser(userId, ChatJson.errorEvent("Không xử lý được tin nhắn."));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Integer userId = userIdOf(session);
        if (userId != null) {
            registry.unregister(userId, session);
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        Integer userId = userIdOf(session);
        if (userId != null) {
            registry.unregister(userId, session);
        }
    }

    private Integer userIdOf(WebSocketSession session) {
        Object value = session.getAttributes().get("userId");
        return value instanceof Integer id ? id : null;
    }
}
