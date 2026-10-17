import { useMemo, useState } from "react";
import { AdminPageHeader } from "../../components/admin/AdminLayout.jsx";
import { DonutChart, RevenueBars } from "../../components/admin/AdminCharts.jsx";
import { IconDownload } from "../../components/admin/AdminIcons.jsx";
import { formatMoney } from "../../components/admin/adminFormat.js";
import useAdminData from "../../hooks/useAdminData.js";
import { getAdminReport } from "../../services/adminService.js";
import DateRangePicker, { rangeLabel } from "../../components/admin/DateRangePicker.jsx";

// Nhãn tháng hiện tại tự tính theo ngày đang xem, không ghi cứng.
const NOW = new Date();
const PERIODS = [
  { value: "month", label: `Tháng ${NOW.getMonth() + 1}/${NOW.getFullYear()}`, months: 1 },
  { value: "3months", label: "3 tháng gần nhất", months: 3 },
  { value: "6months", label: "6 tháng gần nhất", months: 6 },
];

// Trang "Báo cáo & thống kê" — đúng bản thiết kế:
// chọn kỳ báo cáo, biểu đồ cột doanh thu, donut phân bổ, bảng tổng hợp
// theo tháng và nút Tạo & xuất báo cáo (tải file CSV ngay tại trình duyệt).
export default function AdminReports() {
  const [period, setPeriod] = useState("6months");
  // Khoảng ngày tự chọn — đủ cả Từ + Đến thì thắng kỳ báo cáo có sẵn.
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const rangeActive = Boolean(from && to);
  const { data, loading, error } = useAdminData(
    () => getAdminReport(rangeActive ? { from, to } : period),
    [period, rangeActive ? from : "", rangeActive ? to : ""],
  );

  const periodInfo = PERIODS.find((p) => p.value === period) || PERIODS[2];
  const months = useMemo(() => {
    if (!data?.months) return [];
    return rangeActive ? data.months : data.months.slice(-periodInfo.months);
  }, [data, periodInfo, rangeActive]);

  function exportCsv() {
    const header = "Tháng;Người dùng mới;Tin tuyển dụng;Doanh thu (đ)";
    const lines = months.map((m) => `${m.label};${m.newUsers};${m.newJobs};${m.revenue}`);
    const csv = "﻿" + [header, ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `bao-cao-joblink-${rangeActive ? `${from}_${to}` : period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <AdminPageHeader
        title="Báo cáo & thống kê"
        description="Từ dữ liệu đến những quyết định tuyển dụng hiệu quả hơn."
        action={
          <button type="button" className="admin-btn admin-btn--primary" onClick={exportCsv} disabled={months.length === 0}>
            <IconDownload size={18} /> Tạo &amp; xuất báo cáo
          </button>
        }
      />
      {error && <p className="admin-error">{error}</p>}

      <div style={{ display: "flex", alignItems: "flex-end", gap: 22, marginBottom: 20, flexWrap: "wrap" }}>
        <label htmlFor="report-period" style={{ color: "var(--a-muted)", paddingBottom: 10 }}>Kỳ báo cáo</label>
        <select
          id="report-period"
          className="admin-select"
          style={{ width: "auto", minWidth: 210 }}
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
        {rangeActive && (
          <span style={{ color: "var(--a-muted)", paddingBottom: 10 }}>
            Đang xem theo khoảng ngày {rangeLabel(from, to)} (bỏ qua kỳ báo cáo)
          </span>
        )}
      </div>

      {loading ? (
        <p className="admin-loading">Đang tải báo cáo...</p>
      ) : data ? (
        <>
          <section className="admin-grid-2">
            <div className="admin-panel">
              <div className="admin-panel__head">
                <h3>Doanh thu</h3>
                <span className="admin-chip">{periodInfo.label}</span>
              </div>
              <RevenueBars data={months} />
            </div>
            <div className="admin-panel">
              <div className="admin-panel__head"><h3>Phân bổ người dùng</h3></div>
              <DonutChart data={data.distribution} />
            </div>
          </section>

          <section className="admin-card-table">
            <div className="admin-panel__head" style={{ padding: "20px 22px 4px" }}>
              <h3>Tổng hợp · {periodInfo.label}</h3>
            </div>
            <table className="admin-table">
              <thead>
                <tr><th>Tháng</th><th>Người dùng mới</th><th>Tin tuyển dụng</th><th>Doanh thu</th></tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.label}>
                    <td>{m.label}</td>
                    <td>{m.newUsers}</td>
                    <td>{m.newJobs}</td>
                    <td><span className="admin-link" style={{ cursor: "default" }}>{formatMoney(m.revenue)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </>
  );
}
