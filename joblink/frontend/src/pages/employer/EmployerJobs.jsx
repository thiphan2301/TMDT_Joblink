import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { EmployerPageHeader } from "../../components/employer/EmployerLayout.jsx";
import { EmployerModal } from "../../components/employer/EmployerModal.jsx";
import {
  IconPlus, IconEdit, IconTrash, IconEye, IconDots, IconPin, IconClock,
  IconBriefcase, IconCheck, IconUsers, IconChart, IconDownload, IconFilter,
  IconSearch, IconInfo,
} from "../../components/employer/EmployerIcons.jsx";
import { JOB_STATUS_LABELS, JOB_STATUS_BADGE, formatDate } from "../../components/employer/employerFormat.js";
import useEmployerData from "../../hooks/useEmployerData.js";
import {
  getEmployerJobs, setEmployerJobStatus, deleteEmployerJob,
} from "../../services/employerService.js";

// Trang "Quản lý tin tuyển dụng" theo thiết kế Employer Portal —
// phần "sản phẩm" của yêu cầu 13: 4 thẻ số liệu, tab trạng thái dạng
// segmented, ô tìm kiếm + nút sắp xếp, bảng tin (số đơn + đơn mới),
// thao tác xem/sửa/đóng/xóa, phân trang, xuất CSV và 3 thẻ mẹo.
// Mọi con số và thao tác đều nối dữ liệu/API thật.
const PAGE_SIZE = 5;

const TABS = [
  { key: "all", label: "Tất cả", statuses: null },
  { key: "open", label: "Đang hoạt động", statuses: ["open"] },
  { key: "pending_review", label: "Chờ duyệt", statuses: ["pending_review"] },
  { key: "draft", label: "Đã lưu", statuses: ["draft"] },
  { key: "closed", label: "Hết hạn / Đã đóng", statuses: ["closed", "expired", "rejected"] },
];

const SORTS = [
  { key: "newest", label: "Mới đăng nhất" },
  { key: "oldest", label: "Cũ nhất" },
  { key: "most_applicants", label: "Nhiều ứng viên nhất" },
  { key: "least_applicants", label: "Ít ứng viên nhất" },
];

// Danh sách số trang có dấu "…" ở giữa khi có quá nhiều trang.
function pageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set([1, 2, total - 1, total, current - 1, current, current + 1]
      .filter((n) => n >= 1 && n <= total));
  const sorted = [...keep].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

