import { NavLink } from "react-router";
import logo from "../../assets/logo.png";
import {
  IconGrid,
  IconUsers,
  IconBriefcase,
  IconChart,
  IconPackage,
  IconWallet,
} from "./AdminIcons.jsx";

// Sidebar admin theo bản thiết kế:
// MENU CHÍNH: Tổng quan hệ thống / Quản lý người dùng / Quản lý tin đăng /
//             Báo cáo & thống kê / Quản lý gói dịch vụ
// TIỆN ÍCH:   Ví Token / Design System (giống sidebar ứng viên — chưa có trang riêng)
const MAIN_MENU = [
  { to: "/admin", label: "Tổng quan hệ thống", icon: IconGrid, end: true },
  { to: "/admin/users", label: "Quản lý người dùng", icon: IconUsers },
  { to: "/admin/jobs", label: "Quản lý tin đăng", icon: IconBriefcase },
  { to: "/admin/reports", label: "Báo cáo & thống kê", icon: IconChart },
  { to: "/admin/packages", label: "Quản lý gói dịch vụ", icon: IconPackage },
];

const UTILITY_MENU = [
  { id: "wallet", label: "Ví Token", icon: IconWallet },
  { id: "design", label: "Design System", icon: IconGrid },
];

export default function AdminSidebar() {
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

        <div className="admin-sidebar__divider" />

        <p className="admin-sidebar__heading">TIỆN ÍCH</p>
        <ul className="admin-sidebar__list">
          {UTILITY_MENU.map((item) => (
            <li key={item.id}>
              <span className="admin-sidebar__item admin-sidebar__item--static" title="Chưa có trang riêng">
                <item.icon size={20} />
                <span>{item.label}</span>
              </span>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
