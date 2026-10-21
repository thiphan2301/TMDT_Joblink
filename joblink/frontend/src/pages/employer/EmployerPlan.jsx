import { useState } from "react";
import { Link } from "react-router";
import { EmployerModal } from "../../components/employer/EmployerModal.jsx";
import {
  IconCheck, IconX, IconCrown, IconStar, IconBriefcase,
  IconWallet, IconInfo, IconDownload,
} from "../../components/employer/EmployerIcons.jsx";
import {
  PLAN_LABELS, SUBSCRIPTION_STATUS_LABELS,
  formatMoney, formatDate,
} from "../../components/employer/employerFormat.js";
import useEmployerData from "../../hooks/useEmployerData.js";
import {
  getPackages, getSubscriptionHistory, getWallet,
} from "../../services/employerService.js";

// Trang "Gói dịch vụ" theo thiết kế Employer Portal: banner giới
// thiệu kèm panel gói hiện tại, thẻ giá các gói đang bán + thẻ các
// gói Token (đều đọc từ database qua API — giá và giới hạn do admin
// cấu hình), bảng so sánh quyền lợi và lịch sử đăng ký thật của
// tài khoản. Thanh toán trực tuyến chưa có (đó là chức năng
// riêng của hệ thống) nên nút Đăng ký/Mua mở hộp thoại nói rõ
// cách cấp hiện tại — trang không có nút mua giả.
const TIER_OF_NAME = (name) =>
    name === "Premium" ? "premium" : name === "Pro" ? "pro" : "basic";
const PLAN_TAGLINES = {
  premium: "Giải pháp toàn diện cho doanh nghiệp tuyển nhiều và cần kho hồ sơ rộng nhất.",
  pro: "Phù hợp cho doanh nghiệp vừa và nhỏ có nhu cầu tuyển dụng thường xuyên.",
  basic: "Dành cho cá nhân hoặc startup mới bắt đầu tuyển dụng.",
};
const TIER_ICONS = {
  premium: <IconStar size={24} />,
  pro: <IconCrown size={24} />,
  basic: <IconBriefcase size={24} />,
};

function limitText(value) {
  return value === null || value === undefined ? "Không giới hạn" : value;
}

function daysLeft(endAt) {
  if (!endAt) return null;
  return Math.max(0, Math.ceil((new Date(endAt).getTime() - Date.now()) / 86400000));
}

