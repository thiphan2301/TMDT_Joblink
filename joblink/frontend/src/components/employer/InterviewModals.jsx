import { useEffect, useState } from "react";
import { EmployerModal, FieldLabel } from "./EmployerModal.jsx";
import { formatDateTime } from "./employerFormat.js";
import useEmployerData from "../../hooks/useEmployerData.js";
import {
  getApplicationInterview, inviteToInterview, rejectApplication,
} from "../../services/employerService.js";

// Hộp thoại quyết định với một đơn ứng tuyển (chức năng 11):
// mời phỏng vấn (kèm lịch) và từ chối (kèm lý do). Kết quả hiện ngay
// ở trang "Việc đã ứng tuyển" của ứng viên.

// Phản hồi của ứng viên với lời mời.
const INTERVIEW_RESPONSE = {
  pending: { label: "Chờ ứng viên phản hồi", badge: "emp-badge--amber" },
  accepted: { label: "Ứng viên xác nhận tham gia", badge: "emp-badge--green" },
  declined: { label: "Ứng viên từ chối lịch", badge: "emp-badge--red" },
};

const pad = (n) => String(n).padStart(2, "0");

// Date -> "2026-11-10T09:30" (giá trị của ô datetime-local, giờ máy người dùng).
function toInputValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
      + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Gợi ý mặc định: 9 giờ sáng hôm sau.
function tomorrowMorning() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return toInputValue(date);
}

// app: { id, candidateName, status }. Đơn đã được mời thì điền sẵn lịch cũ
// để nhà tuyển dụng đổi lịch.
export function InviteInterviewModal({ app, onClose, onDone }) {
  const rescheduling = app.status === "invited";
  const [form, setForm] = useState({ scheduledAt: tomorrowMorning(), location: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!rescheduling) return undefined;
    let cancelled = false;
    getApplicationInterview(app.id)
        .then((interview) => {
          if (cancelled || !interview) return;
          setForm({
            scheduledAt: String(interview.scheduledAt || "").slice(0, 16) || tomorrowMorning(),
            location: interview.location || "",
            notes: interview.notes || "",
          });
        })
        .catch(() => {
          // Không tải được lịch cũ: vẫn cho nhập lịch mới.
        });
    return () => {
      cancelled = true;
    };
  }, [app.id, rescheduling]);

  function set(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!form.scheduledAt) {
      setError("Vui lòng chọn thời gian phỏng vấn.");
      return;
    }
    if (!form.location.trim()) {
      setError("Vui lòng nhập địa điểm hoặc link phỏng vấn trực tuyến.");
      return;
    }
    setSaving(true);
    try {
      await inviteToInterview(app.id, form);
      onDone(rescheduling
          ? `Đã gửi lịch phỏng vấn mới cho ${app.candidateName}.`
          : `Đã mời ${app.candidateName} phỏng vấn.`);
    } catch (err) {
      setError(err.message || "Không gửi được lời mời phỏng vấn.");
      setSaving(false);
    }
  }

  return (
      <EmployerModal
          title={rescheduling ? "Đổi lịch phỏng vấn" : "Mời phỏng vấn"}
          onClose={saving ? () => {} : onClose}
      >
        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          <p className="emp-muted" style={{ margin: 0 }}>
            Ứng viên <strong>{app.candidateName}</strong> sẽ thấy lịch này và xác nhận tham gia
            trong trang "Việc đã ứng tuyển".
          </p>

          <label className="emp-field">
            <FieldLabel required>Thời gian</FieldLabel>
            <input
                className="emp-input"
                type="datetime-local"
                min={toInputValue(new Date())}
                value={form.scheduledAt}
                onChange={(e) => set("scheduledAt", e.target.value)}
                required
            />
          </label>

          <label className="emp-field">
            <FieldLabel required>Địa điểm</FieldLabel>
            <input
                className="emp-input"
                value={form.location}
                maxLength={500}
                onChange={(e) => set("location", e.target.value)}
                placeholder="VD: Tầng 10, 52 Út Tịch, Tân Bình hoặc link Google Meet"
                required
            />
          </label>

          <label className="emp-field">
            <FieldLabel>Ghi chú cho ứng viên</FieldLabel>
            <textarea
                className="emp-input"
                rows={3}
                maxLength={2000}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="VD: Mang theo laptop, liên hệ chị Lan 0901 234 567 khi tới nơi"
            />
          </label>

          {error && <p className="emp-form-error" role="alert" style={{ margin: 0 }}>{error}</p>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="emp-btn" onClick={onClose} disabled={saving}>Hủy</button>
            <button type="submit" className="emp-btn emp-btn--primary" disabled={saving}>
              {saving ? "Đang gửi..." : rescheduling ? "Gửi lịch mới" : "Gửi lời mời"}
            </button>
          </div>
        </form>
      </EmployerModal>
  );
}

// app: { id, candidateName }.
export function RejectApplicationModal({ app, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await rejectApplication(app.id, reason);
      onDone(`Đã từ chối hồ sơ của ${app.candidateName}.`);
    } catch (err) {
      setError(err.message || "Không từ chối được hồ sơ.");
      setSaving(false);
    }
  }

  return (
      <EmployerModal title="Từ chối hồ sơ" onClose={saving ? () => {} : onClose}>
        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          <p className="emp-muted" style={{ margin: 0 }}>
            Hồ sơ của <strong>{app.candidateName}</strong> sẽ chuyển sang "Từ chối".
          </p>

          <label className="emp-field">
            <FieldLabel>Lý do (hiển thị cho ứng viên)</FieldLabel>
            <textarea
                className="emp-input"
                rows={3}
                maxLength={2000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Vị trí cần tối thiểu 2 năm kinh nghiệm React. Có thể bỏ trống."
            />
          </label>

          {error && <p className="emp-form-error" role="alert" style={{ margin: 0 }}>{error}</p>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="emp-btn" onClick={onClose} disabled={saving}>Hủy</button>
            <button type="submit" className="emp-btn emp-btn--danger" disabled={saving}>
              {saving ? "Đang lưu..." : "Từ chối hồ sơ"}
            </button>
          </div>
        </form>
      </EmployerModal>
  );
}

// Lịch phỏng vấn + phản hồi của ứng viên, dùng trong chi tiết đơn.
export function InterviewSummary({ applicationId }) {
  const { data: interview, loading } = useEmployerData(
      () => getApplicationInterview(applicationId), [applicationId],
  );

  if (loading || !interview) return null;

  const response = INTERVIEW_RESPONSE[interview.status] || INTERVIEW_RESPONSE.pending;

  return (
      <div>
        <dt>Lịch phỏng vấn</dt>
        <dd>
          <div>{formatDateTime(interview.scheduledAt)} · {interview.location}</div>
          {interview.notes && (
              <div className="emp-muted" style={{ whiteSpace: "pre-wrap" }}>{interview.notes}</div>
          )}
          <span className={`emp-badge ${response.badge}`} style={{ marginTop: 6, display: "inline-block" }}>
            {response.label}
          </span>
        </dd>
      </div>
  );
}
