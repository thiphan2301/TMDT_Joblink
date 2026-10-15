import { Outlet } from "react-router";
import AdminSidebar from "./AdminSidebar.jsx";
import { IconChat } from "./AdminIcons.jsx";
import "../../style/Admin.css";

// Khung chung của khu vực admin: sidebar trái cố định + vùng nội dung phải.
// Gắn vào App.jsx bằng route cha /admin (xem README), các trang con render ở <Outlet />.
export default function AdminLayout() {
  return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className="admin-main">
        <Outlet />
        <footer className="admin-footer">
          <span>© 2026 JobLink. Kết nối cơ hội, kiến tạo tương lai.</span>
          <span className="admin-footer__links">
            <span>Quyền riêng tư</span>
            <span>Trợ giúp &amp; hỗ trợ</span>
            <span>Tiếng Việt</span>
          </span>
        </footer>
      </main>
      {/* Nút chat nổi ở góc phải dưới — có trong mọi ảnh thiết kế */}
      <button type="button" className="admin-chat-fab" aria-label="Mở hỗ trợ trực tuyến">
        <IconChat size={24} />
      </button>
    </div>
  );
}

// Đầu trang dùng chung: nhãn nhỏ xanh + tiêu đề lớn + mô tả + nút hành động bên phải.
export function AdminPageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="admin-page-head">
      <div>
        {eyebrow && <p className="admin-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="admin-page-desc">{description}</p>}
      </div>
      {action}
    </div>
  );
}