function Perk({ on, children }) {
  return (
      <li className={on ? "" : "emp-perk--off"}>
        {on ? <IconCheck size={16} /> : <IconX size={16} />} <span>{children}</span>
      </li>
  );
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export default function EmployerPlan() {
  const { data, loading, error } = useEmployerData(getPackages, []);
  const { data: history } = useEmployerData(getSubscriptionHistory, []);
  const { data: wallet } = useEmployerData(getWallet, []);
  const [upgradePkg, setUpgradePkg] = useState(null);
  const [tokenPkg, setTokenPkg] = useState(null);
  const [detailRow, setDetailRow] = useState(null);

  const currentTier = data?.currentPlan || "basic";
  const packages = data?.packages || [];
  const tokenPackages = data?.tokenPackages || [];
  const activeSub = (history || []).find((r) => r.status === "active") || null;
  const activeCount = (history || []).filter((r) => r.status === "active").length;
  // Gói đang dùng: gói đắt nhất thuộc cấp gói đang hiệu lực.
  const currentPackageId = packages
      .filter((p) => TIER_OF_NAME(p.name) === currentTier)
      .sort((a, b) => (b.price || 0) - (a.price || 0))[0]?.id;

  const compareRows = [
    { label: "Giá gói", render: (p) => (p.price > 0 ? formatMoney(p.price) : "0đ") },
    { label: "Thời hạn gói", render: (p) => `${p.durationDays} ngày` },
    { label: "Tin tuyển dụng tối đa", render: (p) => limitText(p.jobPostLimit) },
    { label: "Lượt xem hồ sơ / lượt đăng ký", render: (p) => limitText(p.cvViewLimit) },
    { label: "Token tặng kèm", render: (p) => (p.includedTokens ? `${p.includedTokens} Token` : "—") },
    { label: "Tin nổi bật (highlight)", render: (p) => p.canHighlightJobs },
    { label: "Ưu tiên lên đầu danh sách", render: (p) => p.canPrioritizeJobs },
    { label: "Tìm kiếm kho hồ sơ ứng viên", render: (p) => p.canSearchCandidates },
    { label: "Liên hệ trực tiếp ứng viên", render: (p) => p.canDirectContact },
  ];

  function exportComparison() {
    const header = ["Tính năng dịch vụ", ...packages.map((p) => p.name)];
    const lines = compareRows.map((row) => [
      row.label,
      ...packages.map((p) => {
        const v = row.render(p);
        return typeof v === "boolean" ? (v ? "Có" : "Không") : v;
      }),
    ]);
    const csv = [header, ...lines].map((cols) => cols.map(csvCell).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bang-so-sanh-goi.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
      <>
        <section className="emp-hero emp-hero--plan">
          <div className="emp-hero__main">
            <span className="emp-hero__badge">GIẢI PHÁP TÀI KHOẢN</span>
            <h2>Nâng tầm tuyển dụng với các gói dịch vụ chuyên nghiệp</h2>
            <p>
              Tối ưu quy trình tìm kiếm nhân tài của bạn với hệ thống đẩy tin
              tự động, tìm kiếm kho hồ sơ và báo cáo phân tích chuyên sâu từ
              JobLink.
            </p>
            <div className="emp-hero__actions">
              <a className="emp-btn emp-btn--white" href="#bang-gia">Xem bảng giá chi tiết</a>
              <Link className="emp-btn emp-btn--outline-light" to="/employer/wallet">Xem ví Token</Link>
            </div>
          </div>
          <aside className="emp-hero__panel">
            <span className="emp-dark-card__label">Gói hiện tại của bạn</span>
            <strong className="plan-name">{PLAN_LABELS[currentTier] || "Basic"}</strong>
            {activeSub ? (
                <p>
                  Gói {activeSub.packageName} · hiệu lực đến {formatDate(activeSub.endAt)}
                  {daysLeft(activeSub.endAt) !== null && <> · còn {daysLeft(activeSub.endAt)} ngày</>}
                </p>
            ) : (
                <p>Chưa có đăng ký trả phí nào đang hiệu lực — tài khoản đang ở cấp mặc định.</p>
            )}
            <hr />
            <div className="emp-hero__wallet">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <IconWallet size={17} /> Ví Token
            </span>
              <strong>{wallet ? `${wallet.balance} Token` : "—"}</strong>
            </div>
          </aside>
        </section>

        {error && <p className="emp-error">{error}</p>}
        {loading && <p className="emp-muted">Đang tải danh sách gói...</p>}
        {!loading && packages.length === 0 && !error && (
            <p className="emp-muted">Hiện chưa có gói dịch vụ nào đang bán.</p>
        )}

        <h2 id="bang-gia" style={{ textAlign: "center", margin: "6px 0 4px" }}>Chọn gói dịch vụ phù hợp</h2>
        <p className="emp-muted" style={{ textAlign: "center", margin: "0 0 34px" }}>
          Chúng tôi cung cấp đa dạng các gói dịch vụ để phục vụ mọi quy mô doanh nghiệp.
        </p>

        <div className="emp-price-grid">
          {packages.map((pkg) => {
            const tier = TIER_OF_NAME(pkg.name);
            const isCurrent = pkg.id === currentPackageId;
            const isPopular = tier === "pro";
            return (
                <article key={pkg.id} className={`emp-price-card${isCurrent ? " emp-price-card--current" : ""}`}>
                  {isCurrent && <span className="emp-price-card__tag emp-price-card__tag--current">GÓI HIỆN TẠI</span>}
                  {!isCurrent && isPopular && <span className="emp-price-card__tag">PHỔ BIẾN NHẤT</span>}
                  <div className="emp-price-card__icon">{TIER_ICONS[tier]}</div>
                  <h3>{pkg.name === "Basic" ? "CƠ BẢN" : pkg.name === "Pro" ? "CHUYÊN NGHIỆP" : pkg.name === "Premium" ? "DOANH NGHIỆP" : pkg.name}</h3>
                  <p className="emp-price-card__price">
                    {pkg.price > 0 ? formatMoney(pkg.price) : "0đ"}
                    <span> /{pkg.durationDays} ngày</span>
                  </p>
                  <p className="emp-price-card__desc">{PLAN_TAGLINES[tier]}</p>
                  <ul className="emp-perk-list">
                    <Perk on>{limitText(pkg.jobPostLimit)} tin tuyển dụng</Perk>
                    <Perk on>{limitText(pkg.cvViewLimit)} lượt xem hồ sơ</Perk>
                    <Perk on={pkg.includedTokens > 0}>
                      {pkg.includedTokens > 0 ? `Tặng ${pkg.includedTokens} Token` : "Không tặng Token"}
                    </Perk>
                    <Perk on={pkg.canSearchCandidates}>Tìm kiếm ứng viên trong kho hồ sơ</Perk>
                    <Perk on={pkg.canDirectContact}>Liên hệ trực tiếp ứng viên</Perk>
                    <Perk on={pkg.canPrioritizeJobs}>Đẩy tin lên đầu tự động</Perk>
                    <Perk on={pkg.canHighlightJobs}>Tin hiển thị nổi bật</Perk>
                  </ul>
                  <div className="emp-price-card__cta">
                    {isCurrent ? (
                        <button type="button" className="emp-btn" disabled>Gói đang sử dụng</button>
                    ) : (
                        <button type="button"
                                className={`emp-btn ${isPopular ? "emp-btn--primary" : ""}`}
                                onClick={() => setUpgradePkg(pkg)}>
                          Đăng ký ngay
                        </button>
                    )}
                  </div>
                </article>
            );
          })}
        </div>

        {tokenPackages.length > 0 && (
            <>
              <h2 style={{ textAlign: "center", margin: "10px 0 4px" }}>Gói Token</h2>
              <p className="emp-muted" style={{ textAlign: "center", margin: "0 0 22px" }}>
                Token dùng để chi trả cho các tính năng tuyển dụng — số dư hiện tại:{" "}
                <strong style={{ color: "#0f2540" }}>{wallet ? `${wallet.balance} Token` : "—"}</strong>
              </p>
              <div className="emp-token-grid" style={{ marginBottom: 24 }}>
                {tokenPackages.map((tp) => (
                    <article key={tp.id} className="emp-token-card">
                      <span className="emp-stat-card__icon" style={{ marginBottom: 6 }}><IconWallet size={19} /></span>
                      <span className="emp-muted" style={{ fontSize: 13 }}>{tp.name}</span>
                      <span className="emp-token-card__tokens">{tp.tokens} Token</span>
                      <span className="emp-token-card__price">{formatMoney(tp.price)}</span>
                      <button type="button" className="emp-btn" style={{ marginTop: 11, justifyContent: "center" }}
                              onClick={() => setTokenPkg(tp)}>
                        Mua Token
                      </button>
                    </article>
                ))}
              </div>
            </>
        )}

        {packages.length > 0 && (
            <section className="emp-panel" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "18px 20px 6px", display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <h3 style={{ margin: 0 }}>So sánh chi tiết các tính năng</h3>
                  <p className="emp-muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                    Phân tích kỹ lưỡng để đưa ra lựa chọn đầu tư hiệu quả nhất.
                  </p>
                </div>
                <button type="button" className="emp-link"
                        style={{ background: "none", border: "none", cursor: "pointer", font: "inherit", display: "inline-flex", gap: 6, alignItems: "center" }}
                        onClick={exportComparison}>
                  Xuất bảng so sánh <IconDownload size={15} />
                </button>
              </div>
              <table className="emp-table">
                <thead>
                <tr>
                  <th>Tính năng dịch vụ</th>
                  {packages.map((p) => (
                      <th key={p.id}
                          style={TIER_OF_NAME(p.name) === currentTier
                              ? { color: "#0b5cff", background: "#f4f9ff" }
                              : undefined}>
                        {p.name.toUpperCase()}
                      </th>
                  ))}
                </tr>
                </thead>
                <tbody>
                {compareRows.map((row) => (
                    <tr key={row.label}>
                      <td className="emp-table__title" style={{ fontWeight: 600 }}>{row.label}</td>
                      {packages.map((p) => {
                        const value = row.render(p);
                        return (
                            <td key={p.id}
                                style={TIER_OF_NAME(p.name) === currentTier ? { background: "#f4f9ff" } : undefined}>
                              {typeof value === "boolean"
                                  ? (value
                                      ? <span style={{ color: "#0a7a42", display: "inline-flex" }}><IconCheck size={17} /></span>
                                      : <span style={{ color: "#c3cede", display: "inline-flex" }}><IconX size={17} /></span>)
                                  : value}
                            </td>
                        );
                      })}
                    </tr>
                ))}
                </tbody>
              </table>
            </section>
        )}

        <section className="emp-panel" id="lich-su" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "18px 20px 6px" }}>
            <h3 style={{ margin: 0 }}>Lịch sử đăng ký dịch vụ</h3>
            <p className="emp-muted" style={{ margin: "4px 0 0", fontSize: 13 }}>Theo dõi và quản lý các giao dịch đã thực hiện.</p>
            <p style={{ display: "flex", alignItems: "center", gap: 16, margin: "11px 0 4px", fontSize: 13.5, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <span className="emp-dot emp-dot--green" /> Đang hoạt động: <strong>{activeCount}</strong>
            </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <span className="emp-dot emp-dot--gray" /> Lịch sử: <strong>{(history || []).length}</strong>
            </span>
              <span style={{ flex: 1 }} />
              <Link to="/employer/wallet" className="emp-link">Xem ví Token ↗</Link>
            </p>
          </div>
          <table className="emp-table">
            <thead>
            <tr>
              <th>Mã đăng ký</th><th>Gói dịch vụ</th><th>Ngày bắt đầu</th>
              <th>Ngày hết hạn</th><th>Số tiền</th><th>Trạng thái</th><th>Thao tác</th>
            </tr>
            </thead>
            <tbody>
            {(history || []).map((row, i) => (
                <tr key={`${row.orderCode}-${i}`}>
                  <td className="emp-table__muted">{row.orderCode || "—"}</td>
                  <td className="emp-table__title">{row.packageName || "—"}</td>
                  <td className="emp-table__muted">{formatDate(row.startAt)}</td>
                  <td className="emp-table__muted">{formatDate(row.endAt)}</td>
                  <td><strong>{row.totalAmount !== null && row.totalAmount !== undefined ? formatMoney(row.totalAmount) : "—"}</strong></td>
                  <td>
                  <span className={`emp-badge ${row.status === "active" ? "emp-badge--green" : row.status === "cancelled" ? "emp-badge--red" : "emp-badge--gray"}`}>
                    {SUBSCRIPTION_STATUS_LABELS[row.status] || row.status}
                  </span>
                  </td>
                  <td>
                    <button type="button" className="emp-link"
                            style={{ background: "none", border: "none", cursor: "pointer", font: "inherit" }}
                            onClick={() => setDetailRow(row)}>
                      Chi tiết
                    </button>
                  </td>
                </tr>
            ))}
            {history && history.length === 0 && (
                <tr><td colSpan={7} className="emp-table__muted">
                  Chưa có lượt đăng ký nào. Các gói được admin cấp (miễn phí) cũng sẽ hiện ở đây.
                </td></tr>
            )}
            </tbody>
          </table>
        </section>

        <div className="emp-plan-bottom">
          <div className="emp-info-card emp-info-card--blue">
            <span className="emp-info-card__icon"><IconWallet size={21} /></span>
            <div>
              <h3>Thanh toán bằng JobLink Token</h3>
              <p>
                Số dư ví hiện tại: <strong style={{ color: "#0f2540" }}>{wallet ? `${wallet.balance} Token` : "—"}</strong>.
                Token được tặng kèm khi đăng ký các gói dịch vụ phía trên và dùng
                để chi trả cho các tính năng tuyển dụng trong hệ thống.
              </p>
              <Link to="/employer/wallet" className="emp-link">Mở ví Token →</Link>
            </div>
          </div>
          <div className="emp-info-card emp-info-card--gray">
            <span className="emp-info-card__icon"><IconInfo size={21} /></span>
            <div>
              <h3>Gói hiện tại của bạn: {PLAN_LABELS[currentTier] || "Basic"}</h3>
              <p>
                {activeSub
                    ? `Đang dùng gói ${activeSub.packageName}, hiệu lực đến ${formatDate(activeSub.endAt)}${daysLeft(activeSub.endAt) !== null ? ` (còn ${daysLeft(activeSub.endAt)} ngày)` : ""}.`
                    : "Tài khoản đang ở cấp gói mặc định. Đăng ký thêm một gói trả phí để mở khóa tìm kiếm ứng viên và đẩy tin ưu tiên."}
              </p>
              <a href="#lich-su" className="emp-link">Xem lịch sử đăng ký →</a>
            </div>
          </div>
        </div>

        {upgradePkg && (
            <EmployerModal title={`Đăng ký gói ${upgradePkg.name}`} onClose={() => setUpgradePkg(null)}>
              <p style={{ margin: "0 0 6px", fontSize: 21, fontWeight: 800 }}>
                {upgradePkg.price > 0 ? formatMoney(upgradePkg.price) : "0đ"}
                <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}> /{upgradePkg.durationDays} ngày</span>
              </p>
              <ul className="emp-perk-list" style={{ marginBottom: 15 }}>
                <Perk on>{limitText(upgradePkg.jobPostLimit)} tin tuyển dụng</Perk>
                <Perk on>{limitText(upgradePkg.cvViewLimit)} lượt xem hồ sơ</Perk>
                <Perk on={upgradePkg.includedTokens > 0}>
                  {upgradePkg.includedTokens > 0 ? `Tặng ${upgradePkg.includedTokens} Token` : "Không tặng Token"}
                </Perk>
                <Perk on={upgradePkg.canSearchCandidates}>Tìm kiếm ứng viên trong kho hồ sơ</Perk>
                <Perk on={upgradePkg.canDirectContact}>Liên hệ trực tiếp ứng viên</Perk>
              </ul>
              <div className="emp-suggest-box" style={{ marginTop: 0 }}>
                <strong><IconInfo size={15} /> CÁCH ĐĂNG KÝ HIỆN TẠI</strong>
                <p>
                  Thanh toán trực tuyến đang được hoàn thiện. Ở thời điểm hiện
                  tại, gói dịch vụ được quản trị viên JobLink cấp trực tiếp cho
                  tài khoản của bạn — sau khi được cấp, gói và Token tặng kèm sẽ
                  xuất hiện trong mục Lịch sử đăng ký và Ví Token.
                </p>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button type="button" className="emp-btn emp-btn--primary" onClick={() => setUpgradePkg(null)}>
                  Đã hiểu
                </button>
              </div>
            </EmployerModal>
        )}

        {tokenPkg && (
            <EmployerModal title={`Mua ${tokenPkg.name}`} onClose={() => setTokenPkg(null)}>
              <p style={{ margin: "0 0 10px", fontSize: 21, fontWeight: 800 }}>
                {tokenPkg.tokens} Token
                <span style={{ fontSize: 15, color: "#0b5cff", fontWeight: 700 }}> · {formatMoney(tokenPkg.price)}</span>
              </p>
              <div className="emp-suggest-box" style={{ marginTop: 0 }}>
                <strong><IconInfo size={15} /> CÁCH MUA HIỆN TẠI</strong>
                <p>
                  Thanh toán trực tuyến đang được hoàn thiện nên gói Token chưa
                  mua trực tiếp tại đây được. Hiện Token được cấp kèm theo gói
                  dịch vụ hoặc bởi quản trị viên — mọi biến động số dư đều hiển
                  thị trong Ví Token của bạn.
                </p>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button type="button" className="emp-btn emp-btn--primary" onClick={() => setTokenPkg(null)}>
                  Đã hiểu
                </button>
              </div>
            </EmployerModal>
        )}

        {detailRow && (
            <EmployerModal title="Chi tiết đăng ký dịch vụ" onClose={() => setDetailRow(null)}>
              <div className="emp-form-grid" style={{ gap: "10px 18px" }}>
                <div><p className="emp-field__label">Mã đăng ký</p><strong>{detailRow.orderCode || "—"}</strong></div>
                <div><p className="emp-field__label">Gói dịch vụ</p><strong>{detailRow.packageName || "—"}</strong></div>
                <div><p className="emp-field__label">Ngày bắt đầu</p><strong>{formatDate(detailRow.startAt)}</strong></div>
                <div><p className="emp-field__label">Ngày hết hạn</p><strong>{formatDate(detailRow.endAt)}</strong></div>
                <div>
                  <p className="emp-field__label">Số tiền</p>
                  <strong>{detailRow.totalAmount !== null && detailRow.totalAmount !== undefined ? formatMoney(detailRow.totalAmount) : "—"}</strong>
                </div>
                <div>
                  <p className="emp-field__label">Trạng thái</p>
                  <span className={`emp-badge ${detailRow.status === "active" ? "emp-badge--green" : detailRow.status === "cancelled" ? "emp-badge--red" : "emp-badge--gray"}`}>
                {SUBSCRIPTION_STATUS_LABELS[detailRow.status] || detailRow.status}
              </span>
                </div>
              </div>
              <p className="emp-muted" style={{ fontSize: 13.5, margin: "14px 0 0" }}>
                {detailRow.status === "active" && daysLeft(detailRow.endAt) !== null
                    ? `Gói còn hiệu lực ${daysLeft(detailRow.endAt)} ngày nữa.`
                    : detailRow.status === "active"
                        ? "Gói đang trong thời gian hiệu lực."
                        : "Đăng ký này đã kết thúc hiệu lực."}
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button type="button" className="emp-btn emp-btn--primary" onClick={() => setDetailRow(null)}>
                  Đóng
                </button>
              </div>
            </EmployerModal>
        )}
      </>
  );
}