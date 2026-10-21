package group7.joblink.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// Một tin nhắn trong cuộc trò chuyện (bảng messages).
@Entity
@Table(name = "messages")
@Getter
@NoArgsConstructor
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "conversation_id", nullable = false)
    private Integer conversationId;

    @Column(name = "sender_id", nullable = false)
    private Integer senderId;

    @Column(nullable = false)
    private String content;

    // Đường dẫn ảnh đính kèm (tin gửi ảnh); tin chữ thì null.
    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "is_read", nullable = false)
    private boolean read;

    @Column(name = "sent_at", nullable = false, updatable = false)
    private LocalDateTime sentAt;

    public ChatMessage(Integer conversationId, Integer senderId, String content) {
        this(conversationId, senderId, content, null);
    }

    public ChatMessage(Integer conversationId, Integer senderId,
                       String content, String imageUrl) {
        this.conversationId = conversationId;
        this.senderId = senderId;
        this.content = content;
        this.imageUrl = imageUrl;
        this.read = false;
    }

    @PrePersist
    void onCreate() {
        if (sentAt == null) {
            sentAt = LocalDateTime.now();
        }
    }
}