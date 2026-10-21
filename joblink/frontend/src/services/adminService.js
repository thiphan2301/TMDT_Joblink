// Service cho khu vực Admin — gọi API /api/admin/* của backend Spring Boot.
// Toàn bộ dữ liệu lấy từ database qua API, KHÔNG có dữ liệu mẫu/fix cứng:
// backend chưa chạy hoặc chưa có quyền admin thì hàm ném lỗi và trang
// hiển thị thông báo lỗi (xem hooks/useAdminData.js).

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

/* ---------------- Tổng quan ---------------- */

// from/to (yyyy-mm-dd) không bắt buộc: khoảng ngày xem tăng trưởng.
export function getAdminOverview(from, to) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return request(`/api/admin/overview${qs ? `?${qs}` : ""}`);
}

/* ---------------- Người dùng ---------------- */

export function getAdminUsers() {
  return request("/api/admin/users");
}

export async function createAdminUser(payload) {
  return request("/api/admin/users", jsonOptions("POST", payload));
}

export async function updateAdminUser(id, payload) {
  return request(`/api/admin/users/${id}`, jsonOptions("PUT", payload));
}

export async function changeAdminUserPassword(id, newPassword) {
  return request(`/api/admin/users/${id}/password`, jsonOptions("PATCH", { newPassword }));
}

// Cấp gói Pro / hạ về Basic cho nhà tuyển dụng.
export async function setAdminUserPlan(id, plan) {
  return request(`/api/admin/users/${id}/plan`, jsonOptions("PATCH", { plan }));
}

export async function setAdminUserStatus(id, status) {
  return request(`/api/admin/users/${id}/status`, jsonOptions("PATCH", { status }));
}

export async function deleteAdminUser(id) {
  return request(`/api/admin/users/${id}`, { method: "DELETE" });
}

/* ---------------- Tin tuyển dụng ---------------- */

export function getAdminJobs() {
  return request("/api/admin/jobs");
}

export function getAdminCompanies() {
  return request("/api/admin/companies");
}

export async function createAdminJob(payload) {
  return request("/api/admin/jobs", jsonOptions("POST", payload));
}

export async function updateAdminJob(id, payload) {
  return request(`/api/admin/jobs/${id}`, jsonOptions("PUT", payload));
}

export async function setAdminJobStatus(id, status) {
  return request(`/api/admin/jobs/${id}/status`, jsonOptions("PATCH", { status }));
}

export async function deleteAdminJob(id) {
  return request(`/api/admin/jobs/${id}`, { method: "DELETE" });
}

export function getAdminJobApplications(jobId) {
  return request(`/api/admin/jobs/${jobId}/applications`);
}

/* ---------------- Báo cáo ---------------- */

// period: "month" (tháng hiện tại) | "3months" | "6months".
// Có from/to thì khoảng ngày được ưu tiên, period bị bỏ qua ở backend.
// Nhận chuỗi (period cũ) hoặc object { period, from, to }.
export function getAdminReport(options = {}) {
  const { period = "6months", from, to } =
    typeof options === "string" ? { period: options } : options;
  const params = new URLSearchParams({ period });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return request(`/api/admin/reports?${params.toString()}`);
}

/* ---------------- Gói dịch vụ ---------------- */

export function getAdminPackages() {
  return request("/api/admin/packages");
}

export async function createPackage(payload) {
  return request("/api/admin/packages", jsonOptions("POST", payload));
}

export async function updatePackage(id, payload) {
  return request(`/api/admin/packages/${id}`, jsonOptions("PUT", payload));
}

export async function deletePackage(id) {
  return request(`/api/admin/packages/${id}`, { method: "DELETE" });
}

export async function createTokenPackage(payload) {
  return request("/api/admin/packages/token-packages", jsonOptions("POST", payload));
}

export async function updateTokenPackage(id, payload) {
  return request(`/api/admin/packages/token-packages/${id}`, jsonOptions("PUT", payload));
}

export async function deleteTokenPackage(id) {
  return request(`/api/admin/packages/token-packages/${id}`, { method: "DELETE" });
}

export async function createPromotion(payload) {
  return request("/api/admin/packages/promotions", jsonOptions("POST", payload));
}

export async function updatePromotion(id, payload) {
  return request(`/api/admin/packages/promotions/${id}`, jsonOptions("PUT", payload));
}

export async function deletePromotion(id) {
  return request(`/api/admin/packages/promotions/${id}`, { method: "DELETE" });
}
