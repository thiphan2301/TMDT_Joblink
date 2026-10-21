import { useEffect, useState } from "react";
import { Link } from "react-router";
import { CompanyLogo, formatSalary } from "../../components/JobCard.jsx";
import useSavedJobs from "../../hooks/useSavedJobs.js";
import {
  getCandidateOverview, getAssistantProfile,
} from "../../services/candidateService.js";
import { getJobs } from "../../services/jobService.js";
import {
  APPLICATION_STATUS_LABELS, formatDate, formatDateTime,
} from "../../components/employer/employerFormat.js";
import {
  IconEye, IconBriefcase, IconSend, IconBookmark, IconCheck,
  IconClock, IconPin, IconChevronRight, IconFile,
} from "../../components/employer/EmployerIcons.jsx";
import "../../style/Public.css";

// Trang Tổng quan ứng viên theo thiết kế mới. Mọi con số lấy
// thật: lượt xem hồ sơ / đơn đã nộp / được mời phỏng vấn / đơn
// gần đây / lịch sắp tới từ /api/candidate/overview, độ hoàn
// thiện + kỹ năng + CV từ hồ sơ, việc đã lưu từ danh sách lưu
// trên trình duyệt. Thiết kế có các số tăng trưởng (+12%…) và
// "Thứ hạng hồ sơ Top 15%" nhưng hệ thống không có dữ kiện lịch
// sử/xếp hạng nên không hiển thị hai mục đó.
function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export default function CandidateDashboard() {
  const { savedIds } = useSavedJobs();
  const [overview, setOverview] = useState(null);
  const [profile, setProfile] = useState(null);
  const [matched, setMatched] = useState([]);
  const [error, setError] = useState("");
  const [whyOpen, setWhyOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ov, pf] = await Promise.all([
          getCandidateOverview(),
          getAssistantProfile().catch(() => null),
        ]);
        if (cancelled) return;
        setOverview(ov);
        setProfile(pf);
        const jobs = await getJobs().catch(() => []);
        if (cancelled) return;
        const topSkill = pf?.skills?.length
          ? normalize(pf.skills[0].name)
          : "";
        const scored = (jobs || [])
          .map((j) => {
            const text = normalize(`${j.title} ${j.skills || ""}`);
            const hit = topSkill && text.includes(topSkill) ? 1 : 0;
            return { j, hit };
          })
          .sort((a, b) => b.hit - a.hit ||
            Number(b.j.prioritized) - Number(a.j.prioritized) ||
            String(b.j.createdAt || "").localeCompare(String(a.j.createdAt || "")));
        setMatched(scored.slice(0, 3).map((x) => x.j));
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const completeness = profile?.completeness ?? 0;
  const RING_C = 2 * Math.PI * 34;

  const checks = profile ? [
    {
      done: Boolean(profile.fullName && profile.phone),
      title: "Thông tin cơ bản",
      desc: profile.fullName
        ? "Đã có họ tên, số điện thoại và email liên hệ"
        : "Hãy bổ sung họ tên và số điện thoại trong hồ sơ",
    },
    {
      done: (profile.skills?.length || 0) > 0,
      title: "Kỹ năng chuyên môn",
      desc: profile.skills?.length
        ? `Đã khai báo ${profile.skills.length} kỹ năng`
        : "Chưa khai báo kỹ năng nào",
    },
    {
      done: (profile.cvCount || 0) > 0,
      title: "CV đính kèm",
      desc: profile.cvCount
        ? `Đã có ${profile.cvCount} CV trong hệ thống`
        : "Chưa tải CV nào lên",
    },
    {
      done: Boolean(profile.summary),
      title: "Giới thiệu bản thân",
      desc: profile.summary
        ? "Đã có phần giới thiệu để nhà tuyển dụng nắm bắt nhanh"
        : "Thêm vài dòng giới thiệu để hồ sơ nổi bật hơn",
    },
  ] : [];

  const stats = overview ? [
    {
      icon: IconEye, bg: "#eaf1fe", color: "#0b5cff",
      label: "Lượt xem hồ sơ", value: overview.profileViews,
    },
    {
      icon: IconBriefcase, bg: "#e9f9f0", color: "#067647",
      label: "Việc làm đã ứng tuyển", value: overview.appliedCount,
    },
    {
      icon: IconSend, bg: "#fef6e0", color: "#b54708",
      label: "Việc làm được mời", value: overview.invitedCount,
    },
    {
      icon: IconBookmark, bg: "#f1eafd", color: "#6941c6",
      label: "Việc làm đã lưu", value: savedIds.length,
    },
  ] : [];

  return (
    <div>
      <div className="dash-greet">
        <div>
          <h1>
            Xin chào{profile?.fullName ? `, ${profile.fullName}` : ""} 👋
          </h1>
          <p>Chúc bạn một ngày làm việc hiệu quả và sớm tìm được công việc ưng ý.</p>
        </div>
        <Link className="dash-cv-btn" to="/profile">
          <IconFile size={16} /> Cập nhật hồ sơ ngay
        </Link>
      </div>

      <section className="dash-banner">
        <div>
          <h2>
            {completeness >= 100
              ? "Hồ sơ đã hoàn thiện 100%!"
              : completeness > 0
                ? `Sắp hoàn thiện rồi! Chỉ còn ${100 - completeness}% nữa thôi.`
                : "Hãy bắt đầu hoàn thiện hồ sơ của bạn."}
          </h2>
          <p>
            Hồ sơ hoàn thiện 100% giúp bạn tăng khả năng được nhà
            tuyển dụng chú ý và mời phỏng vấn trực tiếp.
          </p>
          <div className="dash-banner__actions">
            <Link className="main" to="/profile">Hoàn thiện ngay</Link>
            <button
              type="button"
              className="link"
              onClick={() => setWhyOpen((v) => !v)}
            >
              Tại sao cần hoàn thiện? <IconChevronRight size={14} />
            </button>
          </div>
          {whyOpen && (
            <p style={{ marginTop: 12 }}>
              Nhà tuyển dụng chỉ liên hệ được khi hồ sơ có đủ thông
              tin liên hệ, kỹ năng và CV — trợ lý AI và mục Tìm kiếm
              ứng viên của nhà tuyển dụng cũng dựa trên các thông tin
              này để giới thiệu bạn.
            </p>
          )}
        </div>
        <div className="dash-ring">
          <svg width="84" height="84" viewBox="0 0 84 84">
            <circle cx="42" cy="42" r="34" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="8" />
            <circle
              cx="42" cy="42" r="34" fill="none" stroke="#fff" strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - completeness / 100)}
            />
            <text
              x="42" y="47" textAnchor="middle" fill="#fff"
              fontSize="17" fontWeight="800"
              transform="rotate(90 42 42)"
            >
              {completeness}%
            </text>
          </svg>
          <small>PROFILE STATUS</small>
        </div>
      </section>

      {error && <p role="alert" style={{ marginTop: 14 }}>{error}</p>}

      <section className="dash-stats">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="dash-stat">
              <span className="dash-stat__ic" style={{ background: s.bg, color: s.color }}>
                <Icon size={19} />
              </span>
              <span>{s.label}</span>
              <strong>{Number(s.value).toLocaleString("vi-VN")}</strong>
            </div>
          );
        })}
      </section>

      <div className="dash-grid">
        <div>
          <section className="dash-card">
            <div className="dash-card__head">
              <div>
                <h3>Đơn ứng tuyển gần đây</h3>
                <p>Theo dõi trạng thái các công việc bạn đã nộp đơn</p>
              </div>
              <Link to="/viec-lam-da-ung-tuyen">Xem tất cả</Link>
            </div>
            {overview && overview.recentApplications.length === 0 && (
              <p className="pub-muted" style={{ fontSize: 13.5 }}>
                Bạn chưa ứng tuyển công việc nào. Hãy khám phá các cơ
                hội đang mở ở mục Việc làm phù hợp.
              </p>
            )}
            {overview && overview.recentApplications.length > 0 && (
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Công ty</th><th>Vị trí</th><th>Ngày nộp</th><th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.recentApplications.map((a) => (
                    <tr key={`${a.jobId}-${a.appliedAt}`}>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
                          <CompanyLogo name={a.companyName} src={a.companyLogo} />
                          {a.companyName}
                        </span>
                      </td>
                      <td>
                        <Link to={`/jobs/${a.jobId}`}>{a.jobTitle}</Link>
                      </td>
                      <td>{formatDate(a.appliedAt)}</td>
                      <td>
                        <span className={`emp-chip emp-chip--${a.status}`}>
                          {APPLICATION_STATUS_LABELS[a.status] || a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <div className="dash-card__head" style={{ padding: "0 2px" }}>
              <div>
                <h3 style={{ margin: "0 0 3px", fontSize: 16 }}>Việc làm phù hợp với bạn</h3>
                <p style={{ margin: 0, color: "#8496ad", fontSize: 12.5 }}>
                  Dựa trên kỹ năng trong hồ sơ của bạn
                </p>
              </div>
              <Link to="/jobs" style={{ color: "#0b5cff", textDecoration: "none", fontSize: 13, fontWeight: 650 }}>
                Khám phá thêm
              </Link>
            </div>
            <div className="dash-jobs">
              {matched.map((job) => (
                <article key={job.id} className="home-job" style={{ flexDirection: "column" }}>
                  <CompanyLogo name={job.companyName} src={job.companyLogo} />
                  <div className="home-job__body">
                    <Link className="home-job__title" to={`/jobs/${job.id}`}>
                      {job.title}
                    </Link>
                    <div className="home-job__company">{job.companyName}</div>
                    <div className="home-job__meta">
                      <span className="home-job__salary">{formatSalary(job)}</span>
                      <span className="home-job__loc">
                        <IconPin size={14} /> {job.location || "Chưa cập nhật"}
                      </span>
                    </div>
                    <div className="home-job__tags">
                      {(job.skills || "").split(",").map((s) => s.trim())
                        .filter(Boolean).slice(0, 3)
                        .map((t) => <span key={t}>{t}</span>)}
                    </div>
                    <Link
                      to={`/jobs/${job.id}`}
                      style={{ color: "#0b5cff", fontSize: 13, fontWeight: 650, textDecoration: "none", display: "inline-block", marginTop: 10 }}
                    >
                      Xem chi tiết
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div>
          <section className="dash-card">
            <div className="dash-card__head">
              <div><h3>Hồ sơ của bạn</h3></div>
            </div>
            {checks.map((c) => (
              <div key={c.title} className="dash-check">
                <span
                  className="dash-check__ic"
                  style={{
                    background: c.done ? "#e9f9f0" : "#fef6e0",
                    color: c.done ? "#067647" : "#b54708",
                  }}
                >
                  {c.done ? <IconCheck size={15} /> : <IconClock size={15} />}
                </span>
                <div>
                  <strong>{c.title}</strong>
                  <span>{c.desc}</span>
                </div>
              </div>
            ))}
            <Link
              to="/tro-ly-ai"
              style={{
                display: "block", textAlign: "center", border: "1px solid #0b5cff",
                color: "#0b5cff", textDecoration: "none", fontWeight: 650,
                fontSize: 13.5, padding: "10px", borderRadius: 9, marginTop: 13,
              }}
            >
              Xem phân tích chi tiết
            </Link>
          </section>

          <section className="dash-card dash-schedule">
            <div className="dash-card__head">
              <div><h3>Lịch sắp tới</h3></div>
            </div>
            {overview && overview.upcomingInterviews.length === 0 && (
              <p className="pub-muted" style={{ fontSize: 13.5 }}>
                Chưa có lịch phỏng vấn nào sắp tới.
              </p>
            )}
            {overview?.upcomingInterviews.map((iv, i) => {
              const d = new Date(iv.scheduledAt);
              return (
                <div key={i} className="item">
                  <span className="dash-date">
                    <strong>{d.getDate()}</strong>
                    <span>TH{d.getMonth() + 1}</span>
                  </span>
                  <div>
                    <strong className="t">{iv.notes || `Phỏng vấn: ${iv.jobTitle}`}</strong>
                    <span className="s">
                      {iv.companyName} • {formatDateTime(iv.scheduledAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="dash-coach">
            <h3>AI Career Coach</h3>
            <p>
              Sử dụng trợ lý AI để phân tích CV và gợi ý công việc
              phù hợp với năng lực của bạn.
            </p>
            <Link to="/tro-ly-ai">Trải nghiệm ngay</Link>
          </section>
        </div>
      </div>
    </div>
  );
}
