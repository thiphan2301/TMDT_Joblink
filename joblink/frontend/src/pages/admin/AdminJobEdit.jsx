import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { AdminPageHeader } from "../../components/admin/AdminLayout.jsx";
import { FieldLabel } from "../../components/admin/AdminModal.jsx";
import { IconClock, IconSend } from "../../components/admin/AdminIcons.jsx";
import { formatExpiry, salaryTextOf, parseSalaryText } from "../../components/admin/adminFormat.js";
import {
  getAdminJobs,
  getAdminCompanies,
  createAdminJob,
  updateAdminJob,
} from "../../services/adminService.js";

// Các danh sách chọn của form (giá trị lưu thẳng vào cột tương ứng trong DB).
const LOCATIONS = ["Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Cần Thơ", "Khác"];
const INDUSTRIES = ["Thiết kế", "Công nghệ thông tin", "Marketing", "Sản phẩm", "Kinh doanh", "Khác"];
const LEVELS = ["Intern", "Fresher", "Junior", "Middle", "Senior"];
const SCHEDULES = ["Hybrid", "Onsite", "Remote"];
const JOB_TYPES = [
  { value: "fulltime", label: "Toàn thời gian" },
  { value: "parttime", label: "Bán thời gian" },
  { value: "intern", label: "Thực tập" },
  { value: "contract", label: "Hợp đồng" },
];

