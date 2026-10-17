// Bộ chọn khoảng ngày dùng chung cho trang Tổng quan và Báo cáo & thống kê.
// from/to là chuỗi "yyyy-mm-dd" (rỗng = chưa chọn). Trang chỉ áp dụng khoảng
// khi đã chọn đủ cả 2 ngày; bấm "Xóa lọc" để quay về chế độ mặc định.
export default function DateRangePicker({ from, to, onChange }) {
  const active = Boolean(from || to);
  return (
    <div className="admin-date-range">
      <label className="admin-date-range__field">
        <span>Từ ngày</span>
        <input
          type="date"
          className="admin-input"
          value={from}
          max={to || undefined}
          onChange={(e) => onChange(e.target.value, to)}
        />
      </label>
      <label className="admin-date-range__field">
        <span>Đến ngày</span>
        <input
          type="date"
          className="admin-input"
          value={to}
          min={from || undefined}
          onChange={(e) => onChange(from, e.target.value)}
        />
      </label>
      {active && (
        <button type="button" className="admin-btn admin-btn--ghost" onClick={() => onChange("", "")}>
          Xóa lọc
        </button>
      )}
    </div>
  );
}

// "01/09/2026 – 15/10/2026" từ 2 chuỗi yyyy-mm-dd, để gắn nhãn biểu đồ.
export function rangeLabel(from, to) {
  const fmt = (s) => {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  };
  return `${fmt(from)} – ${fmt(to)}`;
}
