package group7.joblink.service;

import group7.joblink.dto.request.ChatRequests.OpenConversationRequest;
import group7.joblink.dto.response.ChatResponses.ConversationContext;
import group7.joblink.dto.response.ChatResponses.ConversationRow;
import group7.joblink.dto.response.ChatResponses.MessageRow;
import group7.joblink.entity.ChatMessage;
import group7.joblink.entity.Conversation;
import group7.joblink.entity.Job;
import group7.joblink.entity.ServicePackage;
import group7.joblink.entity.Subscription;
import group7.joblink.entity.User;
import group7.joblink.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

// Nghiệp vụ chat giữa ứng viên và nhà tuyển dụng. Một cặp hai người chỉ
// có một cuộc trò chuyện (ràng buộc UNIQUE trong bảng conversations) —
// mở lại là dùng tiếp cuộc cũ. Gửi tin đi qua service này cho cả REST
// lẫn WebSocket để hai đường không lệch nhau.
@Service
public class ChatService {

    private static final int MAX_CONTENT_LENGTH = 2000;

    private final ConversationRepository conversationRepository;
    private final ChatMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final CandidateProfileRepository profileRepository;
    private final JobRepository jobRepository;
    private final CompanyRepository companyRepository;
    private final EmployerApplicationRepository applicationRepository;
    private final AdminSubscriptionRepository subscriptionRepository;
    private final ServicePackageRepository packageRepository;
    private final EmployerImageStorageService imageStorage;

