package group7.joblink.repository;

import group7.joblink.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

// Tin nhắn của chat realtime.
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Integer> {

    // Toàn bộ tin nhắn của một cuộc trò chuyện, cũ trước mới sau.
    List<ChatMessage> findByConversationIdOrderBySentAtAscIdAsc(Integer conversationId);

    // Đánh dấu đã đọc: mọi tin nhắn do ĐỐI PHƯƠNG gửi trong cuộc trò chuyện.
    @Modifying
    @Query("""
        UPDATE ChatMessage m SET m.read = true
        WHERE m.conversationId = :conversationId
          AND m.senderId <> :readerId
          AND m.read = false
        """)
    int markAllRead(@Param("conversationId") Integer conversationId,
                    @Param("readerId") Integer readerId);

    // Tổng số tin chưa đọc của một người dùng trên mọi cuộc trò chuyện
    // (huy hiệu ở topbar / thẻ tin nhắn mới trên trang Tổng quan).
    @Query(value = """
        SELECT COUNT(*) FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE (c.candidate_id = :userId OR c.employer_id = :userId)
          AND m.sender_id <> :userId AND m.is_read = 0
        """, nativeQuery = true)
    long countUnreadForUser(@Param("userId") Integer userId);
}
