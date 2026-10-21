// Nhãn hiển thị + hàm định dạng dùng chung cho khu vực nhà tuyển dụng.

export const JOB_STATUS_LABELS = {
  draft: "Bản nháp",
  pending_review: "Chờ duyệt",
  open: "Đang hiển thị",
  closed: "Đã đóng",
  rejected: "Bị từ chối",
  expired: "Hết hạn",
};

export const APPLICATION_STATUS_LABELS = {
  pending: "Chờ xử lý",
  viewed: "Đã xem",
  invited: "Mời phỏng vấn",
  rejected: "Từ chối",
  hired: "Đã tuyển",
};

export const PLAN_LABELS = {
  basic: "Basic",
  pro: "Pro",
  premium: "Premium",
};

// Màu huy hiệu theo trạng thái — dùng chung bảng tin + bảng đơn.
export const JOB_STATUS_BADGE = {
  open: "emp-badge--green",
  draft: "emp-badge--gray",
  pending_review: "emp-badge--amber",
  closed: "emp-badge--gray",
  rejected: "emp-badge--red",
  expired: "emp-badge--gray",
};

export const APPLICATION_STATUS_BADGE = {
  pending: "emp-badge--blue",
  viewed: "emp-badge--amber",
  invited: "emp-badge--purple",
  rejected: "emp-badge--red",
  hired: "emp-badge--green",
};

export const TOKEN_TYPE_LABELS = {
  welcome: "Token chào mừng",
  purchase: "Mua / nạp Token",
  spend: "Chi tiêu Token",
  refund: "Hoàn Token",
  adjustment: "Điều chỉnh số dư",
};

export const SUBSCRIPTION_STATUS_LABELS = {
  active: "Đang hoạt động",
  expired: "Đã hết hạn",
  cancelled: "Đã hủy",
};

// Lời chào theo giờ trong ngày (trang Tổng quan).
export function greetingText() {
  const h = new Date().getHours();
  if (h < 11) return "Chào buổi sáng";
  if (h < 13) return "Chào buổi trưa";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

// Chữ cái đầu để vẽ avatar khi không có ảnh.
export function initialsOf(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// 499000 -> "499.000 đ"
export function formatMoney(value) {
  if (value === null || value === undefined) return "—";
  return `${Number(value).toLocaleString("vi-VN")} đ`;
}

// Khoảng lương của một tin: "15.000.000 đ - 25.000.000 đ/tháng",
// thiếu một đầu thì "Từ ..."/"Đến ...", thiếu cả hai: "Thương lượng".
export function formatSalaryRange(min, max, unit) {
  if (min === null || min === undefined) {
    if (max === null || max === undefined) return "Thương lượng";
  }
  const unitLabel = unit === "year" ? "/năm" : unit === "month" ? "/tháng" : "";
  if (min != null && max != null) {
    return `${formatMoney(min)} - ${formatMoney(max)}${unitLabel}`;
  }
  if (min != null) return `Từ ${formatMoney(min)}${unitLabel}`;
  return `Đến ${formatMoney(max)}${unitLabel}`;
}

// "2026-10-21T11:30:00" -> "21/10/2026 11:30"
export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "2026-10-21" -> "21/10/2026"
export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Giờ nhắn tin trong chat: hôm nay hiện giờ, khác ngày hiện ngày/tháng.
export function formatChatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const now = new Date();
  const sameDay = d.getDate() === now.getDate()
      && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  return sameDay
      ? `${pad(d.getHours())}:${pad(d.getMinutes())}`
      : `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "x giờ trước / x ngày trước" từ mốc thời gian ISO của backend.
export function formatRelativeTime(value) {
  if (!value) return "";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  if (diff < 60 * 1000) return "Vừa xong";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} phút trước`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} giờ trước`;
  const days = Math.floor(diff / 86400000);
  if (days === 1) return "Hôm qua";
  if (days < 30) return `${days} ngày trước`;
  const d = new Date(value);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}