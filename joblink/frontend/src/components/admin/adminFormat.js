// Hàm định dạng dùng chung trong khu vực admin.

export const ROLE_LABELS = {
  candidate: "Ứng viên",
  employer: "Nhà tuyển dụng",
  admin: "Quản trị viên",
};

export const JOB_STATUS_LABELS = {
  open: "Đang tuyển",
  closed: "Tạm dừng",
  pending_review: "Chờ duyệt",
  draft: "Nháp",
  expired: "Hết hạn",
  rejected: "Bị từ chối",
};

export function initialsOf(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// 12480 -> "12.480" (dấu chấm phân cách hàng nghìn kiểu VN)
export function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
}

// 74000000 -> "74 triệu đ"; 1999000 -> "1.999.000 đ"
export function formatMoneyCompact(value) {
  const v = Number(value) || 0;
  if (v >= 1000000 && v % 1000000 === 0) return `${v / 1000000} triệu đ`;
  return `${formatNumber(v)} đ`;
}

export function formatMoney(value) {
  return `${formatNumber(value)} đ`;
}

// 12.8 -> "+12,8%"; -3 -> "-3,0%"
export function formatPercent(value) {
  const v = Number(value) || 0;
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1).replace(".", ",")}%`;
}

// "2026-10-22T19:34:00" -> "19:34 22/10/26" (đúng mẫu trong bản thiết kế)
export function formatExpiry(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${hh}:${mm} ${dd}/${mo}/${yy}`;
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN");
}

// Lương hiển thị trong bảng tin: ưu tiên salaryText có sẵn, không thì tự ghép.
export function salaryTextOf(job) {
  if (job.salaryText) return job.salaryText;
  if (job.salaryMin == null && job.salaryMax == null) return "Thương lượng";
  const min = Math.round((job.salaryMin || 0) / 1000000);
  const max = Math.round((job.salaryMax || 0) / 1000000);
  if (min && max) return `${min} – ${max} triệu`;
  return `${max || min} triệu`;
}

// Form sửa tin dùng 1 ô text "25 – 40 triệu" -> tách về salaryMin/Max (VNĐ).
export function parseSalaryText(text) {
  const nums = String(text || "")
    .replace(",", ".")
    .match(/\d+(\.\d+)?/g);
  if (!nums || nums.length === 0) return { salaryMin: null, salaryMax: null };
  const min = Math.round(parseFloat(nums[0]) * 1000000);
  const max = nums.length > 1 ? Math.round(parseFloat(nums[1]) * 1000000) : min;
  return { salaryMin: min, salaryMax: max };
}
