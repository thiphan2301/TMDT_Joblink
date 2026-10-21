package group7.joblink.controller;

import group7.joblink.dto.request.ChatRequests.OpenConversationRequest;
import group7.joblink.dto.request.ChatRequests.SendMessageRequest;
import group7.joblink.dto.response.ChatResponses.ConversationContext;
import group7.joblink.dto.response.ChatResponses.ConversationRow;
import group7.joblink.dto.response.ChatResponses.MessageRow;
import group7.joblink.service.ChatService;
import group7.joblink.service.EmployerImageStorageService;
import group7.joblink.websocket.ChatSessionRegistry;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.concurrent.TimeUnit;

// API REST của chat (dùng chung ứng viên + nhà tuyển dụng):
// - Nạp danh sách cuộc trò chuyện và lịch sử tin nhắn.
// - Gửi tin qua REST là đường dự phòng khi WebSocket chưa nối được;
//   tin vẫn được đẩy realtime tới đối phương qua ChatSessionRegistry.
// Người dùng phải đăng nhập; ChatService kiểm tra thêm người gọi có
// thuộc cuộc trò chuyện hay không.
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;
    private final ChatSessionRegistry registry;
    private final EmployerImageStorageService imageStorage;

    public ChatController(ChatService chatService, ChatSessionRegistry registry,
                          EmployerImageStorageService imageStorage) {
        this.chatService = chatService;
        this.registry = registry;
        this.imageStorage = imageStorage;
    }

    @GetMapping("/conversations")
    public List<ConversationRow> conversations(HttpServletRequest request) {
        int userId = CurrentUser.requireId(request);
        return chatService.listConversations(userId);
    }

    @PostMapping("/conversations")
    public ResponseEntity<ConversationRow> openConversation(
            @RequestBody OpenConversationRequest body, HttpServletRequest request) {
        int userId = CurrentUser.requireId(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(chatService.openConversation(userId, body));
    }

    @GetMapping("/conversations/{id}/messages")
    public List<MessageRow> messages(@PathVariable int id,
                                     HttpServletRequest request) {
        int userId = CurrentUser.requireId(request);
        return chatService.getMessages(userId, id);
    }

    // Ngữ cảnh tuyển dụng của cuộc trò chuyện (panel bên phải).
    @GetMapping("/conversations/{id}/context")
    public ConversationContext context(@PathVariable int id,
                                       HttpServletRequest request) {
        int userId = CurrentUser.requireId(request);
        return chatService.getConversationContext(userId, id);
    }

    @PostMapping("/conversations/{id}/messages")
    public MessageRow sendMessage(@PathVariable int id,
                                  @RequestBody SendMessageRequest body,
                                  HttpServletRequest request) {
        int userId = CurrentUser.requireId(request);
        ChatService.SentMessage sent = chatService.sendMessage(
                userId, id, body == null ? null : body.content());
        pushRealtime(sent);
        return sent.message();
    }

    // Gửi ảnh lấy từ máy của người dùng (multipart, trường "file").
    @PostMapping("/conversations/{id}/image")
    public MessageRow sendImage(@PathVariable int id,
                                @RequestParam("file") MultipartFile file,
                                HttpServletRequest request) {
        int userId = CurrentUser.requireId(request);
        ChatService.SentMessage sent = chatService.sendImageMessage(userId, id, file);
        pushRealtime(sent);
        return sent.message();
    }

    // Phát file ảnh chat đã lưu (đường dẫn này được lưu trong
    // messages.image_url; tên file do máy chủ tự sinh nên tra cứu
    // công khai được, giống ảnh công ty).
    @GetMapping("/images/{name}")
    public ResponseEntity<Resource> chatImage(@PathVariable String name) {
        Resource resource = imageStorage.load(name);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(imageStorage.contentTypeOf(name)))
                .cacheControl(CacheControl.maxAge(7, TimeUnit.DAYS))
                .body(resource);
    }

    // Đẩy realtime cho cả hai phía (kể cả các tab khác của người gửi).
    private void pushRealtime(ChatService.SentMessage sent) {
        MessageRow m = sent.message();
        String event = "{\"type\":\"message\",\"message\":{"
                + "\"id\":" + m.id()
                + ",\"conversationId\":" + m.conversationId()
                + ",\"senderId\":" + m.senderId()
                + ",\"content\":\"" + escape(m.content()) + "\""
                + ",\"read\":" + m.read()
                + ",\"sentAt\":\"" + m.sentAt() + "\""
                + ",\"imageUrl\":"
                + (m.imageUrl() == null ? "null" : "\"" + escape(m.imageUrl()) + "\"")
                + "}}";
        registry.sendToUser(sent.candidateId(), event);
        registry.sendToUser(sent.employerId(), event);
    }

    // Thoát ký tự đặc biệt khi tự ghép JSON cho khung realtime.
    private String escape(String text) {
        if (text == null) return "";
        return text.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}