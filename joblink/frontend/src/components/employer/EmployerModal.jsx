import { useEffect } from "react";

// Hộp thoại dùng chung cho khu vực nhà tuyển dụng (chi tiết đơn, xác
// nhận xóa...). Bấm ra ngoài hoặc phím Esc để đóng.
export function EmployerModal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="emp-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`emp-modal${wide ? " emp-modal--wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="emp-modal__head">
          <h3>{title}</h3>
          <button type="button" className="emp-icon-btn" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FieldLabel({ children, required = false }) {
  return (
    <span className="emp-field__label">
      {children}
      {required && <span className="emp-field__required"> *</span>}
    </span>
  );
}
