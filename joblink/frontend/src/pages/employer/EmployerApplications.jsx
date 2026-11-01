import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { EmployerPageHeader } from "../../components/employer/EmployerLayout.jsx";
import { EmployerModal } from "../../components/employer/EmployerModal.jsx";
import {
  IconEye, IconChat, IconUsers, IconCalendar, IconCheck, IconInbox,
  IconDownload, IconFilter, IconSearch, IconStar, IconDots,
} from "../../components/employer/EmployerIcons.jsx";
import {
  APPLICATION_STATUS_LABELS, APPLICATION_STATUS_BADGE,
  initialsOf, formatDateTime, formatDate,
} from "../../components/employer/employerFormat.js";
import useEmployerData from "../../hooks/useEmployerData.js";
import {
  getEmployerJobs, getApplicationsGlobal, getApplicationsSummary,
  getApplicationDetail, setApplicationStatus,
} from "../../services/employerService.js";
import { openConversation } from "../../services/chatService.js";

// Trang "Quản lý ứng viên" theo thiết kế Employer Portal — phần
// "đơn hàng" của yêu cầu 13: 4 thẻ số liệu, thẻ quy trình tuyển
// dụng (bấm vào từng bước để lọc), bảng ứng viên kèm kỹ năng và
// trạng thái, đổi trạng thái nhanh qua menu, xuất báo cáo CSV,
// hai thẻ phụ: ứng viên đang phỏng vấn + đơn chờ xử lý lâu nhất.
// Mọi con số lấy từ API thật; hệ thống không có điểm phù hợp/AI
// nên các vị trí đó trong bản mẫu được thay bằng số liệu thật.
const STATUSES = Object.keys(APPLICATION_STATUS_LABELS);
const PAGE_SIZE = 5;

const FUNNEL_TOP = [
  { key: "pending", label: "Mới ứng tuyển", cls: "emp-funnel__step--blue" },
  { key: "viewed", label: "Đã xem hồ sơ", cls: "" },
  { key: "invited", label: "Phỏng vấn", cls: "emp-funnel__step--purple" },
  { key: "rejected", label: "Đã từ chối", cls: "" },
];

