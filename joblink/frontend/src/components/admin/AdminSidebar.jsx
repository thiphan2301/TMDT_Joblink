import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router";
import logo from "../../assets/logo.png";
import {
  IconGrid,
  IconUsers,
  IconBriefcase,
  IconChart,
  IconPackage,
  IconLogout,
} from "./AdminIcons.jsx";
import { getCurrentUser, logout } from "../../services/authService.js";

// Sidebar admin:
// MENU CHÍNH: Tổng quan hệ thống / Quản lý người dùng / Quản lý tin đăng /
//             Báo cáo & thống kê / Quản lý gói dịch vụ
// Cuối sidebar: avatar + tên admin đang đăng nhập và nút Đăng xuất
// (đã bỏ mục TIỆN ÍCH theo yêu cầu).
const MAIN_MENU = [
  { to: "/admin", label: "Tổng quan hệ thống", icon: IconGrid, end: true },
  { to: "/admin/users", label: "Quản lý người dùng", icon: IconUsers },
  { to: "/admin/jobs", label: "Quản lý tin đăng", icon: IconBriefcase },
  { to: "/admin/reports", label: "Báo cáo & thống kê", icon: IconChart },
  { to: "/admin/packages", label: "Quản lý gói dịch vụ", icon: IconPackage },
];

export default function AdminSidebar() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);

  useEffect(() => {
    // Chưa đăng nhập (ví dụ đang bật demo-access) thì /api/auth/me trả null
    // -> khối profile hiện tên mặc định, nút đăng xuất vẫn đưa về /login.
    getCurrentUser().then(setMe).catch(() => setMe(null));
  }, []);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate("/login");
    }
  }

  const displayName = me?.fullName || (me?.email ? me.email.split("@")[0] : "Quản trị viên");
  const initials = displayName.trim().charAt(0).toUpperCase() || "A";

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand">
        <img src={logo} alt="JobLink" />
      </div>

      <nav aria-label="Điều hướng quản trị">
        <p className="admin-sidebar__heading">MENU CHÍNH</p>
        <ul className="admin-sidebar__list">
          {MAIN_MENU.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `admin-sidebar__item${isActive ? " admin-sidebar__item--active" : ""}`
                }
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="admin-sidebar__profile">
        {me?.avatar ? (
          <img className="admin-sidebar__avatar" src={me.avatar} alt="" />
        ) : (
          <span className="admin-sidebar__avatar admin-sidebar__avatar--text" aria-hidden="true">
            {initials}
          </span>
        )}
        <div className="admin-sidebar__profile-info">
          <strong>{displayName}</strong>
          <span>{me?.email || "Chế độ demo (chưa đăng nhập)"}</span>
        </div>
        <button
          type="button"
          className="admin-icon-btn"
          onClick={handleLogout}
          aria-label="Đăng xuất"
          title="Đăng xuất"
        >
          <IconLogout size={19} />
        </button>
      </div>
    </aside>
  );
}
