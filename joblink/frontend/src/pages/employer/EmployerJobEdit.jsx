import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { EmployerPageHeader } from "../../components/employer/EmployerLayout.jsx";
import { FieldLabel } from "../../components/employer/EmployerModal.jsx";
import { IconCheck } from "../../components/employer/EmployerIcons.jsx";
import {
  getEmployerCompanies, getEmployerJob, createEmployerJob, updateEmployerJob,
} from "../../services/employerService.js";

// Form đăng tin mới / sửa tin của nhà tuyển dụng. Cùng một màn hình cho
// cả hai việc: có id trên URL là sửa, không có là đăng mới.
const JOB_TYPES = ["Toàn thời gian", "Bán thời gian", "Thực tập", "Hợp đồng", "Freelance"];
const LEVELS = [
  { value: "intern", label: "Thực tập sinh" },
  { value: "fresher", label: "Fresher" },
  { value: "junior", label: "Junior" },
  { value: "middle", label: "Middle" },
  { value: "senior", label: "Senior" },
  { value: "manager", label: "Quản lý" },
];

const EMPTY_FORM = {
  companyId: "", title: "", location: "", jobType: "Toàn thời gian",
  level: "fresher", salaryMin: "", salaryMax: "", salaryUnit: "month",
  vacancies: 1, workingSchedule: "", deadline: "", displayDays: 7,
  tokenCost: 20, status: "open", description: "", requirements: "",
};

