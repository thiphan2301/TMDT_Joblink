import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { getAssistantProfile } from "../../services/candidateService.js";
import { getConversations } from "../../services/chatService.js";
import { getCurrentUser, logout } from "../../services/authService.js";
import { initialsOf } from "../employer/employerFormat.js";
import {
  IconDashboard, IconUser, IconFile, IconBriefcase, IconBookmark,
  IconSend, IconChat, IconBot, IconWallet, IconSettings, IconLogout,
  IconSearch,
} from "../employer/EmployerIcons.jsx";
import logo from "../../assets/logo.png";
import "../../style/Candidate.css";

// Khung khu vực ứng viên theo thiết kế mới nhất: thanh trên cùng
// riêng của khu vực (logo ViecLamViet, mục điều hướng, ô tìm kiếm
// việc làm, tin nhắn + người dùng) và thanh bên trái cố định
// (avatar + tên, thẻ độ hoàn thiện hồ sơ, menu có huy hiệu số CV
// và tin nhắn chưa đọc — đều là số thật). Header cũ của trang
// công khai được App.jsx ẩn ở các route thuộc khu vực này.
// Tên/ảnh ưu tiên lấy từ hồ sơ ứng viên, thiếu thì lấy từ tài
// khoản đăng nhập (getCurrentUser) nên luôn hiện đúng người dùng.
const MENU = [
  { to: "/dashboard", label: "Tổng quan", icon: IconDashboard },
  { to: "/profile", label: "Hồ sơ của tôi", icon: IconUser },
  { to: "/cv", label: "CV của tôi", icon: IconFile, badge: "cv" },
  { to: "/viec-lam-phu-hop", label: "Việc làm phù hợp", icon: IconBriefcase },
  { to: "/viec-lam-da-luu", label: "Việc làm đã lưu", icon: IconBookmark },
  { to: "/viec-lam-da-ung-tuyen", label: "Việc làm đã ứng tuyển", icon: IconSend },
  { to: "/tin-nhan", label: "Tin nhắn", icon: IconChat, badge: "unread" },
  { to: "/tro-ly-ai", label: "Trợ lý việc làm AI", icon: IconBot },
  { to: "/vi-token", label: "Ví token", icon: IconWallet },
];

export default function CandidateLayout() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);
  const [unread, setUnread] = useState(0);
  const [topKeyword, setTopKeyword] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await getCurrentUser();
        if (!cancelled) setMe(user);
      } catch {
        if (!cancelled) setMe(null);
      }
      try {
        const data = await getAssistantProfile();
        if (!cancelled) setProfile(data);
      } catch {
        if (!cancelled) setProfile(null);
      }
      try {
        const list = await getConversations();
        if (!cancelled) {
          setUnread((list || []).reduce((sum, c) => sum + (c.unread || 0), 0));
        }
      } catch {
        if (!cancelled) setUnread(0);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Vẫn rời khỏi khu vực kể cả khi không gọi được backend.
    }
    navigate("/login", { replace: true });
  }

  function submitSearch(e) {
    e.preventDefault();
    const kw = topKeyword.trim();
    navigate(kw ? `/jobs?q=${encodeURIComponent(kw)}` : "/jobs");
  }

  const displayName = profile?.fullName || me?.fullName || me?.email || "Ứng viên";
  const avatar = profile?.avatar || me?.avatar || null;

  const badgeValue = (kind) => {
    if (kind === "cv") return profile?.cvCount || 0;
    if (kind === "unread") return unread;
    return 0;
  };

  return (
      <div className="cand-shell">
        <header className="cand-top">
          <Link to="/discover" className="cand-top__brand">
            <img src={logo} alt="" />
            <span>ViecLamViet</span>
          </Link>
          <nav className="cand-top__nav">
            <Link to="/jobs">Việc làm</Link>
            <Link to="/discover">Công ty</Link>
            <Link to="/tro-ly-ai">Cẩm nang nghề nghiệp</Link>
          </nav>
          <form className="cand-top__search" onSubmit={submitSearch}>
            <IconSearch size={16} />
            <input
                value={topKeyword}
                onChange={(e) => setTopKeyword(e.target.value)}
                placeholder="Tìm kiếm..."
            />
          </form>
          <div className="cand-top__right">
            <Link to="/tin-nhan" className="cand-top__icon" aria-label="Tin nhắn">
              <IconChat size={20} />
              {unread > 0 && <span className="cand-top__badge">{unread}</span>}
            </Link>
            <div className="cand-top__user">
              {avatar
                  ? <img src={avatar} alt="" />
                  : <span className="cand-top__initials">{initialsOf(displayName)}</span>}
              <div>
                <strong>{displayName}</strong>
                <span>Ứng viên</span>
              </div>
              <span className="cand-top__online" title="Đang trực tuyến" />
            </div>
          </div>
        </header>

        <div className="cand-layout">
          <aside className="cand-side">
            <div className="cand-side__profile">
              {avatar
                  ? <img src={avatar} alt="" className="cand-side__avatar" />
                  : (
                      <span className="cand-side__avatar cand-side__avatar--text">
                  {initialsOf(displayName)}
                </span>
                  )}
              <strong>{displayName}</strong>
              <span className="cand-side__role">Ứng viên</span>
            </div>

            {profile && (
                <div className="cand-side__progress">
                  <div className="cand-side__progress-top">
                    <span>Độ hoàn thiện hồ sơ</span>
                    <strong>{profile.completeness}%</strong>
                  </div>
                  <div className="cand-side__bar">
                    <span style={{ width: `${profile.completeness}%` }} />
                  </div>
                  <p>
                    {profile.completeness > 0
                        ? "Cập nhật thông tin giúp bạn tăng cơ hội tìm việc lên 300%"
                        : "Hãy tạo hồ sơ ở mục Hồ sơ của tôi để bắt đầu hoàn thiện."}
                  </p>
                </div>
            )}

            <nav className="cand-side__nav">
              {MENU.map((item) => {
                const Icon = item.icon;
                const badge = item.badge ? badgeValue(item.badge) : 0;
                return (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `cand-side__item${isActive ? " is-active" : ""}`}
                    >
                      <Icon size={19} />
                      <span>{item.label}</span>
                      {badge > 0 && <span className="cand-side__badge">{badge}</span>}
                    </NavLink>
                );
              })}
            </nav>

            <div className="cand-side__bottom">
              <NavLink
                  to="/cai-dat"
                  className={({ isActive }) =>
                      `cand-side__item${isActive ? " is-active" : ""}`}
              >
                <IconSettings size={19} />
                <span>Cài đặt</span>
              </NavLink>
              <button
                  type="button"
                  className="cand-side__item cand-side__item--btn"
                  onClick={handleLogout}
              >
                <IconLogout size={19} />
                <span>Đăng xuất</span>
              </button>
            </div>
          </aside>

          <div className="cand-main">
            <Outlet />
          </div>
        </div>
      </div>
  );
}