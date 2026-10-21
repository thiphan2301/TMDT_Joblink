import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { getCurrentUser, logout } from "../../services/authService.js";
import { initialsOf } from "../employer/employerFormat.js";
import { IconUser, IconChevronDown } from "../employer/EmployerIcons.jsx";
import logo from "../../assets/logo.png";
import "../../style/Public.css";

// Thanh trên cùng của các trang công khai theo thiết kế mới
// (thay Header cũ): logo ViecLamViet, mục điều hướng và — khi đã
// đăng nhập — chip người dùng dẫn vào khu vực ứng viên; chưa
// đăng nhập thì hiện nút Đăng nhập / Đăng ký như trong ảnh.
export default function PublicHeader() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dropOpen, setDropOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
        .then((u) => { if (!cancelled) setUser(u); })
        .catch(() => { if (!cancelled) setUser(null); });
    return () => { cancelled = true; };
  }, []);

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Vẫn rời trang kể cả khi không gọi được backend.
    }
    setUser(null);
    navigate("/login", { replace: true });
  }

  const homeFor = (u) =>
      u?.role === "admin" ? "/admin" : u?.role === "employer" ? "/employer" : "/dashboard";

  return (
      <header className="pub-header">
        <div className="pub-header__in">
          <Link to="/discover" className="pub-brand">
            <img src={logo} alt="" />
            <span>ViecLamViet</span>
          </Link>
          <nav className="pub-nav">
            <NavLink to="/jobs" className={({ isActive }) => (isActive ? "is-active" : "")}>
              Việc làm
            </NavLink>
            <NavLink to="/discover" className={({ isActive }) => (isActive ? "is-active" : "")}>
              Công ty
            </NavLink>
            <NavLink to="/tro-ly-ai" className={({ isActive }) => (isActive ? "is-active" : "")}>
              Cẩm nang nghề nghiệp
            </NavLink>
            <div
                className="pub-nav__drop"
                onMouseEnter={() => setDropOpen(true)}
                onMouseLeave={() => setDropOpen(false)}
            >
              <button
                  type="button"
                  className="pub-nav__dropbtn"
                  onClick={() => setDropOpen((v) => !v)}
              >
                Dịch vụ <IconChevronDown size={14} />
              </button>
              {dropOpen && (
                  <div className="pub-nav__menu">
                    <Link to="/tro-ly-ai" onClick={() => setDropOpen(false)}>
                      Trợ lý việc làm AI
                    </Link>
                    <Link to="/vi-token" onClick={() => setDropOpen(false)}>
                      Ví token
                    </Link>
                    <Link to="/viec-lam-da-luu" onClick={() => setDropOpen(false)}>
                      Việc làm đã lưu
                    </Link>
                    <Link to="/employer" onClick={() => setDropOpen(false)}>
                      Dành cho nhà tuyển dụng
                    </Link>
                  </div>
              )}
            </div>
          </nav>
          <div className="pub-header__right">
            {user ? (
                <>
                  <Link to={homeFor(user)} className="pub-userchip">
                    {user.avatar
                        ? <img src={user.avatar} alt="" />
                        : (
                            <span className="pub-userchip__initials">
                      {initialsOf(user.fullName || user.email || "U")}
                    </span>
                        )}
                    <div>
                      <strong>{user.fullName || user.email}</strong>
                      <span>
                    {user.role === "employer" ? "Nhà tuyển dụng"
                        : user.role === "admin" ? "Quản trị viên" : "Ứng viên"}
                  </span>
                    </div>
                  </Link>
                  <button type="button" className="pub-logout" onClick={handleLogout}>
                    Đăng xuất
                  </button>
                </>
            ) : (
                <>
                  <Link to="/login" className="pub-login">
                    <IconUser size={16} /> Đăng nhập
                  </Link>
                  <Link to="/register" className="pub-register">
                    <IconUser size={16} /> Đăng ký
                  </Link>
                </>
            )}
          </div>
        </div>
      </header>
  );
}