// Trang "Chỉnh sửa / Đăng tin tuyển dụng" — đúng bản thiết kế:
// form 2 cột (Tên vị trí / Mức lương, Địa điểm / Lĩnh vực, Cấp bậc / Hình thức,
// Loại công việc / Hạn ứng tuyển), mô tả, hộp "Thời gian tồn tại của tin",
// và 3 nút Hủy / Tạm dừng & lưu / Lưu thay đổi · 0 Token.
// Mọi dữ liệu đều đọc/ghi qua API vào database — không có dữ liệu mẫu.
export default function AdminJobEdit() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const location = useLocation();

  const [job, setJob] = useState(location.state?.job || null);
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [loading, setLoading] = useState(!location.state?.job);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    title: "", salaryText: "", location: "Hồ Chí Minh", industry: "Thiết kế",
    level: "Senior", workingSchedule: "Hybrid", jobType: "fulltime",
    deadline: "", description: "",
  });

  useEffect(() => {
    if (isNew) {
      // Đăng tin mới: cần danh sách công ty từ database để chọn công ty sở hữu tin.
      getAdminCompanies()
        .then((list) => {
          setCompanies(list);
          if (list.length > 0) setCompanyId(String(list[0].id));
        })
        .catch((err) => setFormError(err.message || "Không tải được danh sách công ty."))
        .finally(() => setLoading(false));
      return;
    }
    if (job) {
      fillForm(job);
      setLoading(false);
      return;
    }
    getAdminJobs()
      .then((list) => {
        const found = list.find((j) => String(j.id) === String(id));
        if (found) {
          setJob(found);
          fillForm(found);
        } else {
          setFormError("Không tìm thấy tin tuyển dụng này.");
        }
      })
      .catch((err) => setFormError(err.message || "Không tải được tin tuyển dụng."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function fillForm(j) {
    setForm({
      title: j.title || "",
      salaryText: salaryTextOf(j),
      location: j.location || "Hồ Chí Minh",
      industry: j.industry || "Thiết kế",
      level: j.level || "Senior",
      workingSchedule: j.workingSchedule || "Hybrid",
      jobType: j.jobType || "fulltime",
      deadline: j.deadline || "",
      description: j.description || "",
    });
  }

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(nextStatus) {
    if (!form.title.trim()) return setFormError("Vui lòng nhập tên vị trí.");
    if (!form.salaryText.trim()) return setFormError("Vui lòng nhập mức lương.");
    if (!form.deadline) return setFormError("Vui lòng chọn hạn ứng tuyển.");
    if (!form.description.trim()) return setFormError("Vui lòng nhập mô tả công việc.");
    if (isNew && !companyId) return setFormError("Vui lòng chọn công ty đăng tin.");

    const { salaryMin, salaryMax } = parseSalaryText(form.salaryText);
    const payload = {
      title: form.title.trim(),
      salaryMin, salaryMax, salaryUnit: "month",
      location: form.location, industry: form.industry, level: form.level,
      workingSchedule: form.workingSchedule, jobType: form.jobType,
      deadline: form.deadline, description: form.description.trim(),
      status: nextStatus || job?.status || "open",
    };

    setSaving(true);
    setFormError("");
    try {
      if (isNew) {
        await createAdminJob({ ...payload, companyId: Number(companyId) });
      } else {
        await updateAdminJob(job.id, payload);
      }
      navigate("/admin/jobs");
    } catch (err) {
      setFormError(err.message || "Không lưu được tin tuyển dụng.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="admin-loading">Đang tải tin tuyển dụng...</p>;

  return (
    <>
      <AdminPageHeader
        title={isNew ? "Đăng tin tuyển dụng" : "Chỉnh sửa tin tuyển dụng"}
        description="Một mô tả rõ ràng là khởi đầu của một kết nối tốt."
      />

      <div className="admin-panel" style={{ maxWidth: 1060, marginBottom: 24 }}>
        <h2 style={{ marginBottom: 22 }}>Thông tin tuyển dụng</h2>

        {isNew && (
          <label className="admin-field" style={{ marginBottom: 18 }}>
            <FieldLabel required>Công ty đăng tin</FieldLabel>
            <select className="admin-select" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              {companies.length === 0 && <option value="">— Chưa có công ty nào trong database —</option>}
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        )}

        <div className="admin-form-grid">
          <label className="admin-field">
            <FieldLabel required>Tên vị trí</FieldLabel>
            <input className="admin-input" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </label>
          <label className="admin-field">
            <FieldLabel required>Mức lương</FieldLabel>
            <input className="admin-input" value={form.salaryText} onChange={(e) => set("salaryText", e.target.value)} placeholder="25 – 40 triệu" />
          </label>
          <label className="admin-field">
            <FieldLabel required>Địa điểm</FieldLabel>
            <select className="admin-select" value={form.location} onChange={(e) => set("location", e.target.value)}>
              {LOCATIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label className="admin-field">
            <FieldLabel required>Lĩnh vực</FieldLabel>
            <select className="admin-select" value={form.industry} onChange={(e) => set("industry", e.target.value)}>
              {INDUSTRIES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label className="admin-field">
            <FieldLabel required>Cấp bậc</FieldLabel>
            <select className="admin-select" value={form.level} onChange={(e) => set("level", e.target.value)}>
              {LEVELS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label className="admin-field">
            <FieldLabel required>Hình thức</FieldLabel>
            <select className="admin-select" value={form.workingSchedule} onChange={(e) => set("workingSchedule", e.target.value)}>
              {SCHEDULES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label className="admin-field">
            <FieldLabel required>Loại công việc</FieldLabel>
            <select className="admin-select" value={form.jobType} onChange={(e) => set("jobType", e.target.value)}>
              {JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className="admin-field">
            <FieldLabel required>Hạn ứng tuyển</FieldLabel>
            <input className="admin-input" type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
          </label>
        </div>

        <label className="admin-field" style={{ marginTop: 18 }}>
          <FieldLabel required>Mô tả công việc</FieldLabel>
          <textarea className="admin-textarea" value={form.description} onChange={(e) => set("description", e.target.value)} />
        </label>

        {job && (
          <div className="admin-info-box" style={{ marginTop: 22 }}>
            <div className="admin-info-box__head">
              <strong><IconClock size={19} /> Thời gian tồn tại của tin</strong>
              <span className="admin-table__muted">
                Ví nhà tuyển dụng: <strong style={{ color: "var(--a-primary)" }}>{job.employerWalletBalance ?? "—"} Token</strong>
              </span>
            </div>
            <p>
              Tin đã thanh toán <strong>{job.tokenCost} Token / {job.displayDays} ngày</strong>.{" "}
              Hết hạn vào <strong>{formatExpiry(job.expiresAt)}</strong>.
            </p>
            <p>
              Chỉnh sửa nội dung không trừ thêm Token và không gia hạn tin. Tạm dừng cũng không kéo dài thời hạn.
              Sau khi hết hạn, chọn Đăng lại và thanh toán thời hạn mới.
            </p>
          </div>
        )}

        {formError && <p className="admin-form-error" style={{ marginTop: 16 }}>{formError}</p>}

        <div className="admin-edit-actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => navigate("/admin/jobs")} disabled={saving}>
            Hủy
          </button>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => save("closed")} disabled={saving}>
            Tạm dừng &amp; lưu
          </button>
          <button type="button" className="admin-btn admin-btn--primary" onClick={() => save(null)} disabled={saving}>
            <IconSend size={17} /> {saving ? "Đang lưu..." : "Lưu thay đổi · 0 Token"}
          </button>
        </div>
      </div>
    </>
  );
}