    public ChatService(ConversationRepository conversationRepository,
                       ChatMessageRepository messageRepository,
                       UserRepository userRepository,
                       CandidateProfileRepository profileRepository,
                       JobRepository jobRepository,
                       CompanyRepository companyRepository,
                       EmployerApplicationRepository applicationRepository,
                       AdminSubscriptionRepository subscriptionRepository,
                       ServicePackageRepository packageRepository,
                       EmployerImageStorageService imageStorage) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.jobRepository = jobRepository;
        this.companyRepository = companyRepository;
        this.applicationRepository = applicationRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.packageRepository = packageRepository;
        this.imageStorage = imageStorage;
    }

    // Kết quả gửi tin: nội dung tin + hai phía để tầng gọi đẩy realtime.
    public record SentMessage(MessageRow message, Integer candidateId, Integer employerId) {
    }

    @Transactional(readOnly = true)
    public List<ConversationRow> listConversations(int userId) {
        if (isEmployer(userId)) {
            requireEmployerChatAccess(userId);
        }
        return conversationRepository.findConversationRows(userId).stream()
                .map(row -> toConversationRow(row, userId))
                .toList();
    }

    // Đọc tin nhắn của một cuộc trò chuyện — đồng thời đánh dấu đã đọc
    // mọi tin do đối phương gửi.
    @Transactional
    public List<MessageRow> getMessages(int userId, int conversationId) {
        Conversation conversation = requireParticipant(userId, conversationId);
        if (conversation.getEmployerId().equals(userId)) {
            requireEmployerChatAccess(userId);
        }
        messageRepository.markAllRead(conversationId, userId);
        return messageRepository
                .findByConversationIdOrderBySentAtAscIdAsc(conversationId).stream()
                .map(m -> toMessageRow(m, userId))
                .toList();
    }

    @Transactional
    public void markRead(int userId, int conversationId) {
        requireParticipant(userId, conversationId);
        messageRepository.markAllRead(conversationId, userId);
    }

    // Mở cuộc trò chuyện với một người dùng khác (ứng viên <-> nhà tuyển
    // dụng). Đã có cuộc trò chuyện của cặp này thì trả lại cuộc cũ.
    @Transactional
    public ConversationRow openConversation(int userId, OpenConversationRequest req) {
        if (req == null || req.partnerId() == null) {
            throw badRequest("Thiếu người cần trò chuyện.");
        }
        User me = userRepository.findById(userId)
                .orElseThrow(() -> notFound("Không tìm thấy tài khoản của bạn."));
        User partner = userRepository.findById(req.partnerId())
                .orElseThrow(() -> notFound("Không tìm thấy người cần trò chuyện."));

        Integer candidateId;
        Integer employerId;
        if (me.getRole() == User.Role.employer && partner.getRole() == User.Role.candidate) {
            candidateId = partner.getId();
            employerId = me.getId();
        } else if (me.getRole() == User.Role.candidate && partner.getRole() == User.Role.employer) {
            candidateId = me.getId();
            employerId = partner.getId();
        } else {
            throw badRequest("Chỉ trò chuyện được giữa ứng viên và nhà tuyển dụng.");
        }
        if (!profileRepository.existsById(candidateId)) {
            throw badRequest("Ứng viên chưa có hồ sơ nên chưa trò chuyện được.");
        }

        Integer jobId = req.jobId();
        if (jobId != null) {
            Job job = jobRepository.findById(jobId)
                    .orElseThrow(() -> badRequest("Tin tuyển dụng liên quan không tồn tại."));
            Integer ownerId = job.getCompany() == null ? null
                    : companyRepository.findOwnerIdByCompanyId(job.getCompany().getId())
                      .orElse(null);
            if (ownerId == null || !ownerId.equals(employerId)) {
                throw badRequest("Tin tuyển dụng không thuộc nhà tuyển dụng này.");
            }
        }

        // Cổng gói dịch vụ (chốt 2026-10-21): nhà tuyển dụng phải có
        // gói trả phí đang hiệu lực (Pro/Premium) mới dùng được chat
        // — kể cả mở cuộc trò chuyện với ứng viên đã ứng tuyển hay
        // cuộc trò chuyện đã tồn tại từ trước.
        if (me.getRole() == User.Role.employer) {
            requireEmployerChatAccess(employerId);
        }

        var existing = conversationRepository
                .findByCandidateIdAndEmployerId(candidateId, employerId);

        Conversation conversation = existing
                .orElseGet(() -> conversationRepository.save(
                        new Conversation(candidateId, employerId, jobId)));

        return listConversations(userId).stream()
                .filter(r -> r.id().equals(conversation.getId()))
                .findFirst()
                .orElseThrow(() -> notFound("Không mở được cuộc trò chuyện."));
    }

    @Transactional
    public SentMessage sendMessage(int userId, int conversationId, String content) {
        Conversation conversation = requireParticipant(userId, conversationId);
        if (conversation.getEmployerId().equals(userId)) {
            requireEmployerChatAccess(userId);
        }
        String text = content == null ? "" : content.trim();
        if (text.isEmpty()) {
            throw badRequest("Nội dung tin nhắn đang trống.");
        }
        if (text.length() > MAX_CONTENT_LENGTH) {
            throw badRequest("Tin nhắn tối đa " + MAX_CONTENT_LENGTH + " ký tự.");
        }
        ChatMessage saved = messageRepository.save(
                new ChatMessage(conversationId, userId, text));
        return new SentMessage(toMessageRow(saved, userId),
                conversation.getCandidateId(), conversation.getEmployerId());
    }

    // Gửi một ảnh lấy từ máy của người dùng: file được kiểm tra và
    // lưu qua EmployerImageStorageService (PNG/JPG/GIF/WEBP, tối đa
    // 5 MB), tin nhắn lưu content rỗng kèm image_url. Cùng cổng gói
    // Pro/Premium với gửi tin chữ phía nhà tuyển dụng.
    @Transactional
    public SentMessage sendImageMessage(int userId, int conversationId,
                                        MultipartFile file) {
        Conversation conversation = requireParticipant(userId, conversationId);
        if (conversation.getEmployerId().equals(userId)) {
            requireEmployerChatAccess(userId);
        }
        String storageName = imageStorage.store(file);
        ChatMessage saved = messageRepository.save(new ChatMessage(
                conversationId, userId, "", "/api/chat/images/" + storageName));
        return new SentMessage(toMessageRow(saved, userId),
                conversation.getCandidateId(), conversation.getEmployerId());
    }

    // Nhà tuyển dụng có gói trả phí đang hiệu lực không — cách tính
    // cấp gói giống EmployerService.currentPlan: gói tên Premium,
    // hoặc gói có quyền ưu tiên hiển thị, được tính là cấp trả phí
    // (Pro/Premium); còn lại là Basic mặc định.
    private boolean hasPaidPlan(int employerId) {
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        for (Subscription sub : subscriptionRepository
                .findByEmployerIdAndStatus(employerId, Subscription.Status.active)) {
            if (sub.getEndAt() == null || !sub.getEndAt().isAfter(now)) {
                continue;
            }
            ServicePackage pkg = packageRepository.findById(sub.getPackageId()).orElse(null);
            if (pkg != null && pkg.isActive()
                    && ("Premium".equals(pkg.getName()) || pkg.isCanPrioritizeJobs())) {
                return true;
            }
        }
        return false;
    }

    private void requireEmployerChatAccess(int employerId) {
        if (!hasPaidPlan(employerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Tính năng nhắn tin cần gói Pro/Premium. "
                            + "Hãy nâng cấp gói dịch vụ để trò chuyện với ứng viên.");
        }
    }

    private boolean isEmployer(int userId) {
        return userRepository.findById(userId)
                .map(u -> u.getRole() == User.Role.employer)
                .orElse(false);
    }

    // Ngữ cảnh tuyển dụng cho panel bên phải trang Tin nhắn (tin
    // gắn với cuộc trò chuyện, trạng thái đơn, lịch phỏng vấn tới).
    @Transactional(readOnly = true)
    public ConversationContext getConversationContext(int userId, int conversationId) {
        var rows = conversationRepository.findContextRow(conversationId, userId);
        if (rows.isEmpty()) {
            throw notFound("Không tìm thấy cuộc trò chuyện.");
        }
        Object[] r = rows.get(0);
        return new ConversationContext(
                toInt(r[0]), str(r[1]), str(r[2]),
                toDecimal(r[3]), toDecimal(r[4]), str(r[5]), str(r[6]),
                str(r[7]), toDateTime(r[8]),
                toDateTime(r[9]), str(r[10]), str(r[11]));
    }

    private static java.math.BigDecimal toDecimal(Object value) {
        if (value == null) return null;
        if (value instanceof java.math.BigDecimal bd) return bd;
        return new java.math.BigDecimal(value.toString());
    }

    // Người dùng phải là một phía của cuộc trò chuyện mới được đọc/gửi.
    private Conversation requireParticipant(int userId, int conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> notFound("Không tìm thấy cuộc trò chuyện."));
        if (!conversation.getCandidateId().equals(userId)
                && !conversation.getEmployerId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Bạn không thuộc cuộc trò chuyện này.");
        }
        return conversation;
    }

    private ConversationRow toConversationRow(Object[] row, int viewerId) {
        Integer candidateId = toInt(row[1]);
        Integer employerId = toInt(row[2]);
        boolean viewerIsEmployer = employerId != null && employerId == viewerId;
        return new ConversationRow(
                toInt(row[0]),
                candidateId,
                employerId,
                toInt(row[3]),
                str(row[4]),
                viewerIsEmployer ? candidateId : employerId,
                str(row[5]),
                str(row[6]),
                str(row[7]),
                toDateTime(row[8]),
                toLong(row[9]),
                null
        );
    }

    private MessageRow toMessageRow(ChatMessage message, int viewerId) {
        return new MessageRow(
                message.getId(),
                message.getConversationId(),
                message.getSenderId(),
                message.getSenderId().equals(viewerId),
                message.getContent(),
                message.isRead(),
                message.getSentAt(),
                message.getImageUrl()
        );
    }

    private static Integer toInt(Object value) {
        return value == null ? null : ((Number) value).intValue();
    }

    private static long toLong(Object value) {
        return value == null ? 0L : ((Number) value).longValue();
    }

    private static String str(Object value) {
        return value == null ? null : value.toString();
    }

    private static LocalDateTime toDateTime(Object value) {
        if (value == null) return null;
        if (value instanceof LocalDateTime ldt) return ldt;
        if (value instanceof Timestamp ts) return ts.toLocalDateTime();
        return LocalDateTime.parse(value.toString().replace(' ', 'T'));
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }
}