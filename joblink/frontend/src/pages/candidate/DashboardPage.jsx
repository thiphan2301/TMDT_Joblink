import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  getAssistantProfile,
  getCandidateOverview,
  getCandidateWallet,
} from "../../services/candidateService";
import useSavedJobs from "../../hooks/useSavedJobs";
import { CompanyLogo } from "../../components/JobCard";
import {
  APPLICATION_STATUS_LABELS,
  formatDate,
  initialsOf,
} from "../../components/employer/employerFormat";
import "../../style/ShellPages.css";

// Trang Tổng quan trong khung gốc, dựng theo ảnh thiết kế gốc của
// nhóm (2026-10-21). Mọi con số đều là dữ liệu thật:
// - Đã ứng tuyển / ứng tuyển gần đây / lịch phỏng vấn: /api/candidate/overview
// - Số dư Token: /api/candidate/wallet
// - Việc làm đã lưu: danh sách lưu trên trình duyệt (useSavedJobs)
// - Độ hoàn thiện hồ sơ: /api/assistant/profile
const STATUS_TONE = {
  pending: "blue",
  viewed: "blue",
  invited: "green",
  rejected: "red",
  hired: "green",
};

export default function DashboardPage() {
  const { savedIds } = useSavedJobs();
  const [overview, setOverview] = useState(null);
  const [profile, setProfile] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [ov, pf, wal] = await Promise.allSettled([
        getCandidateOverview(),
        getAssistantProfile(),
        getCandidateWallet(),
      ]);
      if (cancelled) return;
      if (ov.status === "fulfilled") setOverview(ov.value);
      if (pf.status === "fulfilled") setProfile(pf.value);
      if (wal.status === "fulfilled") setBalance(wal.value.balance);
      if (
        ov.status === "rejected" &&
        pf.status === "rejected" &&
        wal.status === "rejected"
      ) {
        setFailed(true);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const name = profile?.fullName || "bạn";
  const completeness = profile?.completeness ?? 0;
  const recent = overview?.recentApplications || [];

  return (
    <div className="dp-page">
      <div className="dp-head">
        <div>
          <p className="dp-eyebrow">KHÔNG GIAN ỨNG VIÊN</p>
          <h1>Chào mừng trở lại, {name}</h1>
          <p className="dp-sub">Mỗi bước nhỏ hôm nay, một cơ hội lớn ngày mai.</p>
        </div>
        <Link className="dp-btn" to="/jobs">
          Tìm việc làm
        </Link>
      </div>

      {failed && (
        <div className="dp-notice">
          Chưa tải được dữ liệu tổng quan. Hãy đăng nhập bằng tài khoản ứng
          viên và chắc chắn backend đang chạy rồi tải lại trang.
        </div>
      )}

      <div className="dp-stats">
        <div className="dp-stat">
          <span className="dp-stat__label">Đã ứng tuyển</span>
          <strong>{loading ? "…" : (overview?.appliedCount ?? 0)}</strong>
          <span className="dp-stat__sub">Theo dõi tiến trình của bạn</span>
        </div>
        <div className="dp-stat">
          <span className="dp-stat__label">Lịch phỏng vấn</span>
          <strong>{loading ? "…" : (overview?.upcomingInterviews?.length ?? 0)}</strong>
          <span className="dp-stat__sub">Buổi phỏng vấn sắp tới của bạn</span>
        </div>
        <div className="dp-stat">
          <span className="dp-stat__label">Việc làm đã lưu</span>
          <strong>{savedIds.length}</strong>
          <span className="dp-stat__sub">Những cơ hội bạn quan tâm</span>
        </div>
        <div className="dp-stat">
          <span className="dp-stat__label">Số dư Token</span>
          <strong>{loading ? "…" : (balance ?? 0)}</strong>
          <span className="dp-stat__sub">Nâng tầm hồ sơ của bạn</span>
        </div>
      </div>

      <div className="dp-grid">
        <section className="dp-panel">
          <h2>Ứng tuyển gần đây</h2>
          {recent.length === 0 ? (
            <p className="dp-empty">
              {loading
                ? "Đang tải…"
                : "Bạn chưa ứng tuyển việc làm nào. Hãy khám phá các cơ hội đang mở nhé."}
            </p>
          ) : (
            <ul className="dp-apps">
              {recent.map((app) => (
                <li key={`${app.jobId}-${app.appliedAt}`} className="dp-app">
                  <CompanyLogo name={app.companyName} src={app.companyLogo} />
                  <div className="dp-app__main">
                    <Link to={`/jobs/${app.jobId}`}>{app.jobTitle}</Link>
                    <span>
                      {app.companyName} · {formatDate(app.appliedAt)}
                    </span>
                  </div>
                  <span
                    className={`dp-chip dp-chip--${STATUS_TONE[app.status] || "blue"}`}
                  >
                    {APPLICATION_STATUS_LABELS[app.status] || app.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link className="dp-more" to="/applications">
            Xem tất cả ứng tuyển →
          </Link>
        </section>

        <aside className="dp-panel dp-profile">
          {profile?.avatar ? (
            <img className="dp-profile__avatar" src={profile.avatar} alt="" />
          ) : (
            <div className="dp-profile__avatar" aria-hidden="true">
              {initialsOf(profile?.fullName || "?")}
            </div>
          )}
          <h3>{profile?.fullName || "Ứng viên"}</h3>
          <div className="dp-profile__bar-row">
            <span>Độ hoàn thiện hồ sơ</span>
            <strong>{completeness}%</strong>
          </div>
          <div className="dp-profile__bar">
            <div style={{ width: `${completeness}%` }} />
          </div>
          <p className="dp-profile__hint">
            {completeness >= 100
              ? "Hồ sơ của bạn đã hoàn thiện. Chúc bạn sớm tìm được công việc phù hợp."
              : "Thêm thông tin kinh nghiệm để tăng khả năng được nhà tuyển dụng tìm thấy."}
          </p>
          <Link className="dp-btn dp-btn--light" to="/profile">
            {completeness >= 100 ? "Xem hồ sơ" : "Hoàn thiện hồ sơ"} →
          </Link>
        </aside>
      </div>
    </div>
  );
}
