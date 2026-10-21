import { useEffect, useRef } from "react";
import logo from "../assets/logo.png";
import "../style/SidebarCandidate.css";

// Thanh bên ứng viên theo thiết kế gốc của nhóm.
// Đã bỏ mục "Design System" theo yêu cầu của Sĩ (2026-10-21).
// Huy hiệu số (đơn ứng tuyển, tin chưa đọc) và thẻ Ví Token nhận
// số THẬT từ App.jsx (API tổng quan + chat + ví); khách chưa đăng
// nhập thì không truyền vào nên không hiện.
function SidebarCandidate({ isOpen, onClose, activeItem, onSelect, badges, walletBalance }) {
  const sidebarRef = useRef(null);

  const mainMenu = [
    { id: "discover", label: "Khám phá việc làm" },
    { id: "overview", label: "Tổng quan" },
    { id: "applications", label: "Việc đã ứng tuyển" },
    { id: "saved", label: "Việc đã lưu" },
    { id: "messages", label: "Tin nhắn" },
    { id: "profile", label: "Hồ sơ của tôi" },
    { id: "history", label: "Lịch sử hoạt động" },
  ];

  const utilityMenu = [
    { id: "wallet", label: "Ví Token" },
  ];

  // Đồng bộ việc mở/đóng sidebar với state ở App
  useEffect(() => {
    const sidebar = sidebarRef.current;

    if (isOpen && !sidebar.open) {
      sidebar.showModal();
    } else if (!isOpen && sidebar.open) {
      sidebar.close();
    }

    if (isOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [isOpen]);

  // Nhấn vào vùng nền bên ngoài sidebar để đóng
  function handleOutsideClick(event) {
    if (event.target !== event.currentTarget) return;

    const rect = event.currentTarget.getBoundingClientRect();

    const clickedOutside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;

    if (clickedOutside) onClose();
  }

  function renderMenu(items) {
    return items.map((item) => (
      <li key={item.id}>
        <button
          type="button"
          className={`sidebar-item ${
            activeItem === item.id ? "sidebar-item--active" : ""
          }`}
          aria-pressed={activeItem === item.id}
          onClick={() => onSelect(item)}
        >
          <span>{item.label}</span>
          {badges?.[item.id] > 0 && (
            <span className="sidebar-badge">{badges[item.id]}</span>
          )}
        </button>
      </li>
    ));
  }

  return (
    <dialog
      ref={sidebarRef}
      className="candidate-sidebar"
      aria-label="Menu ứng viên"
      onClick={handleOutsideClick}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="sidebar-top">
        <img className="sidebar-logo" src={logo} alt="JobLink" />

        <button
          type="button"
          className="sidebar-close"
          aria-label="Đóng menu"
          onClick={onClose}
          autoFocus
        >
          ×
        </button>
      </div>

      <nav aria-label="Điều hướng ứng viên">
        <p className="sidebar-heading">MENU CHÍNH</p>
        <ul className="sidebar-list">{renderMenu(mainMenu)}</ul>

        <div className="sidebar-divider" />

        <p className="sidebar-heading">TIỆN ÍCH</p>
        <ul className="sidebar-list">{renderMenu(utilityMenu)}</ul>
      </nav>

      {walletBalance !== null && walletBalance !== undefined && (
        <div className="sidebar-wallet">
          <p className="sidebar-wallet__label">Ví Token của bạn</p>
          <p className="sidebar-wallet__balance">
            <strong>{Number(walletBalance).toLocaleString("vi-VN")}</strong> Token
          </p>
          <button
            type="button"
            className="sidebar-wallet__button"
            onClick={() => onSelect({ id: "wallet", label: "Ví Token" })}
          >
            Nạp thêm Token +
          </button>
        </div>
      )}
    </dialog>
  );
}

export default SidebarCandidate;
