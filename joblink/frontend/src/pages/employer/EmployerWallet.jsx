import { EmployerPageHeader } from "../../components/employer/EmployerLayout.jsx";
import { IconWallet } from "../../components/employer/EmployerIcons.jsx";
import {
  TOKEN_TYPE_LABELS, formatMoney, formatDateTime,
} from "../../components/employer/employerFormat.js";
import useEmployerData from "../../hooks/useEmployerData.js";
import { getWallet, getPackages } from "../../services/employerService.js";

// Trang "Ví Token": số dư Token hiện tại (bảng token_wallets), các gói
// Token đang bán (bảng token_packages) và lịch sử biến động số dư
// (bảng token_transactions). Mua Token trực tuyến chưa có cổng thanh
// toán nên trang chỉ hiển thị thông tin — Token hiện được cộng khi
// đăng ký gói dịch vụ hoặc do admin điều chỉnh.
export default function EmployerWallet() {
  const { data: wallet, loading, error } = useEmployerData(getWallet, []);
  const { data: packagesData } = useEmployerData(getPackages, []);
  const tokenPackages = packagesData?.tokenPackages || [];

  return (
    <>
      <EmployerPageHeader
        title="Ví Token"
        description="Số dư Token dùng cho các dịch vụ của JobLink và lịch sử biến động."
      />
      {error && <p className="emp-error">{error}</p>}
      {loading && <p className="emp-muted">Đang tải ví...</p>}

      {wallet && (
        <>
          <section className="emp-panel" style={{ background: "linear-gradient(120deg,#062a6b,#0b5cff)", color: "#fff", border: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <span className="emp-stat-card__icon" style={{ background: "rgba(255,255,255,.18)", color: "#fff", width: 52, height: 52 }}>
                <IconWallet size={26} />
              </span>
              <div>
                <p style={{ margin: 0, color: "#cfe0ff", fontSize: 13, fontWeight: 600, letterSpacing: ".04em" }}>SỐ DƯ TOKEN HIỆN TẠI</p>
                <p style={{ margin: "2px 0 0", fontSize: 34, fontWeight: 800 }}>{wallet.balance} Token</p>
              </div>
            </div>
            <p style={{ margin: "14px 0 0", color: "#cfe0ff", lineHeight: 1.6, fontSize: 13.5 }}>
              Token được tặng kèm khi đăng ký gói dịch vụ trả phí, hoặc cộng bởi
              quản trị viên. Dùng Token cho các tính năng trả phí khi hệ thống mở.
            </p>
          </section>

          {tokenPackages.length > 0 && (
            <>
              <h3 style={{ margin: "4px 0 12px" }}>Các gói Token đang bán</h3>
              <div className="emp-stat-grid" style={{ marginBottom: 24 }}>
                {tokenPackages.map((tp) => (
                  <article className="emp-stat-card" key={tp.id}>
                    <span className="emp-stat-card__icon emp-stat-card__icon--amber"><IconWallet size={20} /></span>
                    <div>
                      <p className="emp-stat-card__label">{tp.name}</p>
                      <p className="emp-stat-card__value" style={{ fontSize: 20 }}>{formatMoney(tp.price)}</p>
                      <p className="emp-stat-card__sub emp-stat-card__sub--muted">Nạp qua admin / cổng thanh toán sắp mở</p>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          <div className="emp-card-table">
            <table className="emp-table">
              <thead>
                <tr><th>Thời gian</th><th>Loại giao dịch</th><th>Biến động</th><th>Số dư sau</th><th>Tham chiếu</th></tr>
              </thead>
              <tbody>
                {wallet.transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="emp-table__muted">{formatDateTime(t.createdAt)}</td>
                    <td className="emp-table__title" style={{ fontWeight: 600 }}>{TOKEN_TYPE_LABELS[t.type] || t.type}</td>
                    <td className={t.amount >= 0 ? "emp-txn-plus" : "emp-txn-minus"}>
                      {t.amount >= 0 ? `+${t.amount}` : t.amount}
                    </td>
                    <td><strong>{t.balanceAfter}</strong></td>
                    <td className="emp-table__muted">{t.refType ? `${t.refType}${t.refId ? ` #${t.refId}` : ""}` : "—"}</td>
                  </tr>
                ))}
                {wallet.transactions.length === 0 && (
                  <tr><td colSpan={5} className="emp-table__muted">Chưa có giao dịch Token nào.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
