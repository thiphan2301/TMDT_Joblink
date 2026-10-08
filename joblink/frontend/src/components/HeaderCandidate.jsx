import "../style/HeaderCandidate.css";

function HeaderCandidate({
  onOpenSidebar,
  pageTitle,
  userName = "Nguyễn Minh Anh",
}) {
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
          <span className="header-breadcrumb-parent">
            Không gian của bạn
          </span>
          <span className="header-breadcrumb-arrow" aria-hidden="true">
            ›
          </span>
          <span className="header-page-title">{pageTitle}</span>
        </div>
      </div>

      <div className="header-right">

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
      </div>
    </header>
  );
}

export default HeaderCandidate;