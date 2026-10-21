// Service khu vực ứng viên: Ví Token và Trợ lý AI (API riêng
// /api/candidate/** và /api/assistant/**, số liệu thật từ backend).

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

// Ví Token: số dư, tổng nhận/chi, lịch sử giao dịch, gói Token.
export function getCandidateWallet() {
  return request("/api/candidate/wallet");
}

// Hồ sơ rút gọn của ứng viên (tên, avatar, kỹ năng, độ hoàn thiện).
export function getAssistantProfile() {
  return request("/api/assistant/profile");
}

// Hỏi Trợ lý AI — trả { reply, jobs }.
export function sendAssistantMessage(message) {
  return request("/api/assistant/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
}

// Trang Tổng quan ứng viên (số liệu thật của người đang đăng nhập).
export function getCandidateOverview() {
  return request("/api/candidate/overview");
}

// Trang công ty công khai theo thiết kế mới.
export function getCompanyPage(id) {
  return request(`/api/companies/${id}`);
}