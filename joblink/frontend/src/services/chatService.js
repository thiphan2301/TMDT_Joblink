// Service chat realtime — REST để nạp dữ liệu + WebSocket để nhận/gửi
// tin ngay lập tức. Gửi qua WebSocket không được thì tự rơi về REST.

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { Accept: "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Thao tác thất bại. Mã lỗi: ${response.status}`);
  }
  return data;
}

function jsonOptions(method, body) {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function getConversations() {
  return request("/api/chat/conversations");
}

// Mở (hoặc lấy lại) cuộc trò chuyện với một người dùng khác.
export function openConversation(partnerId, jobId) {
  return request("/api/chat/conversations", jsonOptions("POST", { partnerId, jobId }));
}

export function getChatMessages(conversationId) {
  return request(`/api/chat/conversations/${conversationId}/messages`);
}

// Ngữ cảnh tuyển dụng của cuộc trò chuyện (panel bên phải trang
// Tin nhắn của ứng viên): tin liên quan, trạng thái đơn, lịch
// phỏng vấn sắp tới.
export function getConversationContext(conversationId) {
  return request(`/api/chat/conversations/${conversationId}/context`);
}

export function sendChatMessageRest(conversationId, content) {
  return request(`/api/chat/conversations/${conversationId}/messages`,
      jsonOptions("POST", { content }));
}

// Gửi một ảnh lấy từ máy của người dùng vào cuộc trò chuyện.
// Không đặt Content-Type thủ công để trình duyệt tự gắn ranh giới
// multipart cho FormData.
export function sendChatImage(conversationId, file) {
  const form = new FormData();
  form.append("file", file);
  return request(`/api/chat/conversations/${conversationId}/image`, {
    method: "POST",
    body: form,
  });
}

/* ---------------- WebSocket ---------------- */

// Địa chỉ WebSocket: cùng máy chủ với trang, cổng backend 8080
// (API REST đi qua proxy của Vite nên dùng đường tương đối, còn
// WebSocket nối thẳng vào backend).
function socketUrl() {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.hostname}:8080/ws/chat`;
}

// Kết nối chat realtime. onEvent nhận các khung:
//   { type: "message", message } — có tin nhắn mới (kể cả tin mình gửi)
//   { type: "read", conversationId, readerId } — đối phương đã đọc
//   { type: "error", message } — lỗi từ server (vd: hết quyền)
//   { type: "status", online } — trạng thái kết nối thay đổi
// Trả về đối tượng điều khiển { send, markRead, close, isOpen }.
export function connectChat(onEvent) {
  let socket = null;
  let closedByUser = false;
  let retryMs = 1000;
  let retryTimer = null;

  function open() {
    socket = new WebSocket(socketUrl());
    socket.onopen = () => {
      retryMs = 1000;
      onEvent({ type: "status", online: true });
    };
    socket.onmessage = (event) => {
      try {
        onEvent(JSON.parse(event.data));
      } catch {
        // Khung lạ thì bỏ qua.
      }
    };
    socket.onclose = () => {
      onEvent({ type: "status", online: false });
      if (!closedByUser) {
        retryTimer = setTimeout(open, retryMs);
        retryMs = Math.min(retryMs * 2, 10000);
      }
    };
    socket.onerror = () => {
      try { socket.close(); } catch { /* đã đóng */ }
    };
  }

  open();

  return {
    // Gửi tin qua socket. Trả false nếu socket chưa mở để nơi gọi dùng REST.
    send(conversationId, content) {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "send", conversationId, content }));
        return true;
      }
      return false;
    },
    markRead(conversationId) {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "read", conversationId }));
      }
    },
    isOpen() {
      return Boolean(socket && socket.readyState === WebSocket.OPEN);
    },
    close() {
      closedByUser = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (socket) {
        try { socket.close(); } catch { /* đã đóng */ }
      }
    },
  };
}