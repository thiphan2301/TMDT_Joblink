// Service cho khu vực Nhà tuyển dụng — gọi API /api/employer/* của
// backend Spring Boot. Dữ liệu lấy từ database qua API; backend chưa
// chạy hoặc sai quyền thì hàm ném lỗi để trang hiển thị thông báo.
// Lỗi có gắn thêm .status (mã HTTP) để trang phân biệt 403 bị khóa
// tính năng theo gói với lỗi thường.

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { Accept: "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.message || `Thao tác thất bại. Mã lỗi: ${response.status}`);
    err.status = response.status;
    throw err;
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

function queryString(params) {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") qs.set(key, value);
  });
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/* ---------------- Tổng quan + công ty ---------------- */

export function getEmployerDashboard(from, to) {
  return request(`/api/employer/dashboard${queryString({ from, to })}`);
}

export function getEmployerCompanies() {
  return request("/api/employer/companies");
}

/* ---------------- Tin tuyển dụng ---------------- */

export function getEmployerJobs() {
  return request("/api/employer/jobs");
}

export function getEmployerJob(id) {
  return request(`/api/employer/jobs/${id}`);
}

export function createEmployerJob(payload) {
  return request("/api/employer/jobs", jsonOptions("POST", payload));
}

export function updateEmployerJob(id, payload) {
  return request(`/api/employer/jobs/${id}`, jsonOptions("PUT", payload));
}

export function setEmployerJobStatus(id, status) {
  return request(`/api/employer/jobs/${id}/status`, jsonOptions("PATCH", { status }));
}

export function deleteEmployerJob(id) {
  return request(`/api/employer/jobs/${id}`, { method: "DELETE" });
}

/* ---------------- Đơn ứng tuyển ---------------- */

export function getJobApplications(jobId) {
  return request(`/api/employer/jobs/${jobId}/applications`);
}

// Toàn bộ đơn trên mọi tin — trang Quản lý ứng viên.
export function getApplicationsGlobal({ jobId, status, q } = {}) {
  return request(`/api/employer/applications${queryString({ jobId, status, q })}`);
}

export function getApplicationsSummary() {
  return request("/api/employer/applications/summary");
}

export function getApplicationDetail(id) {
  return request(`/api/employer/applications/${id}`);
}

export function setApplicationStatus(id, status) {
  return request(`/api/employer/applications/${id}/status`, jsonOptions("PATCH", { status }));
}

/* ---------------- Mời phỏng vấn / từ chối ---------------- */

// Lời mời phỏng vấn mới nhất của đơn (kèm phản hồi của ứng viên);
// null nếu chưa mời (API trả 204).
export async function getApplicationInterview(id) {
  const data = await request(`/api/employer/applications/${id}/interview`);
  return data?.id ? data : null;
}

// scheduledAt dạng "2026-11-10T09:30" (giá trị của ô datetime-local).
export function inviteToInterview(id, { scheduledAt, location, notes }) {
  return request(`/api/employer/applications/${id}/interview`,
      jsonOptions("POST", { scheduledAt, location, notes }));
}

// reason: lý do từ chối hiển thị cho ứng viên, có thể bỏ trống.
export function rejectApplication(id, reason) {
  return request(`/api/employer/applications/${id}/reject`, jsonOptions("POST", { reason }));
}

/* ---------------- Tìm kiếm ứng viên ---------------- */

export function searchCandidates({ q, skill, location } = {}) {
  return request(`/api/employer/candidates${queryString({ q, skill, location })}`);
}

export function getCandidateDetail(id) {
  return request(`/api/employer/candidates/${id}`);
}

/* ---------------- Hồ sơ công ty ---------------- */

export function getCompanyProfile(companyId) {
  return request(`/api/employer/company${queryString({ companyId })}`);
}

export function updateCompanyProfile(id, payload) {
  return request(`/api/employer/company/${id}`, jsonOptions("PUT", payload));
}

// Nhà tuyển dụng tự tạo công ty cho chính mình — trả về hồ sơ công ty
// vừa tạo (trạng thái chờ xác thực).
export function createCompany(payload) {
  return request(`/api/employer/company`, jsonOptions("POST", payload));
}

// Tải logo công ty lên từ máy tính (multipart) — trả về hồ sơ đã cập nhật.
export async function uploadCompanyLogo(id, file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`/api/employer/company/${id}/logo`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.message || `Tải ảnh thất bại. Mã lỗi: ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return data;
}

// Tải ảnh bìa công ty lên từ máy tính (multipart) — trả về hồ sơ đã cập nhật.
export async function uploadCompanyCover(id, file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`/api/employer/company/${id}/cover`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.message || `Tải ảnh thất bại. Mã lỗi: ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return data;
}

/* ---------------- Đánh giá & phản hồi ---------------- */

export function getReviews() {
  return request("/api/employer/reviews");
}

export function replyToReview(id, content) {
  return request(`/api/employer/reviews/${id}/reply`, jsonOptions("POST", { content }));
}

export function updateReviewReply(id, content) {
  return request(`/api/employer/reviews/${id}/reply`, jsonOptions("PUT", { content }));
}

export function deleteReviewReply(id) {
  return request(`/api/employer/reviews/${id}/reply`, { method: "DELETE" });
}

/* ---------------- Gói dịch vụ + ví ---------------- */

export function getEmployerPlan() {
  return request("/api/employer/plan");
}

export function getPackages() {
  return request("/api/employer/packages");
}

export function getSubscriptionHistory() {
  return request("/api/employer/subscriptions");
}

export function getWallet() {
  return request("/api/employer/wallet");
}