export default function EmployerJobEdit() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const companyList = await getEmployerCompanies();
        if (cancelled) return;
        setCompanies(companyList);
        if (isEdit) {
          const job = await getEmployerJob(id);
          if (cancelled) return;
          setForm({
            companyId: job.companyId ?? "",
            title: job.title || "",
            location: job.location || "",
            jobType: job.jobType || "Toàn thời gian",
            level: job.level || "fresher",
            salaryMin: job.salaryMin ?? "",
            salaryMax: job.salaryMax ?? "",
            salaryUnit: job.salaryUnit || "month",
            vacancies: job.vacancies ?? 1,
            workingSchedule: job.workingSchedule || "",
            deadline: job.deadline || "",
            displayDays: job.displayDays ?? 7,
            tokenCost: job.tokenCost ?? 20,
            status: ["draft", "open", "closed"].includes(job.status) ? job.status : "open",
            description: job.description || "",
            requirements: job.requirements || "",
          });
        } else if (companyList.length > 0) {
          setForm((f) => ({ ...f, companyId: companyList[0].id }));
        }
      } catch (err) {
        if (!cancelled) setFormError(err.message || "Không tải được dữ liệu.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isEdit]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function numOrNull(v) {
    return v === "" || v === null ? null : Number(v);
  }

  async function submit(e) {
    e.preventDefault();
    setFormError("");
    if (!form.title.trim()) return setFormError("Vui lòng nhập tên vị trí.");
    if (!form.companyId) return setFormError("Vui lòng chọn công ty đăng tin.");
    const payload = {
      companyId: Number(form.companyId),
      title: form.title.trim(),
      location: form.location || null,
      jobType: form.jobType || null,
      level: form.level || null,
      salaryMin: numOrNull(form.salaryMin),
      salaryMax: numOrNull(form.salaryMax),
      salaryUnit: form.salaryUnit,
      vacancies: Number(form.vacancies) || 1,
      workingSchedule: form.workingSchedule || null,
      deadline: form.deadline || null,
      displayDays: Number(form.displayDays) || 7,
      tokenCost: Number(form.tokenCost) || 0,
      status: form.status,
      description: form.description || null,
      requirements: form.requirements || null,
    };
    setSaving(true);
    try {
      if (isEdit) {
        await updateEmployerJob(id, payload);
      } else {
        await createEmployerJob(payload);
      }
      navigate("/employer/jobs");
    } catch (err) {
      setFormError(err.message || "Không lưu được tin tuyển dụng.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="emp-muted">Đang tải dữ liệu...</p>;
  }

  return (
    <>
      <EmployerPageHeader
        title={isEdit ? "Sửa tin tuyển dụng" : "Đăng tin mới"}
        description={isEdit ? "Cập nhật nội dung tin của công ty bạn." : "Điền thông tin vị trí cần tuyển."}
        action={<Link to="/employer/jobs" className="emp-btn">← Về danh sách</Link>}
      />
      {companies.length === 0 && (
        <p className="emp-error">
          Tài khoản của bạn chưa sở hữu công ty nào trong hệ thống nên chưa đăng tin được.
          Hãy liên hệ quản trị viên để được gắn công ty.
        </p>
      )}

      <form className="emp-panel" onSubmit={submit}>
        <div className="emp-form-grid">
          <label className="emp-field">
            <FieldLabel required>Công ty đăng tin</FieldLabel>
            <select className="emp-input" value={form.companyId} onChange={(e) => set("companyId", e.target.value)} disabled={isEdit}>
              <option value="">— Chọn công ty —</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="emp-field">
            <FieldLabel required>Tên vị trí</FieldLabel>
            <input className="emp-input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="VD: Lập trình viên Java" />
          </label>
          <label className="emp-field">
            <FieldLabel>Địa điểm</FieldLabel>
            <input className="emp-input" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="VD: TP. Hồ Chí Minh" />
          </label>
          <label className="emp-field">
            <FieldLabel>Hình thức</FieldLabel>
            <select className="emp-input" value={form.jobType} onChange={(e) => set("jobType", e.target.value)}>
              {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="emp-field">
            <FieldLabel>Cấp bậc</FieldLabel>
            <select className="emp-input" value={form.level} onChange={(e) => set("level", e.target.value)}>
              {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </label>
          <label className="emp-field">
            <FieldLabel>Số lượng tuyển</FieldLabel>
            <input className="emp-input" type="number" min="1" value={form.vacancies} onChange={(e) => set("vacancies", e.target.value)} />
          </label>
          <label className="emp-field">
            <FieldLabel>Lương tối thiểu (VNĐ)</FieldLabel>
            <input className="emp-input" type="number" min="0" value={form.salaryMin} onChange={(e) => set("salaryMin", e.target.value)} placeholder="Để trống = thương lượng" />
          </label>
          <label className="emp-field">
            <FieldLabel>Lương tối đa (VNĐ)</FieldLabel>
            <input className="emp-input" type="number" min="0" value={form.salaryMax} onChange={(e) => set("salaryMax", e.target.value)} />
          </label>
          <label className="emp-field">
            <FieldLabel>Đơn vị lương</FieldLabel>
            <select className="emp-input" value={form.salaryUnit} onChange={(e) => set("salaryUnit", e.target.value)}>
              <option value="month">Theo tháng</option>
              <option value="hour">Theo giờ</option>
              <option value="project">Theo dự án</option>
            </select>
          </label>
          <label className="emp-field">
            <FieldLabel>Thời gian làm việc</FieldLabel>
            <input className="emp-input" value={form.workingSchedule} onChange={(e) => set("workingSchedule", e.target.value)} placeholder="VD: Thứ 2 – Thứ 6, 8h – 17h" />
          </label>
          <label className="emp-field">
            <FieldLabel>Hạn nộp hồ sơ</FieldLabel>
            <input className="emp-input" type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
          </label>
          <label className="emp-field">
            <FieldLabel>Trạng thái</FieldLabel>
            <select className="emp-input" value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="open">Đăng luôn (Đang hiển thị)</option>
              <option value="draft">Lưu nháp</option>
              <option value="closed">Đã đóng</option>
            </select>
          </label>
          <label className="emp-field">
            <FieldLabel>Số ngày hiển thị</FieldLabel>
            <input className="emp-input" type="number" min="1" value={form.displayDays} onChange={(e) => set("displayDays", e.target.value)} />
          </label>
          <label className="emp-field">
            <FieldLabel>Chi phí Token / tin</FieldLabel>
            <input className="emp-input" type="number" min="0" value={form.tokenCost} onChange={(e) => set("tokenCost", e.target.value)} />
          </label>
        </div>

        <label className="emp-field" style={{ marginTop: 14 }}>
          <FieldLabel>Mô tả công việc</FieldLabel>
          <textarea className="emp-input" rows={6} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </label>
        <label className="emp-field" style={{ marginTop: 14 }}>
          <FieldLabel>Yêu cầu ứng viên</FieldLabel>
          <textarea className="emp-input" rows={5} value={form.requirements} onChange={(e) => set("requirements", e.target.value)} />
        </label>

        {formError && <p className="emp-form-error">{formError}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button type="submit" className="emp-btn emp-btn--primary" disabled={saving || companies.length === 0}>
            {saving ? "Đang lưu..." : <>{isEdit ? "Lưu thay đổi" : "Đăng tin"} <IconCheck size={17} /></>}
          </button>
          <Link to="/employer/jobs" className="emp-btn">Hủy</Link>
        </div>
      </form>
    </>
  );
}