export default function EmployerJobs() {
  const [searchParams] = useSearchParams();
  const { data: jobs, loading, error, reload } = useEmployerData(getEmployerJobs, []);
  const [tab, setTab] = useState("all");
  const [keyword, setKeyword] = useState(searchParams.get("q") || "");
  const [sort, setSort] = useState("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [menuId, setMenuId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  // Đồng bộ từ khóa từ URL (ô tìm ở topbar chuyển hướng tới đây kèm
  // ?q=) bằng mẫu "điều chỉnh state ngay khi render" của React docs —
  // không dùng useEffect + setState (rule set-state-in-effect).
  const [seenQ, setSeenQ] = useState(searchParams.get("q"));
  const qParam = searchParams.get("q");
  if (qParam !== seenQ) {
    setSeenQ(qParam);
    setKeyword(qParam || "");
    setPage(1);
  }

  const stats = useMemo(() => ({
    total: jobs?.length ?? 0,
    open: jobs?.filter((j) => j.status === "open").length ?? 0,
    draft: jobs?.filter((j) => j.status === "draft").length ?? 0,
    applicants: jobs?.reduce((s, j) => s + j.applicants, 0) ?? 0,
    newApps: jobs?.reduce((s, j) => s + j.newApplicants, 0) ?? 0,
  }), [jobs]);

  const filtered = useMemo(() => {
    if (!jobs) return [];
    const active = TABS.find((t) => t.key === tab);
    const list = jobs.filter((j) => {
      if (active?.statuses && !active.statuses.includes(j.status)) return false;
      const kw = keyword.trim().toLowerCase();
      if (kw && !`${j.title} ${j.id} ${j.location || ""}`.toLowerCase().includes(kw)) return false;
      return true;
    });
    const by = {
      newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      most_applicants: (a, b) => b.applicants - a.applicants,
      least_applicants: (a, b) => a.applicants - b.applicants,
    }[sort];
    return by ? [...list].sort(by) : list;
  }, [jobs, tab, keyword, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Xuất danh sách tin đang lọc ra file CSV (mở tốt bằng Excel,
  // có BOM nên không lỗi font tiếng Việt).
  function exportCsv() {
    const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const header = ["ID", "Tiêu đề", "Công ty", "Địa điểm", "Hình thức",
      "Trạng thái", "Ngày đăng", "Hết hạn", "Tổng đơn", "Đơn mới 7 ngày"];
    const lines = filtered.map((j) => [
      `JOB-${j.id}`, j.title, j.companyName, j.location || "", j.jobType || "",
      JOB_STATUS_LABELS[j.status] || j.status,
      formatDate(j.createdAt), formatDate(j.expiresAt), j.applicants, j.newApplicants,
    ].map(esc).join(","));
    const blob = new Blob(
        ["\ufeff" + [header.map(esc).join(","), ...lines].join("\n")],
        { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tin-tuyen-dung.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function run(apiCall, successText) {
    setBusy(true);
    setActionError("");
    try {
      await apiCall();
      await reload();
      if (successText) setNotice(successText);
      return true;
    } catch (err) {
      setActionError(err.message || "Thao tác thất bại.");
      return false;
    } finally {
      setBusy(false);
      setMenuId(null);
    }
  }

  async function toggleStatus(job) {
    const next = job.status === "open" ? "closed" : "open";
    await run(() => setEmployerJobStatus(job.id, next),
        `Đã đổi trạng thái tin "${job.title}" thành ${JOB_STATUS_LABELS[next]}.`);
  }

  async function handleDelete() {
    const ok = await run(() => deleteEmployerJob(deleting.id),
        `Đã xóa tin "${deleting.title}".`);
    if (ok) setDeleting(null);
  }

  return (
      <>
        <EmployerPageHeader
            title="Quản lý tin tuyển dụng"
            description="Theo dõi và quản lý các vị trí đang tuyển dụng tại công ty của bạn."
            action={
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="emp-btn" onClick={exportCsv} disabled={!jobs}>
                  <IconDownload size={17} /> Xuất dữ liệu
                </button>
                <Link to="/employer/jobs/new" className="emp-btn emp-btn--primary">
                  <IconPlus size={18} /> Đăng tin mới
                </Link>
              </div>
            }
        />
        {error && <p className="emp-error">{error}</p>}
        {actionError && <p className="emp-error">{actionError}</p>}
        {notice && <p className="emp-success">{notice}</p>}
        {loading && <p className="emp-muted">Đang tải dữ liệu...</p>}

        {jobs && (
            <>
              <section className="emp-stat-grid">
                <article className="emp-stat-card emp-stat-card--split">
                  <div>
                    <p className="emp-stat-card__label">Tổng tin đăng</p>
                    <p className="emp-stat-card__value">{stats.total}</p>
                    <p className="emp-stat-card__sub emp-stat-card__sub--muted">
                      {stats.draft > 0 ? `${stats.draft} bản nháp đang lưu` : "Tất cả tin của công ty bạn"}
                    </p>
                  </div>
                  <span className="emp-stat-card__icon"><IconBriefcase size={21} /></span>
                </article>
                <article className="emp-stat-card emp-stat-card--split">
                  <div>
                    <p className="emp-stat-card__label">Đang hiển thị</p>
                    <p className="emp-stat-card__value">{stats.open}</p>
                    <p className="emp-stat-card__sub emp-stat-card__sub--muted">Ứng viên đang thấy các tin này</p>
                  </div>
                  <span className="emp-stat-card__icon emp-stat-card__icon--green"><IconCheck size={21} /></span>
                </article>
                <article className="emp-stat-card emp-stat-card--split">
                  <div>
                    <p className="emp-stat-card__label">Tổng ứng viên</p>
                    <p className="emp-stat-card__value">{stats.applicants}</p>
                    <p className="emp-stat-card__sub">↗ +{stats.newApps} mới trong 7 ngày</p>
                  </div>
                  <span className="emp-stat-card__icon emp-stat-card__icon--purple"><IconUsers size={21} /></span>
                </article>
                <article className="emp-stat-card emp-stat-card--split">
                  <div>
                    <p className="emp-stat-card__label">Đơn mới (7 ngày)</p>
                    <p className="emp-stat-card__value">{stats.newApps}</p>
                    <p className="emp-stat-card__sub emp-stat-card__sub--muted">Đơn vừa nhận gần đây</p>
                  </div>
                  <span className="emp-stat-card__icon emp-stat-card__icon--amber"><IconChart size={21} /></span>
                </article>
              </section>

              <div className="emp-card-table">
                <div className="emp-card-table__toolbar" style={{ justifyContent: "space-between" }}>
                  <div className="emp-tabs">
                    {TABS.map((t) => {
                      const count = t.statuses
                          ? jobs.filter((j) => t.statuses.includes(j.status)).length
                          : jobs.length;
                      return (
                          <button key={t.key} type="button"
                                  className={tab === t.key ? "is-active" : ""}
                                  onClick={() => { setTab(t.key); setPage(1); }}>
                            {t.label} ({count})
                          </button>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className="emp-searchbox">
                  <IconSearch size={16} />
                  <input
                      className="emp-input"
                      placeholder="Tìm theo tiêu đề, ID..."
                      value={keyword}
                      onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                      aria-label="Tìm tin tuyển dụng"
                  />
                </span>
                    <div className="emp-menu-wrap">
                      <button type="button" className="emp-icon-btn emp-icon-btn--border"
                              aria-label="Sắp xếp danh sách" title="Sắp xếp danh sách"
                              onClick={() => setSortOpen(!sortOpen)}>
                        <IconFilter size={17} />
                      </button>
                      {sortOpen && (
                          <div className="emp-menu">
                            {SORTS.map((s) => (
                                <button key={s.key} type="button"
                                        className={sort === s.key ? "is-active" : ""}
                                        onClick={() => { setSort(s.key); setSortOpen(false); setPage(1); }}>
                                  {s.label}{sort === s.key ? " ✓" : ""}
                                </button>
                            ))}
                          </div>
                      )}
                    </div>
                  </div>
                </div>

                <table className="emp-table">
                  <thead>
                  <tr><th>Vị trí tuyển dụng</th><th>Ngày đăng</th><th>Ứng tuyển</th><th>Trạng thái</th><th>Thao tác</th></tr>
                  </thead>
                  <tbody>
                  {pageItems.map((job) => (
                      <tr key={job.id}>
                        <td>
                          <div className="emp-table__title">{job.title}</div>
                          <div className="emp-table__sub" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            {job.location && <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><IconPin size={13} /> {job.location}</span>}
                            {job.jobType && <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><IconClock size={13} /> {job.jobType}</span>}
                            <span style={{ color: "#0b5cff", fontWeight: 600 }}>ID: JOB-{job.id}</span>
                          </div>
                        </td>
                        <td>
                          <div>{formatDate(job.createdAt)}</div>
                          <div className="emp-table__sub">Hết hạn: {formatDate(job.expiresAt)}</div>
                        </td>
                        <td>
                      <span className="emp-count-box">
                        <strong>{job.applicants}</strong><span>TỔNG SỐ</span>
                      </span>
                          {job.newApplicants > 0 && <span className="emp-new-pill">+{job.newApplicants} mới</span>}
                        </td>
                        <td>
                      <span className={`emp-badge ${JOB_STATUS_BADGE[job.status] || "emp-badge--gray"}`}>
                        ● {JOB_STATUS_LABELS[job.status] || job.status}
                      </span>
                        </td>
                        <td>
                          <div className="emp-actions">
                            <a href={`/jobs/${job.id}`} target="_blank" rel="noreferrer" className="emp-icon-btn" aria-label={`Xem tin ${job.title}`}>
                              <IconEye size={18} />
                            </a>
                            <Link to={`/employer/jobs/${job.id}/edit`} className="emp-icon-btn" aria-label={`Sửa ${job.title}`}>
                              <IconEdit size={18} />
                            </Link>
                            <div className="emp-menu-wrap">
                              <button type="button" className="emp-icon-btn" aria-label="Thêm thao tác"
                                      onClick={() => setMenuId(menuId === job.id ? null : job.id)}>
                                <IconDots size={18} />
                              </button>
                              {menuId === job.id && (
                                  <div className="emp-menu">
                                    {(job.status === "open" || job.status === "closed" || job.status === "draft") && (
                                        <button type="button" onClick={() => toggleStatus(job)} disabled={busy}>
                                          {job.status === "open" ? "Đóng tin" : "Đăng lại tin"}
                                        </button>
                                    )}
                                    <button type="button" className="is-danger" onClick={() => { setDeleting(job); setMenuId(null); }}>
                                      <IconTrash size={16} /> Xóa tin
                                    </button>
                                  </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                  ))}
                  {pageItems.length === 0 && (
                      <tr><td colSpan={5} className="emp-table__muted">
                        Không có tin tuyển dụng nào khớp bộ lọc. Bấm "Đăng tin mới" để tạo tin đầu tiên.
                      </td></tr>
                  )}
                  </tbody>
                </table>

                {filtered.length > 0 && (
                    <div className="emp-pagination">
                <span className="emp-muted" style={{ marginRight: "auto", fontSize: 13 }}>
                  Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} trong tổng số {filtered.length} tin tuyển dụng
                </span>
                      <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Trước</button>
                      {pageList(currentPage, pageCount).map((n, i) => (
                          n === "…"
                              ? <span key={`dots-${i}`} className="emp-pagination__dots">…</span>
                              : <button key={n} type="button" className={n === currentPage ? "is-active" : ""} onClick={() => setPage(n)}>{n}</button>
                      ))}
                      <button type="button" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>Tiếp theo</button>
                    </div>
                )}
              </div>

              <div className="emp-tips">
                <div className="emp-tip">
                  <span className="emp-stat-card__icon"><IconInfo size={20} /></span>
                  <div>
                    <strong>Mẹo tuyển dụng</strong>
                    <p>Bạn nên cập nhật trạng thái tin thường xuyên để ưu tiên hiển thị trên trang chủ của JobLink.</p>
                  </div>
                </div>
                <div className="emp-tip">
                  <span className="emp-stat-card__icon emp-stat-card__icon--amber"><IconUsers size={20} /></span>
                  <div>
                    <strong>Tìm kiếm ứng viên</strong>
                    <p>Sử dụng công cụ lọc nâng cao để tìm hồ sơ phù hợp từ kho dữ liệu ứng viên.{" "}
                      <Link to="/employer/candidates" className="emp-link">Mở tìm kiếm →</Link>
                    </p>
                  </div>
                </div>
                <div className="emp-tip">
                  <span className="emp-stat-card__icon emp-stat-card__icon--green"><IconPlus size={20} /></span>
                  <div>
                    <strong>Dịch vụ bổ sung</strong>
                    <p>Đẩy tin đăng lên đầu danh sách hoặc nâng cấp gói để tiếp cận nhiều ứng viên hơn.{" "}
                      <Link to="/employer/plan" className="emp-link">Xem gói dịch vụ →</Link>
                    </p>
                  </div>
                </div>
              </div>
            </>
        )}

        {(menuId !== null || sortOpen) && (
            <div
                style={{ position: "fixed", inset: 0, zIndex: 35 }}
                onClick={() => { setMenuId(null); setSortOpen(false); }}
                aria-hidden="true"
            />
        )}

        {deleting && (
            <EmployerModal title="Xóa tin tuyển dụng?" onClose={() => setDeleting(null)}>
              <p style={{ margin: "0 0 20px", lineHeight: 1.6 }}>
                Tin <strong>{deleting.title}</strong> sẽ bị xóa khỏi hệ thống.
                {deleting.applicants > 0
                    ? " Tin đã có đơn ứng tuyển nên backend sẽ từ chối xóa — hãy đóng tin thay thế."
                    : " Thao tác không thể hoàn tác."}
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="emp-btn" onClick={() => setDeleting(null)} disabled={busy}>Hủy</button>
                <button type="button" className="emp-btn emp-btn--danger" onClick={handleDelete} disabled={busy}>
                  {busy ? "Đang xóa..." : "Xóa tin"}
                </button>
              </div>
            </EmployerModal>
        )}
      </>
  );
}