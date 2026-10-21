import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { AdminPageHeader } from "../../components/admin/AdminLayout.jsx";
import { AdminModal, ConfirmDelete } from "../../components/admin/AdminModal.jsx";
import { IconPlus, IconEdit, IconTrash } from "../../components/admin/AdminIcons.jsx";
import { JOB_STATUS_LABELS, formatExpiry, salaryTextOf, formatDateTime } from "../../components/admin/adminFormat.js";
import useAdminData from "../../hooks/useAdminData.js";
import {
  getAdminJobs,
  setAdminJobStatus,
  deleteAdminJob,
  getAdminJobApplications,
} from "../../services/adminService.js";

const APPLICATION_STATUS = {
  pending: "Chờ xử lý", viewed: "Đã xem", invited: "Mời phỏng vấn",
  accepted: "Đã nhận", hired: "Đã tuyển", rejected: "Từ chối",
};

// Trang "Quản lý tin tuyển dụng" — đúng bản thiết kế:
// tìm theo vị trí, bảng gồm vị trí / địa điểm / thời hạn hiển thị / trạng thái
// (dropdown đổi ngay) / thao tác sửa - xóa - xem ứng viên.
export default function AdminJobs() {
  const navigate = useNavigate();
  const { data: jobs, loading, error, reload } = useAdminData(getAdminJobs, []);
  const [keyword, setKeyword] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [viewingJob, setViewingJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const filtered = useMemo(() => {
    if (!jobs) return [];
    const kw = keyword.trim().toLowerCase();
    return jobs.filter((j) => !kw || j.title.toLowerCase().includes(kw));
  }, [jobs, keyword]);

  async function changeStatus(job, status) {
    setBusy(true);
    setActionError("");
    try {
      await setAdminJobStatus(job.id, status);
      await reload();
    } catch (err) {
      setActionError(err.message || "Không đổi được trạng thái.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setActionError("");
    try {
      await deleteAdminJob(deleting.id);
      await reload();
      setDeleting(null);
    } catch (err) {
      setActionError(err.message || "Không xóa được tin tuyển dụng.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Quản lý tin tuyển dụng"
        description="Quản lý vị trí tuyển dụng và kết nối với nhân tài."
        action={
          <button type="button" className="admin-btn admin-btn--primary" onClick={() => navigate("/admin/jobs/new/edit")}>
            <IconPlus size={18} /> Đăng tin mới
          </button>
        }
      />
      {error && <p className="admin-error">{error}</p>}
      {actionError && <p className="admin-error">{actionError}</p>}

      <div className="admin-card-table">
        <div className="admin-card-table__toolbar">
          <div className="admin-toolbar">
            <input
              className="admin-input"
              placeholder="Tìm vị trí tuyển dụng..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              aria-label="Tìm vị trí tuyển dụng"
            />
          </div>
        </div>

        {loading ? (
          <p className="admin-loading">Đang tải danh sách tin tuyển dụng...</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Vị trí tuyển dụng</th><th>Địa điểm</th>
                <th>Thời hạn hiển thị</th><th>Trạng thái</th><th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((job) => (
                <tr
                  key={job.id}
                  className={job.employerPlan === "premium" ? "admin-row--premium"
                    : job.employerPlan === "pro" ? "admin-row--pro" : undefined}
                >
                  <td>
                    <div className="admin-table__title">
                      {job.title}
                      {job.employerPlan === "premium" && (
                        <span className="admin-badge admin-badge--blue" style={{ marginLeft: 8 }}>PREMIUM</span>
                      )}
                      {job.employerPlan === "pro" && (
                        <span className="admin-badge admin-badge--gold" style={{ marginLeft: 8 }}>PRO</span>
                      )}
                    </div>
                    <div className="admin-table__sub">{job.companyName} · {salaryTextOf(job)}</div>
                  </td>
                  <td className="admin-table__muted">{job.location}</td>
                  <td>
                    <div>{job.displayDays} ngày · {job.tokenCost} Token</div>
                    <div className="admin-table__sub">Hết hạn: {formatExpiry(job.expiresAt)}</div>
                  </td>
                  <td>
                    <select
                      className={`admin-status-select${job.status === "open" ? "" : job.status === "closed" ? " is-closed" : job.status === "pending_review" ? " is-pending" : " is-rejected"}`}
                      value={job.status}
                      onChange={(e) => changeStatus(job, e.target.value)}
                      disabled={busy}
                      aria-label={`Trạng thái của ${job.title}`}
                    >
                      {Object.entries(JOB_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button
                        type="button" className="admin-icon-btn admin-icon-btn--round"
                        onClick={() => navigate(`/admin/jobs/${job.id}/edit`, { state: { job } })}
                        aria-label={`Sửa ${job.title}`}
                      >
                        <IconEdit size={17} />
                      </button>
                      <button type="button" className="admin-icon-btn" onClick={() => setDeleting(job)} aria-label={`Xóa ${job.title}`}>
                        <IconTrash size={18} />
                      </button>
                      <button type="button" className="admin-link" onClick={() => setViewingJob(job)}>
                        Ứng viên{typeof job.applicants === "number" ? ` (${job.applicants})` : ""}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="admin-table__muted">Không tìm thấy tin tuyển dụng phù hợp.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {deleting && (
        <ConfirmDelete
          title="Xóa tin tuyển dụng?"
          message={<>Tin <strong>{deleting.title}</strong> ({deleting.companyName}) sẽ bị xóa khỏi hệ thống. Thao tác không thể hoàn tác.</>}
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      )}

      {viewingJob && (
        <ApplicationsModal job={viewingJob} onClose={() => setViewingJob(null)} />
      )}
    </>
  );
}

function ApplicationsModal({ job, onClose }) {
  const { data, loading, error } = useAdminData(() => getAdminJobApplications(job.id), [job.id]);
  const list = data;

  return (
    <AdminModal title={`Ứng viên — ${job.title}`} onClose={onClose} wide>
      {loading && <p className="admin-loading">Đang tải danh sách ứng viên...</p>}
      {error && <p className="admin-error">{error}</p>}
      {Array.isArray(list) && (
        list.length === 0
          ? <p className="admin-table__muted">Chưa có ứng viên nào ứng tuyển tin này.</p>
          : (
            <table className="admin-table">
              <thead><tr><th>Ứng viên</th><th>Trạng thái</th><th>Ngày ứng tuyển</th></tr></thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="admin-table__title">{a.candidateName}</div>
                      <div className="admin-table__sub">{a.candidateEmail}</div>
                    </td>
                    <td><span className="admin-badge admin-badge--blue">{APPLICATION_STATUS[a.status] || a.status}</span></td>
                    <td className="admin-table__muted">{formatDateTime(a.appliedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
      )}
    </AdminModal>
  );
}
