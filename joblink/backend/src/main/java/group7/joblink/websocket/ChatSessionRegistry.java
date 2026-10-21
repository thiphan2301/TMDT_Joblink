package group7.joblink.websocket;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

// Sổ đăng ký các kết nối WebSocket đang mở, theo id người dùng — một
// người mở nhiều tab thì giữ nhiều session. Tầng REST và tầng WebSocket
// đều đẩy tin qua đây để giao diện bên kia nhận được ngay (realtime).
@Component
public class ChatSessionRegistry {

    private final Map<Integer, Set<WebSocketSession>> sessionsByUser =
            new ConcurrentHashMap<>();

    public void register(Integer userId, WebSocketSession session) {
        sessionsByUser
                .computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet())
                .add(session);
    }

    public void unregister(Integer userId, WebSocketSession session) {
        Set<WebSocketSession> sessions = sessionsByUser.get(userId);
        if (sessions != null) {
            sessions.remove(session);
            if (sessions.isEmpty()) {
                sessionsByUser.remove(userId);
            }
        }
    }

    // Gửi một payload JSON tới mọi session đang mở của người dùng.
    // Session lỗi/đã đóng sẽ bị gỡ khỏi sổ.
    public void sendToUser(Integer userId, String payload) {
        Set<WebSocketSession> sessions = sessionsByUser.get(userId);
        if (sessions == null) {
            return;
        }
        for (WebSocketSession session : Set.copyOf(sessions)) {
            if (!session.isOpen()) {
                unregister(userId, session);
                continue;
            }
            try {
                synchronized (session) {
                    session.sendMessage(new TextMessage(payload));
                }
            } catch (IOException e) {
                unregister(userId, session);
            }
        }
    }
}
