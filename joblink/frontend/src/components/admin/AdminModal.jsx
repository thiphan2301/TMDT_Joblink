import { IconClose } from "./AdminIcons.jsx";

// Modal dùng chung cho khu vực admin, đúng mẫu thiết kế:
// hộp trắng bo góc lớn, tiêu đề + nút X, đường kẻ mảnh dưới tiêu đề.
export function AdminModal({ title, onClose, children, wide = false }) {
  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`admin-modal${wide ? " admin-modal--wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="admin-modal__head">
          <h2>{title}</h2>
          <button type="button" className="admin-icon-btn" onClick={onClose} aria-label="Đóng">
            <IconClose size={18} />
          </button>
        </div>
        <div className="admin-modal__body">{children}</div>
      </div>
    </div>
  );
}

// Hộp xác nhận xóa theo mẫu: "Tài khoản Phạm Gia Huy sẽ bị xóa khỏi hệ thống..."
export function ConfirmDelete({ title, message, onCancel, onConfirm, busy = false }) {
  return (
    <AdminModal title={title} onClose={onCancel}>
      <p className="admin-confirm-text">{message}</p>
      <div className="admin-modal__actions">
        <button type="button" className="admin-btn admin-btn--ghost" onClick={onCancel} disabled={busy}>
          Hủy
        </button>
        <button type="button" className="admin-btn admin-btn--primary" onClick={onConfirm} disabled={busy}>
          {busy ? "Đang xóa..." : "Xác nhận xóa"}
        </button>
      </div>
    </AdminModal>
  );
}

// Nhãn trường bắt buộc: "Họ và tên *" với dấu * màu xanh như thiết kế.
export function FieldLabel({ children, required = false }) {
  return (
    <span className="admin-field-label">
      {children} {required && <span className="admin-required">*</span>}
    </span>
  );
}
