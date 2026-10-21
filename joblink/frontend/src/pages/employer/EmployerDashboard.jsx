import { useState } from "react";
import { Link } from "react-router";
import {
  IconBriefcase, IconInbox, IconUsers, IconCalendar, IconPlus,
  IconChat, IconCrown, IconBuilding,
} from "../../components/employer/EmployerIcons.jsx";
import {
  PLAN_LABELS, APPLICATION_STATUS_LABELS, APPLICATION_STATUS_BADGE,
  initialsOf, formatDate, greetingText,
} from "../../components/employer/employerFormat.js";
import useEmployerData from "../../hooks/useEmployerData.js";
import { getEmployerDashboard } from "../../services/employerService.js";

// Trang "Tổng quan" của nhà tuyển dụng theo thiết kế Employer Portal:
// lời chào + 4 thẻ số liệu + biểu đồ đơn ứng tuyển theo ngày + ứng
// viên mới nhất; cột phải: hoàn thiện hồ sơ, tin đang hoạt động, tin
// nhắn mới, gói hiện tại. Mọi con số lấy từ API thật (database).
// Biểu đồ chọn được khoảng ngày: nút nhanh 7/30 ngày hoặc tự nhập
// Từ ngày — Đến ngày rồi bấm Áp dụng (backend lọc theo khoảng đó).
function isoOf(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function daysAgoIso(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoOf(d);
}

export default function EmployerDashboard() {
  const [query, setQuery] = useState(() => ({ from: daysAgoIso(6), to: daysAgoIso(0) }));
  const [draft, setDraft] = useState(query);
  const { data, loading, error } = useEmployerData(
    () => getEmployerDashboard(query.from, query.to),
    [query.from, query.to],
  );

  const series = data?.applicationsSeries || [];
  const maxCount = Math.max(1, ...series.map((d) => d.count));
  const labelStep = Math.max(1, Math.ceil(series.length / 12));
  const quickRange = query.from === daysAgoIso(6) ? 7
    : query.from === daysAgoIso(29) ? 30 : null;

  function applyQuick(days) {
    const q = { from: daysAgoIso(days - 1), to: daysAgoIso(0) };
    setDraft(q);
    setQuery(q);
  }

  return (
    <>
      <div className="emp-page-head">
        <div>
          <h1 style={{ fontSize: 25 }}>
            {greetingText()}{data?.companyName ? `, ${data.companyName}` : ""}!
          </h1>
          <p>Đây là những gì đang diễn ra với quy trình tuyển dụng của bạn hôm nay.</p>
        </div>
        <Link to="/employer/jobs/new" className="emp-btn emp-btn--primary">
          <IconPlus size={18} /> Tạo tin tuyển dụng mới
        </Link>
      </div>
      {error && <p className="emp-error">{error}</p>}
      {loading && <p className="emp-muted">Đang tải dữ liệu...</p>}

      {data && (
        <>
          <section className="emp-stat-grid">
            <article className="emp-stat-card">
              <div className="emp-stat-card__top">
                <span className="emp-stat-card__icon"><IconBriefcase size={20} /></span>
                <span className="emp-stat-card__trend emp-stat-card__trend--muted">{data.openJobs} tin đang hiển thị</span>
              </div>
              <p className="emp-stat-card__label">Tổng tin tuyển dụng</p>
              <p className="emp-stat-card__value">{data.totalJobs}</p>
            </article>
            <article className="emp-stat-card">
              <div className="emp-stat-card__top">
                <span className="emp-stat-card__icon emp-stat-card__icon--green"><IconUsers size={20} /></span>
                <span className="emp-stat-card__trend">↗ +{data.newApplications} trong 7 ngày</span>
              </div>
              <p className="emp-stat-card__label">Tổng ứng viên</p>
              <p className="emp-stat-card__value">{data.totalApplications}</p>
            </article>
            <article className="emp-stat-card">
              <div className="emp-stat-card__top">
                <span className="emp-stat-card__icon emp-stat-card__icon--purple"><IconCalendar size={20} /></span>
                <span className="emp-stat-card__trend emp-stat-card__trend--muted">Đã mời phỏng vấn</span>
              </div>
              <p className="emp-stat-card__label">Đang phỏng vấn</p>
              <p className="emp-stat-card__value">{data.invitedApplications}</p>
            </article>
            <article className="emp-stat-card">
              <div className="emp-stat-card__top">
                <span className="emp-stat-card__icon emp-stat-card__icon--amber"><IconInbox size={20} /></span>
                <span className="emp-stat-card__trend emp-stat-card__trend--muted">Cần phản hồi sớm</span>
              </div>
              <p className="emp-stat-card__label">Đơn chờ xử lý</p>
              <p className="emp-stat-card__value">{data.pendingApplications}</p>
            </article>
          </section>

          <div className="emp-dash-grid">
            <div>
              <section className="emp-panel">
                <div className="emp-panel__head">
                  <div>
                    <h3>Phân tích tuyển dụng</h3>
                    <p>Số đơn ứng tuyển nhận được theo ngày</p>
                  </div>
                  <div className="emp-tabs">
                    <button type="button" className={quickRange === 7 ? "is-active" : ""} onClick={() => applyQuick(7)}>7 ngày qua</button>
                    <button type="button" className={quickRange === 30 ? "is-active" : ""} onClick={() => applyQuick(30)}>30 ngày qua</button>
                  </div>
                </div>
                <div className="emp-datebar">
                  <label className="emp-field">
                    <span className="emp-field__label">Từ ngày</span>
                    <input type="date" className="emp-input" style={{ width: "auto" }}
                      value={draft.from} max={draft.to}
                      onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
                  </label>
                  <label className="emp-field">
                    <span className="emp-field__label">Đến ngày</span>
                    <input type="date" className="emp-input" style={{ width: "auto" }}
                      value={draft.to} min={draft.from}
                      onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
                  </label>
                  <button type="button" className="emp-btn emp-btn--primary"
                    disabled={!draft.from || !draft.to || (draft.from === query.from && draft.to === query.to)}
                    onClick={() => setQuery(draft)}>
                    Áp dụng
                  </button>
                  <span className="emp-muted" style={{ fontSize: 13, paddingBottom: 10 }}>
                    Đang xem: {formatDate(query.from)} → {formatDate(query.to)}
                  </span>
                </div>
                <div className="emp-bars">
                  {series.map((d, i) => (
                    <div className="emp-bars__col" key={d.date} title={`${formatDate(d.date)}: ${d.count} đơn`}>
                      <div className="emp-bars__bar" style={{ height: `${Math.max(4, (d.count / maxCount) * 130)}px` }} />
                      <span>{i % labelStep === 0 || i === series.length - 1 ? formatDate(d.date).slice(0, 5) : ""}</span>
                    </div>
                  ))}
                </div>
                {series.length > 0 && series.every((d) => d.count === 0) && (
                  <p className="emp-muted" style={{ margin: "6px 0 0" }}>
                    Chưa có đơn ứng tuyển nào trong khoảng ngày đã chọn.
                  </p>
                )}
              </section>

              <section className="emp-panel">
                <div className="emp-panel__head">
                  <div>
                    <h3>Ứng viên mới nhất</h3>
                    <p>Các đơn ứng tuyển gần đây vào tin của bạn</p>
                  </div>
                  <Link to="/employer/applications" className="emp-link">Xem tất cả →</Link>
                </div>
                {data.recentApplications.length === 0 && (
                  <p className="emp-muted" style={{ margin: 0 }}>Chưa có đơn ứng tuyển nào.</p>
                )}
                {data.recentApplications.length > 0 && (
                  <>
                    <div className="emp-app-row emp-app-row--head">
                      <span>Ứng viên</span><span>Vị trí</span><span>Trạng thái</span><span />
                    </div>
                    {data.recentApplications.map((app) => (
                      <div className="emp-app-row" key={app.id}>
                        <div className="emp-app-row__who">
                          {app.candidateAvatar
                            ? <img src={app.candidateAvatar} alt="" className="emp-avatar-img" />
                            : <span className="emp-avatar">{initialsOf(app.candidateName)}</span>}
                          <div style={{ minWidth: 0 }}>
                            <strong>{app.candidateName}</strong>
                            <span>Ứng tuyển {formatDate(app.appliedAt)}</span>
                          </div>
                        </div>
                        <span className="emp-app-row__job">{app.jobTitle}</span>
                        <span className={`emp-badge ${APPLICATION_STATUS_BADGE[app.status] || "emp-badge--gray"}`}>
                          {APPLICATION_STATUS_LABELS[app.status] || app.status}
                        </span>
                        <Link
                          to={`/employer/chat?c=${app.candidateId}`}
                          className="emp-icon-btn"
                          aria-label={`Nhắn tin với ${app.candidateName}`}
                          title="Nhắn tin"
                        >
                          <IconChat size={17} />
                        </Link>
                      </div>
                    ))}
                  </>
                )}
              </section>
            </div>

            <div>
              <section className="emp-panel" style={{ background: "linear-gradient(140deg,#0b5cff,#062a6b)", color: "#fff", border: "none" }}>
                <h3 style={{ margin: "0 0 6px", fontSize: 16.5 }}>Hoàn thiện hồ sơ công ty</h3>
                <p style={{ margin: "0 0 14px", color: "#cfe0ff", fontSize: 13.5, lineHeight: 1.6 }}>
                  Hồ sơ đầy đủ giúp ứng viên tin tưởng và tăng tỉ lệ ứng tuyển.
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 7 }}>
                  <span>Mức độ hoàn thiện</span>
                  <strong>{data.companyCompleteness}%</strong>
                </div>
                <div className="emp-progress" style={{ background: "rgba(255,255,255,.25)" }}>
                  <div className="emp-progress__fill" style={{ width: `${data.companyCompleteness}%`, background: "#fff" }} />
                </div>
                <Link to="/employer/company" className="emp-btn" style={{ marginTop: 16, width: "100%", justifyContent: "center" }}>
                  <IconBuilding size={17} /> Cập nhật ngay
                </Link>
              </section>

              <section className="emp-panel">
                <div className="emp-panel__head">
                  <h3 style={{ fontSize: 15.5 }}>Tin đang hoạt động</h3>
                  <span className="emp-badge emp-badge--blue">{data.activeJobs.length}</span>
                </div>
                {data.activeJobs.length === 0 && (
                  <p className="emp-muted" style={{ margin: 0 }}>Chưa có tin nào đang hiển thị.</p>
                )}
                {data.activeJobs.map((job) => (
                  <div className="emp-list-row" key={job.id}>
                    <div className="emp-list-row__main">
                      <strong>{job.title}</strong>
                      <span>{job.applicants} ứng viên{job.deadline ? ` · Hết hạn: ${formatDate(job.deadline)}` : ""}</span>
                    </div>
                    {job.newApplicants > 0 && <span className="emp-new-pill">+{job.newApplicants} mới</span>}
                  </div>
                ))}
                <Link to="/employer/jobs" className="emp-btn emp-btn--dashed">
                  + Xem tất cả tin đăng
                </Link>
              </section>

              <section className="emp-panel">
                <div className="emp-list-row" style={{ padding: 0, border: "none" }}>
                  <span className="emp-stat-card__icon emp-stat-card__icon--amber"><IconChat size={20} /></span>
                  <div className="emp-list-row__main">
                    <strong style={{ fontSize: 14.5 }}>
                      {data.unreadMessages > 0
                        ? `Bạn có ${data.unreadMessages} tin nhắn chưa đọc`
                        : "Chưa có tin nhắn mới"}
                    </strong>
                    <span>Ứng viên đang chờ phản hồi từ bạn.</span>
                  </div>
                </div>
                <Link to="/employer/chat" className="emp-link" style={{ display: "inline-block", marginTop: 10 }}>
                  KIỂM TRA TIN NHẮN →
                </Link>
              </section>

              <section className="emp-panel">
                <div className="emp-panel__head">
                  <h3 style={{ fontSize: 15.5 }}><IconCrown size={18} /> Gói hiện tại</h3>
                  <span className={`emp-badge ${data.plan === "premium" ? "emp-badge--blue" : data.plan === "pro" ? "emp-badge--gold" : "emp-badge--gray"}`}>
                    {(PLAN_LABELS[data.plan] || "Basic").toUpperCase()}
                  </span>
                </div>
                <p className="emp-muted" style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
                  Ví Token: <strong style={{ color: "#0f2540" }}>{data.walletBalance ?? 0} Token</strong>
                  {data.planEndsAt
                    ? <> · Gói hiệu lực tới {formatDate(data.planEndsAt)}.</>
                    : <> · Gói miễn phí mặc định.</>}
                </p>
                <Link to="/employer/plan" className="emp-link">Xem gói & nâng cấp →</Link>
              </section>
            </div>
          </div>
        </>
      )}
    </>
  );
}
