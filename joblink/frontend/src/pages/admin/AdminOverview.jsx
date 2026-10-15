import { useNavigate } from "react-router";
import { AdminPageHeader } from "../../components/admin/AdminLayout.jsx";
import { GrowthChart, DonutChart } from "../../components/admin/AdminCharts.jsx";
import { IconUsers, IconBriefcase, IconWallet, IconShield, IconFile, IconCheckCircle } from "../../components/admin/AdminIcons.jsx";
import { formatNumber, formatMoneyCompact, formatPercent } from "../../components/admin/adminFormat.js";
import useAdminData from "../../hooks/useAdminData.js";
import { getAdminOverview } from "../../services/adminService.js";

// Trang "Tổng quan nền tảng" — đúng bản thiết kế:
// 4 thẻ số liệu, biểu đồ tăng trưởng 6 tháng, donut phân bổ người dùng,
// và khối Thông báo hệ thống ở dưới.
export default function AdminOverview() {
  const navigate = useNavigate();
  const { data, loading, error } = useAdminData(getAdminOverview, []);

  if (loading) return <p className="admin-loading">Đang tải tổng quan...</p>;
  if (error) return <p className="admin-error">{error}</p>;
  if (!data) return null;

  const stats = [
    {
      label: "Tổng người dùng", value: formatNumber(data.totalUsers),
      sub: `${formatPercent(data.usersGrowthPercent)} so với tháng trước`, icon: IconUsers,
    },
    {
      label: "Tin tuyển dụng", value: formatNumber(data.totalJobs),
      sub: `${formatPercent(data.jobsGrowthPercent)} so với tháng trước`, icon: IconBriefcase,
    },
    {
      label: "Doanh thu tháng", value: formatMoneyCompact(data.revenueMonth),
      sub: `${formatPercent(data.revenueGrowthPercent)} so với tháng trước`, icon: IconWallet,
    },
    {
      label: "Tài khoản cần xử lý", value: formatNumber(data.pendingAccounts),
      sub: "Theo dõi trạng thái tài khoản", icon: IconShield,
    },
  ];

  const notices = [
    {
      icon: IconCheckCircle, title: "Hệ thống hoạt động bình thường",
      text: "Tất cả dịch vụ đang hoạt động ổn định.",
    },
    {
      icon: IconFile, title: `Báo cáo tháng ${new Date().getMonth()} đã sẵn sàng`,
      text: "Kiểm tra và xuất báo cáo trong mục Báo cáo & thống kê.",
    },
  ];
  if (data.pendingAccounts > 0) {
    notices.push({
      icon: IconUsers, title: "Có tài khoản cần xem xét",
      text: "Kiểm tra danh sách người dùng để xử lý trạng thái tài khoản.",
    });
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Quản trị hệ thống"
        title="Tổng quan nền tảng"
        description="Những con số hôm nay, quyết định tốt hơn cho ngày mai."
        action={
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => navigate("/admin/reports")}>
            <IconFile size={18} /> Xem báo cáo
          </button>
        }
      />

      <section className="admin-stat-grid" aria-label="Số liệu chính">
        {stats.map((s) => (
          <article key={s.label} className="admin-stat-card">
            <div className="admin-stat-card__top">
              <span className="admin-stat-card__label">{s.label}</span>
              <span className="admin-stat-card__icon"><s.icon size={20} /></span>
            </div>
            <p className="admin-stat-card__value">{s.value}</p>
            <span className="admin-stat-card__sub">{s.sub}</span>
          </article>
        ))}
      </section>

      <section className="admin-grid-2">
        <div className="admin-panel">
          <div className="admin-panel__head">
            <h3>Tăng trưởng nền tảng</h3>
            <span className="admin-chip">6 tháng gần nhất</span>
          </div>
          <GrowthChart data={data.growth} />
        </div>
        <div className="admin-panel">
          <div className="admin-panel__head"><h3>Phân bổ người dùng</h3></div>
          <DonutChart data={data.distribution} />
        </div>
      </section>

      <section className="admin-panel" style={{ marginBottom: 24 }}>
        <h2>Thông báo hệ thống</h2>
        <ul className="admin-notice-list">
          {notices.map((n) => (
            <li key={n.title}>
              <span className="admin-notice__icon"><n.icon size={20} /></span>
              <div>
                <strong>{n.title}</strong>
                <p>{n.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