const SORTS = [
  { key: "newest", label: "Mới nộp nhất" },
  { key: "oldest", label: "Cũ nhất" },
  { key: "name", label: "Tên ứng viên A–Z" },
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

function waitingDays(iso) {
  if (!iso) return 0;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

export default function EmployerApplications() {
  const navigate = useNavigate();
  const { data: jobs } = useEmployerData(getEmployerJobs, []);
  const { data: summary, reload: reloadSummary } = useEmployerData(getApplicationsSummary, []);
  const { data: invitedApps, reload: reloadInvited } = useEmployerData(
      () => getApplicationsGlobal({ status: "invited" }), [],
  );
  const { data: pendingApps, reload: reloadPending } = useEmployerData(
      () => getApplicationsGlobal({ status: "pending" }), [],
  );
  const [jobId, setJobId] = useState("");
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState("newest");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const {
    data: applications, loading, error, reload,
  } = useEmployerData(
      () => getApplicationsGlobal({
        jobId: jobId || undefined,
        status: status || undefined,
        q: keyword.trim() || undefined,
      }),
      [jobId, status, keyword],
  );

  const sortedApps = useMemo(() => {
    const list = [...(applications || [])];
    if (sort === "oldest") list.sort((a, b) => new Date(a.appliedAt) - new Date(b.appliedAt));
    else if (sort === "name") list.sort((a, b) => (a.candidateName || "").localeCompare(b.candidateName || "", "vi"));
    else list.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
    return list;
  }, [applications, sort]);

  const pageCount = Math.max(1, Math.ceil(sortedApps.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = sortedApps.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const pendingOldest = useMemo(
      () => [...(pendingApps || [])]
          .sort((a, b) => new Date(a.appliedAt) - new Date(b.appliedAt))
          .slice(0, 4),
      [pendingApps],
  );

  const responded = summary ? summary.total - summary.pending : 0;
  const respondedRate = summary?.total ? Math.round((responded / summary.total) * 100) : 0;
  const hiredRate = summary?.total ? Math.round((summary.hired / summary.total) * 100) : 0;

  function pickStatus(next) {
    setStatus(next);
    setPage(1);
  }

  // Xuất danh sách đơn đang lọc ra CSV (BOM chống lỗi font Excel).
  function exportCsv() {
    const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const header = ["Ứng viên", "Email", "Vị trí ứng tuyển", "Trạng thái", "Ngày ứng tuyển", "Kỹ năng"];
    const lines = sortedApps.map((a) => [
      a.candidateName, a.candidateEmail, a.jobTitle,
      APPLICATION_STATUS_LABELS[a.status] || a.status,
      formatDate(a.appliedAt), (a.skills || []).join("; "),
    ].map(esc).join(","));
    const blob = new Blob(
        ["\ufeff" + [header.map(esc).join(","), ...lines].join("\n")],
        { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bao-cao-ung-vien.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function changeStatus(app, next) {
    setBusy(true);
    setActionError("");
    try {
      await setApplicationStatus(app.id, next);
      await reload();
      await reloadSummary();
      await reloadInvited();
      await reloadPending();
      setNotice(`Đã chuyển đơn của ${app.candidateName} sang "${APPLICATION_STATUS_LABELS[next]}".`);
    } catch (err) {
      setActionError(err.message || "Không đổi được trạng thái.");
    } finally {
      setBusy(false);
    }
  }

  async function startChat(app) {
    setBusy(true);
    setActionError("");
    try {
      const conversation = await openConversation(app.candidateId, app.jobId);
      navigate(`/employer/chat?c=${conversation.id}`);
    } catch (err) {
      setActionError(err.message || "Không mở được cuộc trò chuyện.");
    } finally {
      setBusy(false);
    }
  }

  return (
      <>
        <EmployerPageHeader
            title="Quản lý ứng viên"
            description="Theo dõi và sàng lọc hồ sơ ứng tuyển của doanh nghiệp."
            action={
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="emp-btn" onClick={exportCsv} disabled={!applications}>
                  <IconDownload size={17} /> Xuất báo cáo
                </button>
                <Link to="/employer/candidates" className="emp-btn emp-btn--primary">
                  <IconUsers size={18} /> Tìm kiếm ứng viên mới
                </Link>
              </div>
            }
        />
        {actionError && <p className="emp-error">{actionError}</p>}
        {notice && <p className="emp-success">{notice}</p>}

        {summary && (
            <>
              <section className="emp-stat-grid">
                <article className="emp-stat-card">
                  <div className="emp-stat-card__top">
                    <span className="emp-stat-card__icon"><IconUsers size={20} /></span>
                    <span className="emp-stat-card__trend emp-stat-card__trend--pill emp-stat-card__trend--muted">
                  {summary.pending} chờ xử lý
                </span>
                  </div>
                  <p className="emp-stat-card__label">Tổng ứng viên</p>
                  <p className="emp-stat-card__value">{summary.total}</p>
                </article>
                <article className="emp-stat-card">
                  <div className="emp-stat-card__top">
                    <span className="emp-stat-card__icon emp-stat-card__icon--purple"><IconCalendar size={20} /></span>
                    <span className="emp-stat-card__trend emp-stat-card__trend--pill">
                  {summary.hired} đã tuyển
                </span>
                  </div>
                  <p className="emp-stat-card__label">Đang phỏng vấn</p>
                  <p className="emp-stat-card__value">{summary.invited}</p>
                </article>
                <article className="emp-stat-card">
                  <div className="emp-stat-card__top">
                    <span className="emp-stat-card__icon emp-stat-card__icon--green"><IconCheck size={20} /></span>
                    <span className="emp-stat-card__trend emp-stat-card__trend--pill emp-stat-card__trend--muted">
                  {hiredRate}% tổng đơn
                </span>
                  </div>
                  <p className="emp-stat-card__label">Đã tuyển</p>
                  <p className="emp-stat-card__value">{summary.hired}</p>
                </article>
                <article className="emp-stat-card">
                  <div className="emp-stat-card__top">
                    <span className="emp-stat-card__icon emp-stat-card__icon--amber"><IconInbox size={20} /></span>
                    <span className="emp-stat-card__trend emp-stat-card__trend--pill">
                  {responded}/{summary.total} đơn
                </span>
                  </div>
                  <p className="emp-stat-card__label">Tỷ lệ đã xử lý</p>
                  <p className="emp-stat-card__value">{respondedRate}%</p>
                </article>
              </section>

              <section className="emp-pipe-card">
                <div className="emp-pipe-intro">
                  <span className="emp-pipe-intro__icon"><IconStar size={22} /></span>
                  <h3>Sàng lọc hồ sơ hiệu quả</h3>
                  <p>
                    Mỗi đơn ứng tuyển đi qua các trạng thái từ lúc nộp đến khi có
                    kết quả. Xử lý sớm các đơn đang chờ giúp doanh nghiệp không
                    bỏ lỡ ứng viên phù hợp.
                  </p>
                  <p style={{ color: "#fff", fontWeight: 600 }}>
                    {summary.pending > 0
                        ? `${summary.pending} đơn đang chờ bạn xét duyệt.`
                        : "Hiện không có đơn nào đang chờ xét duyệt."}
                  </p>
                  <button type="button" className="emp-btn"
                          onClick={() => pickStatus(summary.pending > 0 ? "pending" : "")}>
                    {summary.pending > 0 ? "Xem đơn chờ duyệt" : "Xem tất cả đơn"}
                  </button>
                </div>
                <div className="emp-pipe-main">
                  <div className="emp-panel__head">
                    <h3>Quy trình tuyển dụng</h3>
                    {status && (
                        <button type="button" className="emp-link" style={{ background: "none", border: "none", cursor: "pointer", font: "inherit" }}
                                onClick={() => pickStatus("")}>
                          Bỏ lọc ×
                        </button>
                    )}
                  </div>
                  <div className="emp-funnel">
                    {FUNNEL_TOP.map((step, i) => (
                        <div key={step.key} style={{ display: "contents" }}>
                          {i > 0 && <span className="emp-funnel__arrow">›</span>}
                          <button type="button"
                                  className={`emp-funnel__step ${step.cls}${status === step.key ? " is-active" : ""}`}
                                  onClick={() => pickStatus(status === step.key ? "" : step.key)}
                                  title={`Lọc: ${step.label}`}>
                            <strong>{summary[step.key]}</strong>
                            <span>{step.label}</span>
                          </button>
                        </div>
                    ))}
                  </div>
                  <div className="emp-funnel" style={{ marginTop: 8 }}>
                    <button type="button"
                            className={`emp-funnel__step emp-funnel__step--green${status === "hired" ? " is-active" : ""}`}
                            onClick={() => pickStatus(status === "hired" ? "" : "hired")}
                            title="Lọc: Đã tuyển">
                      <strong>{summary.hired}</strong>
                      <span>Đã tuyển</span>
                    </button>
                  </div>
                  <div className="emp-alert-banner">
                <span className="emp-alert-banner__icon">
                  {summary.pending > 0 ? <IconStar size={19} /> : <IconCheck size={19} />}
                </span>
                    <p>
                      {summary.pending > 0 ? (
                          <>
                            <strong>Ưu tiên xử lý:</strong> Có {summary.pending} đơn đang ở bước
                            "Mới ứng tuyển". Phản hồi sớm giúp giữ chân ứng viên trước khi họ
                            nhận lời nơi khác.
                          </>
                      ) : (
                          <>
                            <strong>Tốt lắm:</strong> Tất cả đơn ứng tuyển đã được xử lý,
                            không còn đơn nào chờ xét duyệt.
                          </>
                      )}
                    </p>
                    {summary.pending > 0 && (
                        <button type="button" className="emp-btn emp-btn--primary" onClick={() => pickStatus("pending")}>
                          Xem ngay
                        </button>
                    )}
                  </div>
                </div>
              </section>
            </>
        )}

        <div className="emp-card-table">
          <div className="emp-card-table__toolbar" style={{ justifyContent: "space-between" }}>
            <div className="emp-tabs">
              <button type="button" className={!status ? "is-active" : ""}
                      onClick={() => pickStatus("")}>
                Tất cả{summary ? ` (${summary.total})` : ""}
              </button>
              {STATUSES.map((s) => (
                  <button key={s} type="button" className={status === s ? "is-active" : ""}
                          onClick={() => pickStatus(s)}>
                    {APPLICATION_STATUS_LABELS[s]}{summary ? ` (${summary[s]})` : ""}
                  </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className="emp-searchbox">
              <IconSearch size={16} />
              <input className="emp-input" style={{ width: 200 }}
                     placeholder="Tìm tên, kỹ năng..."
                     value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                     aria-label="Tìm ứng viên" />
            </span>
              <button type="button" className="emp-btn" onClick={() => setFilterOpen(!filterOpen)}
                      aria-expanded={filterOpen}>
                <IconFilter size={16} /> Bộ lọc
              </button>
            </div>
          </div>

          {filterOpen && (
              <div className="emp-filter-row">
                <select className="emp-input" style={{ width: 250 }} value={jobId}
                        onChange={(e) => { setJobId(e.target.value); setPage(1); }}
                        aria-label="Lọc theo tin tuyển dụng">
                  <option value="">Tất cả tin tuyển dụng</option>
                  {(jobs || []).map((j) => (
                      <option key={j.id} value={j.id}>{j.title} ({j.applicants})</option>
                  ))}
                </select>
                <select className="emp-input" style={{ width: 190 }} value={sort}
                        onChange={(e) => { setSort(e.target.value); setPage(1); }}
                        aria-label="Sắp xếp danh sách">
                  {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
                {(jobId || status) && (
                    <button type="button" className="emp-link" style={{ background: "none", border: "none", cursor: "pointer", font: "inherit" }}
                            onClick={() => { setJobId(""); pickStatus(""); }}>
                      Xóa bộ lọc ×
                    </button>
                )}
              </div>
          )}

          {error && <p className="emp-error" style={{ margin: 16 }}>{error}</p>}
          {loading ? (
              <p className="emp-muted" style={{ padding: 16 }}>Đang tải đơn ứng tuyển...</p>
          ) : (
              <>
                <table className="emp-table">
                  <thead>
                  <tr><th>Ứng viên</th><th>Vị trí</th><th>Trạng thái</th><th>Ngày ứng tuyển</th><th>Kỹ năng chính</th><th>Hành động</th></tr>
                  </thead>
                  <tbody>
                  {pageItems.map((app, idx) => (
                      <tr key={app.id}>
                        <td>
                          <div className="emp-user-cell">
                            {app.candidateAvatar
                                ? <img src={app.candidateAvatar} alt="" className="emp-avatar-img" />
                                : <span className="emp-avatar">{initialsOf(app.candidateName)}</span>}
                            <div>
                              <div className="emp-table__title">{app.candidateName}</div>
                              <div className="emp-table__sub">{app.candidateAddress || app.candidateEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td className="emp-table__muted">{app.jobTitle}</td>
                        <td>
                      <span className={`emp-badge ${APPLICATION_STATUS_BADGE[app.status] || "emp-badge--gray"}`}>
                        {APPLICATION_STATUS_LABELS[app.status] || app.status}
                      </span>
                        </td>
                        <td className="emp-table__muted">{formatDate(app.appliedAt)}</td>
                        <td>
                          <div className="emp-chips">
                            {app.skills.slice(0, 2).map((s) => <span key={s} className="emp-chip emp-chip--gray">{s}</span>)}
                            {app.skillsCount > 2 && <span className="emp-chip emp-chip--gray">+{app.skillsCount - 2}</span>}
                            {app.skillsCount === 0 && <span className="emp-table__muted">—</span>}
                          </div>
                        </td>
                        <td>
                          <div className="emp-actions">
                            <button type="button" className="emp-icon-btn" onClick={() => setDetailId(app.id)} aria-label={`Xem hồ sơ ${app.candidateName}`} disabled={busy}>
                              <IconEye size={18} />
                            </button>
                            <button type="button" className="emp-icon-btn" onClick={() => startChat(app)} aria-label={`Nhắn tin với ${app.candidateName}`} disabled={busy}>
                              <IconChat size={18} />
                            </button>
                            <div className="emp-menu-wrap">
                              <button type="button" className="emp-icon-btn" aria-label="Thêm thao tác"
                                      onClick={() => setMenuId(menuId === app.id ? null : app.id)} disabled={busy}>
                                <IconDots size={18} />
                              </button>
                              {menuId === app.id && (
                                  <div className={`emp-menu${idx === pageItems.length - 1 ? " emp-menu--up" : ""}`}>
                                    {STATUSES.filter((s) => s !== app.status).map((s) => (
                                        <button key={s} type="button"
                                                onClick={() => { setMenuId(null); changeStatus(app, s); }}>
                                          Chuyển: {APPLICATION_STATUS_LABELS[s]}
                                        </button>
                                    ))}
                                  </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                  ))}
                  {pageItems.length === 0 && (
                      <tr><td colSpan={6} className="emp-table__muted">Chưa có đơn ứng tuyển nào khớp bộ lọc.</td></tr>
                  )}
                  </tbody>
                </table>
                {sortedApps.length > 0 && (
                    <div className="emp-pagination">
                <span className="emp-muted" style={{ marginRight: "auto", fontSize: 13 }}>
                  Hiển thị {(currentPage - 1) * PAGE_SIZE + 1} – {Math.min(currentPage * PAGE_SIZE, sortedApps.length)} trên {sortedApps.length} ứng viên
                </span>
                      <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Trước</button>
                      {pageList(currentPage, pageCount).map((n, i) => (
                          n === "…"
                              ? <span key={`dots-${i}`} className="emp-pagination__dots">…</span>
                              : <button key={n} type="button" className={n === currentPage ? "is-active" : ""} onClick={() => setPage(n)}>{n}</button>
                      ))}
                      <button type="button" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>Tiếp</button>
                    </div>
                )}
              </>
          )}
        </div>

        <div className="emp-bottom-grid">
          <section className="emp-panel" style={{ marginBottom: 0 }}>
            <div className="emp-panel__head">
              <div>
                <h3>Ứng viên đang phỏng vấn</h3>
                <p>Các ứng viên đã được mời vào vòng phỏng vấn</p>
              </div>
              <button type="button" className="emp-link" style={{ background: "none", border: "none", cursor: "pointer", font: "inherit" }}
                      onClick={() => pickStatus("invited")}>
                Xem tất cả
              </button>
            </div>
            {(invitedApps || []).length === 0 && (
                <p className="emp-muted" style={{ margin: 0 }}>Chưa có ứng viên nào ở vòng phỏng vấn.</p>
            )}
            {(invitedApps || []).slice(0, 4).map((app) => (
                <div className="emp-list-row" key={app.id}>
                  {app.candidateAvatar
                      ? <img src={app.candidateAvatar} alt="" className="emp-avatar-img" />
                      : <span className="emp-avatar">{initialsOf(app.candidateName)}</span>}
                  <div className="emp-list-row__main">
                    <strong>{app.candidateName}</strong>
                    <span>{app.jobTitle} · Nộp {formatDate(app.appliedAt)}</span>
                  </div>
                  <button type="button" className="emp-icon-btn" onClick={() => startChat(app)}
                          aria-label={`Nhắn tin với ${app.candidateName}`} disabled={busy}>
                    <IconChat size={18} />
                  </button>
                </div>
            ))}
          </section>

          <section className="emp-panel" style={{ marginBottom: 0 }}>
            <div className="emp-panel__head">
              <div>
                <h3>Đơn chờ xử lý lâu nhất</h3>
                <p>Ưu tiên xem các đơn đã chờ lâu</p>
              </div>
              <button type="button" className="emp-link" style={{ background: "none", border: "none", cursor: "pointer", font: "inherit" }}
                      onClick={() => pickStatus("pending")}>
                Xem tất cả
              </button>
            </div>
            {pendingOldest.length === 0 && (
                <p className="emp-muted" style={{ margin: 0 }}>Không có đơn nào đang chờ xử lý.</p>
            )}
            {pendingOldest.map((app) => (
                <div className="emp-list-row" key={app.id}>
                  {app.candidateAvatar
                      ? <img src={app.candidateAvatar} alt="" className="emp-avatar-img" />
                      : <span className="emp-avatar">{initialsOf(app.candidateName)}</span>}
                  <div className="emp-list-row__main">
                    <strong>{app.candidateName}</strong>
                    <span>{app.jobTitle}</span>
                  </div>
                  <span className="emp-wait-pill">
                {waitingDays(app.appliedAt) === 0 ? "Mới hôm nay" : `Đã chờ ${waitingDays(app.appliedAt)} ngày`}
              </span>
                  <button type="button" className="emp-icon-btn" onClick={() => setDetailId(app.id)}
                          aria-label={`Xem hồ sơ ${app.candidateName}`} disabled={busy}>
                    <IconEye size={18} />
                  </button>
                </div>
            ))}
          </section>
        </div>

        {menuId !== null && (
            <div
                style={{ position: "fixed", inset: 0, zIndex: 35 }}
                onClick={() => setMenuId(null)}
                aria-hidden="true"
            />
        )}

        {detailId && (
            <ApplicationDetailModal
                applicationId={detailId}
                onClose={() => setDetailId(null)}
                onChat={(app) => {
                  setDetailId(null);
                  startChat(app);
                }}
            />
        )}
      </>
  );
}

// Chi tiết một đơn: thông tin ứng viên, thư giới thiệu, CV đính kèm.
function ApplicationDetailModal({ applicationId, onClose, onChat }) {
  const { data: detail, loading, error } = useEmployerData(
      () => getApplicationDetail(applicationId), [applicationId],
  );

  return (
      <EmployerModal title="Chi tiết đơn ứng tuyển" onClose={onClose} wide>
        {loading && <p className="emp-muted">Đang tải...</p>}
        {error && <p className="emp-error">{error}</p>}
        {detail && (
            <div>
              <div className="emp-user-cell" style={{ marginBottom: 14 }}>
                {detail.candidateAvatar
                    ? <img src={detail.candidateAvatar} alt="" className="emp-avatar-img" />
                    : <span className="emp-avatar">{initialsOf(detail.candidateName)}</span>}
                <div>
                  <div className="emp-table__title" style={{ fontSize: 17 }}>{detail.candidateName}</div>
                  <div className="emp-table__sub">
                    {detail.candidateEmail}
                    {detail.candidatePhone && <> · {detail.candidatePhone}</>}
                  </div>
                </div>
                <span className={`emp-badge ${APPLICATION_STATUS_BADGE[detail.status] || "emp-badge--gray"}`} style={{ marginLeft: "auto" }}>
              {APPLICATION_STATUS_LABELS[detail.status] || detail.status}
            </span>
              </div>

              <dl className="emp-detail-list">
                <div><dt>Vị trí ứng tuyển</dt><dd>{detail.jobTitle} — {detail.companyName}</dd></div>
                <div><dt>Ngày nộp</dt><dd>{formatDateTime(detail.appliedAt)}</dd></div>
                {detail.candidateAddress && (
                    <div><dt>Địa chỉ</dt><dd>{detail.candidateAddress}</dd></div>
                )}
                {detail.candidateSummary && (
                    <div><dt>Giới thiệu</dt><dd>{detail.candidateSummary}</dd></div>
                )}
                <div>
                  <dt>CV đính kèm</dt>
                  <dd>
                    {detail.cvFileUrl
                        ? <a href={detail.cvFileUrl} target="_blank" rel="noreferrer" className="emp-link">{detail.cvFileName || "Mở CV"}</a>
                        : (detail.cvFileName || "Không có")}
                  </dd>
                </div>
                {detail.coverLetter && (
                    <div><dt>Thư giới thiệu</dt><dd style={{ whiteSpace: "pre-wrap" }}>{detail.coverLetter}</dd></div>
                )}
              </dl>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
                <button type="button" className="emp-btn" onClick={onClose}>Đóng</button>
                {/* Hồ sơ đầy đủ: kỹ năng, mọi CV, các đơn đã nộp vào tin của mình. */}
                <Link to={`/employer/candidates/${detail.candidateId}`} className="emp-btn">
                  <IconUsers size={17} /> Xem hồ sơ đầy đủ
                </Link>
                <button type="button" className="emp-btn emp-btn--primary"
                        onClick={() => onChat({ candidateId: detail.candidateId, candidateName: detail.candidateName, jobId: detail.jobId })}>
                  <IconChat size={17} /> Nhắn tin với ứng viên
                </button>
              </div>
            </div>
        )}
      </EmployerModal>
  );
}