import { useEffect, useMemo, useState } from "react";
import { getCandidateWallet } from "../../services/candidateService.js";
import {
  formatMoney, formatDate, TOKEN_TYPE_LABELS,
} from "../../components/employer/employerFormat.js";
import {
  IconWallet, IconCheck, IconDownload, IconX,
} from "../../components/employer/EmployerIcons.jsx";
import { EmployerModal } from "../../components/employer/EmployerModal.jsx";

const PAGE_SIZE = 5;

// Trang Ví Token của ứng viên theo thiết kế mới: số dư, các gói
// Token đang bán và lịch sử giao dịch — mọi con số đọc từ database
// qua /api/candidate/wallet. Mua gói và thanh toán trực tuyến là
// chức năng riêng của nhóm nên nút mua chỉ mở hộp thông tin.
export default function CandidateWalletPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [infoOpen, setInfoOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const wallet = await getCandidateWallet();
        if (!cancelled) setData(wallet);
      } catch (err) {
        if (!cancelled) setError(err.message || "Không tải được ví Token.");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const list = data?.transactions || [];
    const kw = keyword.trim().toLowerCase();
    return list.filter((t) => {
      if (typeFilter && t.type !== typeFilter) return false;
      if (!kw) return true;
      const label = TOKEN_TYPE_LABELS[t.type] || t.type;
      return `txn-${t.id}`.includes(kw)
        || label.toLowerCase().includes(kw)
        || (t.refType || "").toLowerCase().includes(kw);
    });
  }, [data, keyword, typeFilter]);

  const visible = filtered.slice(0, shown);
  const popularIndex = data?.tokenPackages?.length
    ? Math.floor(data.tokenPackages.length / 2)
    : -1;
  const maxPerToken = useMemo(() => {
    if (!data?.tokenPackages?.length) return 0;
    return Math.max(...data.tokenPackages.map(
      (p) => Number(p.price || 0) / Math.max(1, p.tokens)));
  }, [data]);

  function savingsOf(pkg) {
    if (!maxPerToken) return 0;
    const per = Number(pkg.price || 0) / Math.max(1, pkg.tokens);
    if (per >= maxPerToken) return 0;
    return Math.round((1 - per / maxPerToken) * 100);
  }

  function exportCsv() {
    const rows = (data?.transactions || []).map((t) => [
      `TXN-${t.id}`, t.createdAt || "",
      TOKEN_TYPE_LABELS[t.type] || t.type,
      t.amount > 0 ? `+${t.amount}` : `${t.amount}`,
      t.balanceAfter ?? "",
      t.refType ? `${t.refType} #${t.refId}` : "",
    ]);
    const csv = ["Mã giao dịch,Thời gian,Nội dung,Số Token,Số dư sau,Tham chiếu",
      ...rows.map((r) => r.join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "sao-ke-token.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) return <p className="candw-error">{error}</p>;
  if (!data) return <p className="candw-loading">Đang tải ví Token...</p>;

  return (
    <div className="candw-page">
      <header className="candw-head">
        <div>
          <h1>Ví Token &amp; Thanh toán</h1>
          <p>Quản lý số dư Token, xem các gói ưu đãi và theo dõi lịch sử giao dịch của bạn.</p>
        </div>
        <button
          type="button"
          className="candw-btn candw-btn--primary"
          onClick={() => setInfoOpen(true)}
        >
          Phương thức thanh toán
        </button>
      </header>

      <section className="candw-balance">
        <span className="candw-balance__label">
          <IconWallet size={15} /> SỐ DƯ TOKEN HIỆN TẠI
        </span>
        <div className="candw-balance__row">
          <div className="candw-balance__amount">
            <strong>{data.balance}</strong> <span>Tokens</span>
          </div>
          <div className="candw-balance__actions">
            <a href="#goi-token" className="candw-btn candw-btn--dark">+ Nạp thêm Token</a>
            <a href="#lich-su" className="candw-btn">Xem phân tích chi tiêu</a>
          </div>
        </div>
        <p className="candw-balance__hint">
          Token dùng cho các dịch vụ nâng cao trên hệ thống. Số dư cập nhật ngay khi có giao dịch mới.
        </p>
        <div className="candw-balance__stats">
          <span>Tổng đã nhận: <strong>+{data.totalReceived} Token</strong></span>
          <span>Tổng đã chi: <strong>-{data.totalSpent} Token</strong></span>
          <span>Tổng số giao dịch: <strong>{data.transactions.length}</strong></span>
        </div>
      </section>

      <h2 className="candw-section-title" id="goi-token">Mua gói Token ưu đãi</h2>
      <div className="candw-packages">
        {data.tokenPackages.map((pkg, i) => {
          const savings = savingsOf(pkg);
          const perToken = Math.round(Number(pkg.price || 0) / Math.max(1, pkg.tokens));
          return (
            <article
              key={pkg.id}
              className={`candw-package${i === popularIndex ? " is-popular" : ""}`}
            >
              {i === popularIndex && <span className="candw-package__badge">PHỔ BIẾN NHẤT</span>}
              <span className="candw-package__icon"><IconWallet size={24} /></span>
              <h3>{pkg.name}</h3>
              {savings > 0
                ? <span className="candw-package__save">Tiết kiệm {savings}%</span>
                : <span className="candw-package__save candw-package__save--none">Gói tiêu chuẩn</span>}
              <div className="candw-package__price">{formatMoney(pkg.price)}</div>
              <div className="candw-package__tokens">
                <strong>{pkg.tokens}</strong> <span>Tokens</span>
              </div>
              <ul>
                <li><IconCheck size={15} /> {pkg.tokens} Token cộng vào ví của bạn</li>
                <li><IconCheck size={15} /> Đơn giá {formatMoney(perToken)} mỗi Token</li>
                <li><IconCheck size={15} /> Dùng cho mọi dịch vụ tính bằng Token</li>
              </ul>
              <button
                type="button"
                className={`candw-btn${i === popularIndex ? " candw-btn--primary" : ""}`}
                onClick={() => setInfoOpen(true)}
              >
                Chọn mua ngay
              </button>
            </article>
          );
        })}
        {data.tokenPackages.length === 0 && (
          <p className="candw-empty">Chưa có gói Token nào đang bán.</p>
        )}
      </div>

      <h2 className="candw-section-title" id="lich-su">Lịch sử giao dịch gần đây</h2>
      <section className="candw-history">
        <div className="candw-history__head">
          <div>
            <h3>Lịch sử giao dịch</h3>
            <p>Xem lại toàn bộ lịch sử nạp và sử dụng Token của bạn.</p>
          </div>
          <button type="button" className="candw-btn" onClick={exportCsv}>
            <IconDownload size={15} /> Xuất sao kê
          </button>
        </div>

        <div className="candw-history__filters">
          <input
            placeholder="Tìm mã giao dịch, nội dung..."
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setShown(PAGE_SIZE); }}
          />
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setShown(PAGE_SIZE); }}
          >
            <option value="">Tất cả loại</option>
            {Object.entries(TOKEN_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <table className="candw-table">
          <thead>
            <tr>
              <th>Mã giao dịch</th>
              <th>Thời gian</th>
              <th>Nội dung</th>
              <th>Số lượng</th>
              <th>Trạng thái</th>
              <th>Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => (
              <tr key={t.id}>
                <td className="candw-table__code">TXN-{t.id}</td>
                <td>{formatDate(t.createdAt)}{t.createdAt ? ` - ${String(t.createdAt).slice(11, 16)}` : ""}</td>
                <td>
                  <strong>{TOKEN_TYPE_LABELS[t.type] || t.type}</strong>
                  <span>{t.refType ? `Tham chiếu: ${t.refType} #${t.refId}` : "Giao dịch trong ví"}</span>
                </td>
                <td className={t.amount >= 0 ? "candw-amount--in" : "candw-amount--out"}>
                  {t.amount >= 0 ? `+${t.amount}` : t.amount} Tokens
                </td>
                <td><span className="candw-status">Thành công</span></td>
                <td>
                  <button
                    type="button"
                    className="candw-detail-btn"
                    onClick={() => setDetail(t)}
                    aria-label="Xem chi tiết giao dịch"
                  >
                    ›
                  </button>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="candw-empty">Chưa có giao dịch nào khớp.</td>
              </tr>
            )}
          </tbody>
        </table>

        {filtered.length > shown && (
          <button
            type="button"
            className="candw-more"
            onClick={() => setShown((s) => s + PAGE_SIZE)}
          >
            Xem thêm {Math.min(PAGE_SIZE, filtered.length - shown)} giao dịch cũ hơn
          </button>
        )}
      </section>

      <div className="candw-bottom">
        <div className="candw-vat">
          <h3>Hóa đơn giá trị gia tăng (VAT)</h3>
          <p>
            Tất cả giao dịch nạp Token đều có thể xuất hóa đơn điện tử VAT
            cho cá nhân/doanh nghiệp trong vòng 7 ngày làm việc.
          </p>
        </div>
        <div className="candw-support">
          <h3>Cần hỗ trợ về thanh toán?</h3>
          <p>
            Nếu gặp bất kỳ khó khăn nào trong quá trình giao dịch, hãy liên
            hệ đội ngũ hỗ trợ của ViecLamViet.
          </p>
          <p><strong>Email:</strong> support@vieclamviet.vn</p>
        </div>
      </div>

      {infoOpen && (
        <EmployerModal title="Thanh toán trực tuyến" onClose={() => setInfoOpen(false)}>
          <p style={{ lineHeight: 1.65, color: "#52657c" }}>
            Chức năng mua Token và thanh toán trực tuyến đang được hoàn
            thiện ở phân hệ thanh toán của nhóm. Hiện tại số dư Token của
            bạn được cấp qua các chương trình của hệ thống và quản trị
            viên. Số dư và lịch sử trên trang này luôn là số thật từ ví
            của bạn.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <button type="button" className="candw-btn candw-btn--primary" onClick={() => setInfoOpen(false)}>
              Đã hiểu
            </button>
          </div>
        </EmployerModal>
      )}

      {detail && (
        <EmployerModal title={`Giao dịch TXN-${detail.id}`} onClose={() => setDetail(null)}>
          <div className="candw-detail">
            <div><span>Loại giao dịch</span><strong>{TOKEN_TYPE_LABELS[detail.type] || detail.type}</strong></div>
            <div><span>Số Token</span><strong>{detail.amount >= 0 ? `+${detail.amount}` : detail.amount}</strong></div>
            <div><span>Số dư sau giao dịch</span><strong>{detail.balanceAfter} Token</strong></div>
            <div><span>Thời gian</span><strong>{formatDate(detail.createdAt)}</strong></div>
            <div>
              <span>Tham chiếu</span>
              <strong>{detail.refType ? `${detail.refType} #${detail.refId}` : "—"}</strong>
            </div>
            <div><span>Trạng thái</span><strong>Đã ghi vào sổ ví — thành công</strong></div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <button type="button" className="candw-btn" onClick={() => setDetail(null)}>
              <IconX size={15} /> Đóng
            </button>
          </div>
        </EmployerModal>
      )}
    </div>
  );
}
