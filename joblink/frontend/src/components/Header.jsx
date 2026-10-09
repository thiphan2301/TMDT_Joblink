import { useNavigate } from "react-router";
import "../style/HeaderCandidate.css";

function Header({
                           onOpenSidebar,
                           pageTitle,
                           isAuthenticated, // Nhận prop này từ App.jsx
                           userName = "Nguyễn Minh Anh",
                         }) {
  const navigate = useNavigate(); // Dùng để chuyển trang

  const initials = userName
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();

  return (
      <header className="candidate-header">
        <div className="header-left">
          <button
              type="button"
              className="header-menu-button"
              onClick={onOpenSidebar}
              aria-label="Mở menu"
              aria-haspopup="dialog"
          >
            ☰
          </button>

          <div className="header-breadcrumb">
            <span className="header-breadcrumb-parent">Không gian của bạn</span>
            <span className="header-breadcrumb-arrow" aria-hidden="true">
            ›
          </span>
            <span className="header-page-title">{pageTitle}</span>
          </div>
        </div>

        <div className="header-right">
          {/* KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP */}
          {isAuthenticated ? (
              /* NẾU ĐÃ ĐĂNG NHẬP: Hiển thị thông báo và profile */
              <>
                <span className="header-notification">Thông báo</span>

                <div className="header-account">
                  <div className="header-avatar" aria-hidden="true">
                    {initials}
                  </div>

                  <div className="header-user-info">
                    <strong>{userName}</strong>
                    <span>Ứng viên</span>
                  </div>
                </div>
              </>
          ) : (
              /* NẾU CHƯA ĐĂNG NHẬP: Hiển thị nút Đăng nhập và Đăng ký */
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                    onClick={() => navigate('/register')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#475569',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: '8px 12px'
                    }}
                >
                  Đăng ký
                </button>
                <button
                    onClick={() => navigate('/login')}
                    style={{
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 20px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                    }}
                >
                  Đăng nhập
                </button>
              </div>
          )}
        </div>
      </header>
  );
}

export default Header;