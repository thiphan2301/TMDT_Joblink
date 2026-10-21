import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { getCurrentUser } from "../../services/authService";
import {
  getConversations, getChatMessages, sendChatMessageRest, sendChatImage,
  connectChat,
} from "../../services/chatService";
import { initialsOf, formatChatTime } from "../../components/employer/employerFormat.js";
import {
  IconSend, IconChat, IconCrown, IconSmile, IconImage,
} from "../../components/employer/EmployerIcons.jsx";
import "../../style/Chat.css";

// Bộ emoji hay dùng khi trao đổi công việc — bấm là chèn vào ô nhập.
const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "🙂", "😉", "😍",
  "😘", "😎", "🤔", "😅", "😭", "😡", "🥳", "😇",
  "👍", "👎", "👏", "🙏", "💪", "🤝", "👋", "👀",
  "🔥", "🎉", "❤️", "💯", "✅", "❌", "⭐", "🌟",
  "💼", "🏢", "📍", "📞", "📧", "📌", "📄", "📎",
  "🗓️", "⏰", "💰", "✍️", "💡", "🚀", "😴", "🤯",
];

// Trang Tin nhắn dùng chung cho nhà tuyển dụng (/employer/chat) và
// ứng viên (/tin-nhan): danh sách cuộc trò chuyện + khung chat
// realtime qua WebSocket (tự nối lại khi rớt mạng, gửi không được
// qua socket thì rơi về REST). Mở cuộc trò chuyện là backend tự
// đánh dấu đã đọc các tin của đối phương. Phía nhà tuyển dụng,
// chat yêu cầu gói Pro/Premium — backend trả 403 thì trang hiện
// màn hình mở khóa (ứng viên không bị cổng này).
export default function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const wantedId = searchParams.get("c");

  const [myId, setMyId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");
  const [online, setOnline] = useState(false);
  const [locked, setLocked] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const socketRef = useRef(null);
  const fileInputRef = useRef(null);
  const activeRef = useRef(null);
  const myIdRef = useRef(null);
  const initializedRef = useRef(false);
  const bottomRef = useRef(null);

  activeRef.current = activeId;
  myIdRef.current = myId;

  const loadConversations = useCallback(async () => {
    try {
      const list = await getConversations();
      setConversations(list);
      return list;
    } catch (err) {
      // 403 vì nhà tuyển dụng chưa có gói Pro/Premium -> khóa trang.
      if ((err.message || "").includes("Pro/Premium")) {
        setLocked(true);
      } else {
        setError(err.message || "Không tải được danh sách trò chuyện.");
      }
      return [];
    }
  }, []);

  const openConversation = useCallback(async (conversationId) => {
    setActiveId(conversationId);
    setShowEmoji(false);
    // Đồng bộ lên URL (?c=) để vùng xung quanh (panel ngữ cảnh của
    // trang Tin nhắn ứng viên) biết đang mở cuộc trò chuyện nào.
    setSearchParams({ c: String(conversationId) }, { replace: true });
    try {
      const msgs = await getChatMessages(conversationId);
      setMessages(msgs);
      // Đã đọc xong thì số tin chưa đọc ở danh sách cũng phải về 0.
      setConversations((prev) => prev.map((c) =>
          c.id === conversationId ? { ...c, unread: 0 } : c));
    } catch (err) {
      setError(err.message || "Không tải được tin nhắn.");
    }
  }, []);

  // Người dùng hiện tại + danh sách cuộc trò chuyện + chọn sẵn cuộc
  // trò chuyện (theo ?c= trên URL, không có thì cuộc gần nhất).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await getCurrentUser();
        if (!cancelled) setMyId(me?.id ?? null);
      } catch {
        if (!cancelled) setError("Bạn cần đăng nhập để dùng tin nhắn.");
      }
      const list = await loadConversations();
      if (cancelled || initializedRef.current) return;
      initializedRef.current = true;
      const target = wantedId
          ? list.find((c) => String(c.id) === String(wantedId))
          : list[0];
      if (target) openConversation(target.id);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kết nối realtime: có tin mới thì cập nhật khung chat (nếu đang mở
  // đúng cuộc đó) và nạp lại danh sách (tin cuối + số chưa đọc).
  useEffect(() => {
    const ctl = connectChat((event) => {
      if (event.type === "status") {
        setOnline(event.online);
      } else if (event.type === "message") {
        const m = event.message;
        if (m.conversationId === activeRef.current) {
          setMessages((prev) => appendUnique(prev, {
            ...m,
            mine: m.senderId === myIdRef.current,
          }));
          ctl.markRead(m.conversationId);
        }
        loadConversations();
      } else if (event.type === "read") {
        if (event.conversationId === activeRef.current) {
          setMessages((prev) => prev.map((x) => (x.mine ? { ...x, read: true } : x)));
        }
      } else if (event.type === "error") {
        if ((event.message || "").includes("Pro/Premium")) {
          setLocked(true);
        } else {
          setError(event.message);
        }
      }
    });
    socketRef.current = ctl;
    return () => ctl.close();
  }, [loadConversations]);

  // Cuộn xuống tin mới nhất — chỉ cuộn bên trong khung tin nhắn.
  // Không dùng scrollIntoView: nó cuộn mọi khung chứa bên ngoài
  // (kéo cả trang lên) mỗi khi chọn một cuộc trò chuyện.
  useEffect(() => {
    const box = bottomRef.current?.parentElement;
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Đang xem ảnh lớn: bấm phím Esc cũng đóng được lớp phủ.
  useEffect(() => {
    if (!previewUrl) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setPreviewUrl(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewUrl]);

  function insertEmoji(emoji) {
    setDraft((d) => (d + emoji).slice(0, 2000));
  }

  // Chọn ảnh từ máy -> tải thẳng lên backend, tin ảnh trả về được
  // gắn vào khung chat và cũng được backend đẩy realtime cho phía
  // còn lại (nên không cần tự gắn nếu socket vọng lại trùng id).
  async function handleImagePick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !activeId || uploading) return;
    setUploading(true);
    setError("");
    try {
      const saved = await sendChatImage(activeId, file);
      setMessages((prev) => appendUnique(prev, saved));
      loadConversations();
    } catch (err) {
      setError(err.message || "Không gửi được ảnh.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !activeId) return;
    setDraft("");
    setShowEmoji(false);
    setError("");
    const sent = socketRef.current?.send(activeId, content);
    if (!sent) {
      // Socket chưa nối được: gửi qua REST, tin vẫn được đẩy realtime
      // cho đối phương; phía mình thì gắn thẳng kết quả trả về.
      try {
        const saved = await sendChatMessageRest(activeId, content);
        setMessages((prev) => appendUnique(prev, saved));
        loadConversations();
      } catch (err) {
        setError(err.message || "Không gửi được tin nhắn.");
        setDraft(content);
      }
    }
  }

  const active = conversations.find((c) => c.id === activeId) || null;
  const visibleConversations = conversations.filter((c) =>
      !keyword.trim()
      || (c.partnerName || "").toLowerCase().includes(keyword.trim().toLowerCase()));
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread || 0), 0);

  // Nhà tuyển dụng gói Basic: backend chặn toàn bộ chat -> hiện
  // màn hình mở khóa thay cho khung chat (ứng viên không gặp màn này).
  if (locked) {
    return (
        <div className="chat-locked">
          <span className="chat-locked__badge">TÍNH NĂNG PRO / PREMIUM</span>
          <h2>Nhắn tin trực tiếp với ứng viên</h2>
          <p>
            Tài khoản của bạn đang ở gói <strong>Basic</strong> nên tính năng
            Tin nhắn đang bị khóa. Nâng cấp lên gói <strong>Pro</strong> hoặc
            <strong> Premium </strong> để trò chuyện realtime với ứng viên — kể
            cả ứng viên đã ứng tuyển vào tin tuyển dụng của bạn.
          </p>
          <div className="chat-locked__actions">
            <Link to="/employer/plan" className="chat-locked__btn chat-locked__btn--primary">
              <IconCrown size={16} /> Xem gói dịch vụ
            </Link>
            <Link to="/employer/jobs" className="chat-locked__btn">Quay lại quản lý tin</Link>
          </div>
          <div className="chat-locked__features">
            <div>
              <strong>Chat realtime</strong>
              <span>Nhắn tin tức thời qua WebSocket, có trạng thái đã xem và tự nối lại khi rớt mạng.</span>
            </div>
            <div>
              <strong>Mọi cuộc trò chuyện</strong>
              <span>Xem và trả lời mọi cuộc trò chuyện với ứng viên, không bị giới hạn ở tin đã ứng tuyển.</span>
            </div>
            <div>
              <strong>Chủ động liên hệ</strong>
              <span>Mở cuộc trò chuyện mới ngay từ trang Ứng viên và Tìm kiếm ứng viên.</span>
            </div>
          </div>
        </div>
    );
  }

  return (
      <div className="chat-shell">
        <aside className="chat-list">
          <div className="chat-list__head">
            <h2>Tin nhắn</h2>
            {totalUnread > 0 && <span className="chat-unread">{totalUnread}</span>}
          </div>
          <div className={`chat-list__status${online ? " is-online" : ""}`}>
            <span className="chat-status-dot" />
            {online ? "Đang kết nối realtime" : "Đang nối lại..."}
          </div>
          <input
              className="chat-search"
              placeholder="Tìm theo tên..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
          />
          <div className="chat-list__items">
            {visibleConversations.map((c) => (
                <button
                    key={c.id}
                    type="button"
                    className={`chat-item${c.id === activeId ? " is-active" : ""}`}
                    onClick={() => openConversation(c.id)}
                >
                  {c.partnerAvatar
                      ? <img src={c.partnerAvatar} alt="" className="chat-avatar-img" />
                      : <span className="chat-avatar">{initialsOf(c.partnerName)}</span>}
                  <span className="chat-item__main">
                <span className="chat-item__top">
                  <strong>{c.partnerName}</strong>
                  <time>{formatChatTime(c.lastMessageAt)}</time>
                </span>
                    {c.jobTitle && <span className="chat-item__job">{c.jobTitle}</span>}
                    <span className="chat-item__last">
                  {c.lastMessage || "Chưa có tin nhắn"}
                </span>
              </span>
                  {c.unread > 0 && <span className="chat-unread">{c.unread}</span>}
                </button>
            ))}
            {visibleConversations.length === 0 && (
                <p className="chat-empty">
                  Chưa có cuộc trò chuyện nào. Cuộc trò chuyện bắt đầu khi một
                  phía nhấn nút Nhắn tin từ trang đơn ứng tuyển hoặc hồ sơ
                  ứng viên.
                </p>
            )}
          </div>
        </aside>

        <section className="chat-thread">
          {active ? (
              <>
                <header className="chat-thread__head">
                  {active.partnerAvatar
                      ? <img src={active.partnerAvatar} alt="" className="chat-avatar-img" />
                      : <span className="chat-avatar">{initialsOf(active.partnerName)}</span>}
                  <div>
                    <strong>{active.partnerName}</strong>
                    {active.jobTitle && <span>{active.jobTitle}</span>}
                  </div>
                </header>

                {error && <p className="chat-error">{error}</p>}

                <div className="chat-messages">
                  {messages.map((m) => (
                      <div key={m.id} className={`chat-bubble-row${m.mine ? " is-mine" : ""}`}>
                        <div className="chat-bubble">
                          {m.imageUrl && (
                              <img
                                  className="chat-bubble-img"
                                  src={m.imageUrl}
                                  alt="Ảnh đính kèm"
                                  onClick={() => setPreviewUrl(m.imageUrl)}
                                  title="Bấm để xem ảnh lớn"
                              />
                          )}
                          {m.content && <p>{m.content}</p>}
                          <time>
                            {formatChatTime(m.sentAt)}
                            {m.mine && m.read ? " · Đã xem" : ""}
                          </time>
                        </div>
                      </div>
                  ))}
                  {messages.length === 0 && (
                      <p className="chat-empty">Hãy gửi tin nhắn đầu tiên để bắt đầu cuộc trò chuyện.</p>
                  )}
                  <div ref={bottomRef} />
                </div>

                <div className="chat-composer-wrap">
                  {showEmoji && (
                      <div className="chat-emoji-pop">
                        {EMOJIS.map((emoji) => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => insertEmoji(emoji)}
                                aria-label={`Chèn emoji ${emoji}`}
                            >
                              {emoji}
                            </button>
                        ))}
                      </div>
                  )}
                  <form className="chat-composer" onSubmit={handleSend}>
                    <button
                        type="button"
                        className="chat-tool-btn"
                        onClick={() => setShowEmoji((v) => !v)}
                        aria-label="Chọn biểu tượng cảm xúc"
                        title="Biểu tượng cảm xúc"
                    >
                      <IconSmile size={21} />
                    </button>
                    <button
                        type="button"
                        className="chat-tool-btn"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        aria-label="Gửi ảnh từ máy"
                        title="Gửi ảnh từ máy"
                    >
                      <IconImage size={21} />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/gif,image/webp"
                        style={{ display: "none" }}
                        onChange={handleImagePick}
                    />
                    <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder={uploading ? "Đang gửi ảnh..." : "Nhập tin nhắn..."}
                        maxLength={2000}
                    />
                    <button type="submit" className="chat-send-btn" aria-label="Gửi tin nhắn">
                      <IconSend size={19} />
                    </button>
                  </form>
                </div>
              </>
          ) : (
              <div className="chat-placeholder">
                <IconChat size={44} />
                <p>Chọn một cuộc trò chuyện để bắt đầu nhắn tin.</p>
                {error && <p className="chat-error">{error}</p>}
              </div>
          )}
        </section>

        {previewUrl && (
            <div className="chat-lightbox" onClick={() => setPreviewUrl(null)}>
              <button
                  type="button"
                  className="chat-lightbox__close"
                  aria-label="Đóng xem ảnh"
                  onClick={() => setPreviewUrl(null)}
              >
                ✕
              </button>
              <img
                  src={previewUrl}
                  alt="Ảnh đính kèm (xem lớn)"
                  onClick={(e) => e.stopPropagation()}
              />
            </div>
        )}
      </div>
  );
}

// Thêm tin vào cuối danh sách, bỏ qua nếu trùng id (tin mình gửi qua
// REST cũng có thể vọng lại qua WebSocket).
function appendUnique(prev, message) {
  if (prev.some((m) => m.id === message.id)) return prev;
  return [...prev, message];
}