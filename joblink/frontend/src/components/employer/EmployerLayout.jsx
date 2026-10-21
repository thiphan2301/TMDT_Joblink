import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import logo from "../../assets/logo.png";
import { getCurrentUser, logout } from "../../services/authService";
import { getEmployerCompanies } from "../../services/employerService";
import { getConversations } from "../../services/chatService";
import { initialsOf } from "./employerFormat.js";
import {
  IconDashboard, IconBriefcase, IconInbox, IconUsers, IconChat,
  IconBuilding, IconStar, IconCrown, IconWallet, IconLogout, IconSearch,
} from "./EmployerIcons.jsx";
import "../../style/Employer.css";

// Khung của khu vực nhà tuyển dụng (/employer) theo thiết kế
// ViecLamViet Employer Portal: sidebar có mục lục theo nhóm + topbar
// (tìm tin, tin nhắn, công ty) + vùng nội dung render ở <Outlet />.
const NAV_SECTIONS = [
  {
    title: "TỔNG QUAN",
    items: [
      { to: "/employer", label: "Tổng quan", icon: IconDashboard, end: true },
    ],
  },
  {
    title: "QUẢN LÝ TUYỂN DỤNG",
    items: [
      { to: "/employer/jobs", label: "Tin tuyển dụng", icon: IconBriefcase },
      { to: "/employer/applications", label: "Ứng viên", icon: IconInbox },
      { to: "/employer/candidates", label: "Tìm kiếm ứng viên", icon: IconUsers },
    ],
  },
  {
    title: "TƯƠNG TÁC",
    items: [
      { to: "/employer/chat", label: "Tin nhắn", icon: IconChat },
      { to: "/employer/company", label: "Hồ sơ công ty", icon: IconBuilding },
      { to: "/employer/reviews", label: "Đánh giá phản hồi", icon: IconStar },
    ],
  },
  {
    title: "DỊCH VỤ & THANH TOÁN",
    items: [
      { to: "/employer/plan", label: "Gói dịch vụ", icon: IconCrown },
      { to: "/employer/wallet", label: "Ví Token", icon: IconWallet },
    ],
  },
];

// Ảnh logo công ty có dự phòng: URL logo trong DB mà chết (ảnh mẫu
// cũ, link ngoài hỏng) thì tự lùi về logo JobLink / vòng chữ cái đầu,
// không để hiện biểu tượng ảnh vỡ ở sidebar và topbar.
function CompanyLogo({ src, className, initialsName }) {
  // Ghi nhớ URL nào đã nạp lỗi thay vì reset state trong useEffect
  // (rule react-hooks/set-state-in-effect): src đổi thì tự hết lỗi.
  const [failedSrc, setFailedSrc] = useState(null);
  const failed = !src || failedSrc === src;
  if (src && !failed) {
    return <img src={src} alt="" className={className} onError={() => setFailedSrc(src)} />;
  }
  if (initialsName) {
    return <span className="emp-avatar">{initialsOf(initialsName)}</span>;
  }
  return <img src={logo} alt="JobLink" className={className} />;
}

export default function EmployerLayout() {
  const [me, setMe] = useState(null);
  const [company, setCompany] = useState(null);
  const [unread, setUnread] = useState(0);
  const [keyword, setKeyword] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Thông tin công ty (tên + logo ở sidebar/topbar) phải tươi: tải
  // lại khi đổi trang và khi trang Hồ sơ công ty báo đã lưu thay đổi
  // (sự kiện "joblink:company-updated") — nếu không, logo vừa tải lên
  // chỉ hiện ở giữa trang còn sidebar/topbar vẫn giữ ảnh cũ.
  const loadCompany = useCallback(() => {
    getEmployerCompanies()
      .then((list) => { if (list?.length) setCompany(list[0]); })
      .catch(() => {});
  }, []);

  useEffect(() => { loadCompany(); }, [loadCompany, location.pathname]);

  useEffect(() => {
    const handler = () => loadCompany();
    window.addEventListener("joblink:company-updated", handler);
    return () => window.removeEventListener("joblink:company-updated", handler);
  }, [loadCompany]);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((user) => { if (!cancelled) setMe(user); })
      .catch(() => { if (!cancelled) setMe(null); });
    getConversations()
      .then((list) => {
        if (!cancelled) {
          setUnread((list || []).reduce((sum, c) => sum + (c.unread || 0), 0));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Vẫn rời khỏi khu vực kể cả khi không gọi được backend.
    }
    navigate("/login");
  }

  function submitSearch(e) {
    e.preventDefault();
    navigate(`/employer/jobs${keyword.trim() ? `?q=${encodeURIComponent(keyword.trim())}` : ""}`);
  }

  return (
    <div className="emp-shell">
      <aside className="emp-sidebar">
        <div className="emp-brand">
          <CompanyLogo src={company?.logo} className="emp-brand__logo" />
          <div>
            <strong>{company?.name || "JobLink"}</strong>
            <span>Nhà tuyển dụng</span>
          </div>
        </div>

        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="emp-nav__title">{section.title}</p>
            <nav className="emp-nav">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `emp-nav__item${isActive ? " is-active" : ""}`}
                >
                  <item.icon size={19} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}

        <div className="emp-userbox">
          {/* Avatar tài khoản: có ảnh đại diện thì dùng ảnh đó; tài
              khoản chưa có ảnh thì dùng logo công ty thay cho vòng
              chữ cái đầu; logo cũng hỏng/không có mới hiện chữ cái. */}
          <CompanyLogo
            src={me?.avatar || company?.logo}
            className="emp-avatar-img"
            initialsName={me?.fullName || me?.email}
          />
          <div className="emp-userbox__info">
            <strong>{me?.fullName || "Nhà tuyển dụng"}</strong>
            <span>{me?.email || ""}</span>
          </div>
          <button type="button" className="emp-icon-btn" onClick={handleLogout} aria-label="Đăng xuất">
            <IconLogout size={18} />
          </button>
        </div>
      </aside>

      <div className="emp-body">
        <header className="emp-topbar">
          <form className="emp-topbar__search" onSubmit={submitSearch}>
            <IconSearch size={17} />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm kiếm tin tuyển dụng..."
              aria-label="Tìm kiếm tin tuyển dụng"
            />
          </form>
          <div className="emp-topbar__right">
            <button
              type="button"
              className="emp-topbar__icon"
              onClick={() => navigate("/employer/chat")}
              aria-label="Mở tin nhắn"
            >
              <IconChat size={20} />
              {unread > 0 && <span className="emp-topbar__badge">{unread}</span>}
            </button>
            <div className="emp-topbar__chip">
              <div>
                <strong>{company?.name || "Công ty của bạn"}</strong>
                <span>Nhà tuyển dụng</span>
              </div>
              <CompanyLogo
                src={company?.logo}
                className="emp-avatar-img"
                initialsName={company?.name || me?.email}
              />
            </div>
          </div>
        </header>

        <main className="emp-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// Tiêu đề đầu trang dùng chung cho các trang con.
export function EmployerPageHeader({ title, description, action }) {
  return (
    <div className="emp-page-head">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
