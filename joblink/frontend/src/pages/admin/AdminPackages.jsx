import { useState } from "react";
import { AdminPageHeader } from "../../components/admin/AdminLayout.jsx";
import { AdminModal, ConfirmDelete, FieldLabel } from "../../components/admin/AdminModal.jsx";
import { IconPlus, IconEdit, IconTrash, IconCheck, IconClose } from "../../components/admin/AdminIcons.jsx";
import { formatMoney, formatDateTime } from "../../components/admin/adminFormat.js";
import useAdminData from "../../hooks/useAdminData.js";
import {
  getAdminPackages,
  createPackage, updatePackage, deletePackage,
  createTokenPackage, updateTokenPackage, deleteTokenPackage,
  createPromotion, updatePromotion, deletePromotion,
} from "../../services/adminService.js";

// ============================================================
// Trang "Quản lý gói dịch vụ" — TRANG TỰ THIẾT KẾ (chưa có trong bản vẽ),
// giữ nguyên ngôn ngữ của các trang admin còn lại (thẻ trắng, bo góc,
// xanh #0071e3, badge trạng thái, modal + xác nhận xóa giống hệt mẫu).
//
// 3 tab bám đúng 3 bảng trong database:
//  - Gói đăng ký  -> packages        (thẻ gói: giá / hạn / tính năng)
//  - Gói Token    -> token_packages  (bảng: số token / giá / giá mỗi token)
//  - Khuyến mãi   -> promotions      (bảng: mã / mức giảm / thời hạn / lượt dùng)
// ============================================================

const TABS = [
  { id: "packages", label: "Gói đăng ký" },
  { id: "tokens", label: "Gói Token" },
  { id: "promotions", label: "Khuyến mãi" },
];

const FEATURES = [
  { key: "canHighlightJobs", label: "Làm nổi bật tin đăng" },
  { key: "canPrioritizeJobs", label: "Ưu tiên hiển thị tin" },
  { key: "canSearchCandidates", label: "Tìm kiếm ứng viên" },
  { key: "canDirectContact", label: "Liên hệ trực tiếp ứng viên" },
];

export default function AdminPackages() {
  const { data, loading, error, reload } = useAdminData(getAdminPackages, []);
  const [tab, setTab] = useState("packages");
  const [editing, setEditing] = useState(null); // { kind, item|null }
  const [deleting, setDeleting] = useState(null); // { kind, item }
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  async function run(apiCall) {
    setBusy(true);
    setActionError("");
    try {
      await apiCall();
      await reload();
      return true;
    } catch (err) {
      setActionError(err.message || "Thao tác thất bại.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function toggleActive(kind, item) {
    const next = !item.isActive;
    const apis = { packages: updatePackage, tokens: updateTokenPackage, promotions: updatePromotion };
    run(() => apis[kind](item.id, { ...item, isActive: next }));
  }

  async function handleSave(kind, payload, item) {
    const createApis = { packages: createPackage, tokens: createTokenPackage, promotions: createPromotion };
    const updateApis = { packages: updatePackage, tokens: updateTokenPackage, promotions: updatePromotion };
    const ok = await run(() => (item ? updateApis[kind](item.id, payload) : createApis[kind](payload)));
    if (ok) setEditing(null);
  }

  async function handleDelete() {
    const { kind, item } = deleting;
    const apis = { packages: deletePackage, tokens: deleteTokenPackage, promotions: deletePromotion };
    const ok = await run(() => apis[kind](item.id));
    if (ok) setDeleting(null);
  }

  const addLabel = tab === "packages" ? "Thêm gói đăng ký" : tab === "tokens" ? "Thêm gói Token" : "Thêm khuyến mãi";

  return (
    <>
      <AdminPageHeader
        title="Quản lý gói dịch vụ"
        description="Quản lý gói đăng ký, gói Token và chương trình khuyến mãi của nền tảng."
        action={
          <button type="button" className="admin-btn admin-btn--primary" onClick={() => setEditing({ kind: tab, item: null })}>
            <IconPlus size={18} /> {addLabel}
          </button>
        }
      />
      {error && <p className="admin-error">{error}</p>}
      {actionError && <p className="admin-error">{actionError}</p>}

      <div className="admin-tabs" role="tablist" aria-label="Loại gói dịch vụ">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
            className={tab === t.id ? "is-active" : ""} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="admin-loading">Đang tải danh sách gói dịch vụ...</p>
      ) : !data ? null : tab === "packages" ? (
        <section className="admin-package-grid" aria-label="Danh sách gói đăng ký">
          {data.packages.map((pkg, idx) => (
            <article key={pkg.id} className={`admin-package-card${idx === 1 ? " is-popular" : ""}`}>
              <div className="admin-package-card__head">
                <h3>{pkg.name}</h3>
                {pkg.isActive
                  ? <span className="admin-badge admin-badge--green">Đang bán</span>
                  : <span className="admin-badge admin-badge--gray">Đã tắt</span>}
              </div>
              <p className="admin-package-card__price">{formatMoney(pkg.price)} <span>/ {pkg.durationDays} ngày</span></p>
              <p className="admin-package-card__meta">
                Tối đa {pkg.jobPostLimit ?? "∞"} tin đăng · {pkg.cvViewLimit ?? "∞"} lượt xem CV · Kèm {pkg.includedTokens} Token
              </p>
              <ul className="admin-feature-list">
                {FEATURES.map((f) => (
                  <li key={f.key} className={pkg[f.key] ? "" : "is-off"}>
                    {pkg[f.key]
                      ? <span className="ok"><IconCheck size={16} /></span>
                      : <span className="no"><IconClose size={16} /></span>}
                    {f.label}
                  </li>
                ))}
              </ul>
              <div className="admin-package-card__foot">
                <span className="admin-package-card__users">{pkg.activeSubscriptions ?? 0} nhà tuyển dụng đang dùng</span>
                <div className="admin-actions">
                  <button type="button" className="admin-icon-btn" onClick={() => setEditing({ kind: "packages", item: pkg })} aria-label={`Sửa ${pkg.name}`} disabled={busy}><IconEdit size={18} /></button>
                  <button type="button" className="admin-icon-btn" onClick={() => setDeleting({ kind: "packages", item: pkg })} aria-label={`Xóa ${pkg.name}`} disabled={busy}><IconTrash size={18} /></button>
                </div>
              </div>
              <button type="button" className="admin-btn admin-btn--ghost" style={{ marginTop: 14, justifyContent: "center" }}
                onClick={() => toggleActive("packages", pkg)} disabled={busy}>
                {pkg.isActive ? "Tắt gói này" : "Bật lại gói này"}
              </button>
            </article>
          ))}
        </section>
      ) : tab === "tokens" ? (
        <div className="admin-card-table">
          <table className="admin-table">
            <thead><tr><th>Gói Token</th><th>Giá bán</th><th>Giá mỗi Token</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>
              {data.tokenPackages.map((tp) => (
                <tr key={tp.id}>
                  <td><span className="admin-table__title">{tp.tokens} Token</span></td>
                  <td>{formatMoney(tp.price)}</td>
                  <td className="admin-table__muted">{formatMoney(Math.round(tp.price / tp.tokens))} / Token</td>
                  <td>{tp.isActive
                    ? <span className="admin-badge admin-badge--green">Đang bán</span>
                    : <span className="admin-badge admin-badge--gray">Đã tắt</span>}</td>
                  <td>
                    <div className="admin-actions">
                      <button type="button" className="admin-icon-btn" onClick={() => setEditing({ kind: "tokens", item: tp })} aria-label={`Sửa gói ${tp.tokens} Token`} disabled={busy}><IconEdit size={18} /></button>
                      <button type="button" className="admin-icon-btn" onClick={() => toggleActive("tokens", tp)} aria-label="Bật/tắt gói Token" disabled={busy}>
                        {tp.isActive ? <IconClose size={17} /> : <IconCheck size={17} />}
                      </button>
                      <button type="button" className="admin-icon-btn" onClick={() => setDeleting({ kind: "tokens", item: tp })} aria-label={`Xóa gói ${tp.tokens} Token`} disabled={busy}><IconTrash size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-card-table">
          <table className="admin-table">
            <thead><tr><th>Mã khuyến mãi</th><th>Mức giảm</th><th>Thời hạn</th><th>Lượt dùng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>
              {data.promotions.map((promo) => (
                <tr key={promo.id}>
                  <td><span className="admin-badge admin-badge--blue">{promo.code}</span></td>
                  <td>{promo.discountType === "percent" ? `Giảm ${promo.discountValue}%` : `Giảm ${formatMoney(promo.discountValue)}`}
                    <div className="admin-table__sub">Đơn tối thiểu {promo.minOrderAmount ? formatMoney(promo.minOrderAmount) : "—"}</div>
                  </td>
                  <td className="admin-table__muted">{formatDateTime(promo.startAt)} → {formatDateTime(promo.endAt)}</td>
                  <td>{promo.usedCount ?? 0}{promo.usageLimit ? ` / ${promo.usageLimit}` : ""}</td>
                  <td>{promo.isActive
                    ? <span className="admin-badge admin-badge--green">Đang chạy</span>
                    : <span className="admin-badge admin-badge--gray">Đã tắt</span>}</td>
                  <td>
                    <div className="admin-actions">
                      <button type="button" className="admin-icon-btn" onClick={() => setEditing({ kind: "promotions", item: promo })} aria-label={`Sửa ${promo.code}`} disabled={busy}><IconEdit size={18} /></button>
                      <button type="button" className="admin-icon-btn" onClick={() => toggleActive("promotions", promo)} aria-label="Bật/tắt khuyến mãi" disabled={busy}>
                        {promo.isActive ? <IconClose size={17} /> : <IconCheck size={17} />}
                      </button>
                      <button type="button" className="admin-icon-btn" onClick={() => setDeleting({ kind: "promotions", item: promo })} aria-label={`Xóa ${promo.code}`} disabled={busy}><IconTrash size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <PackageFormModal
          kind={editing.kind}
          item={editing.item}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={(payload) => handleSave(editing.kind, payload, editing.item)}
        />
      )}

      {deleting && (
        <ConfirmDelete
          title={deleting.kind === "promotions" ? "Xóa khuyến mãi?" : "Xóa gói dịch vụ?"}
          message={<><strong>{deleting.item.name || deleting.item.code || `${deleting.item.tokens} Token`}</strong> sẽ bị xóa khỏi hệ thống. Nếu đã có đơn hàng dùng gói này, hãy tắt thay vì xóa. Thao tác không thể hoàn tác.</>}
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}


function PackageFormModal({ kind, item, busy, onClose, onSave }) {
  const isNew = !item;
  const titles = {
    packages: isNew ? "Thêm gói đăng ký" : "Chỉnh sửa gói đăng ký",
    tokens: isNew ? "Thêm gói Token" : "Chỉnh sửa gói Token",
    promotions: isNew ? "Thêm khuyến mãi" : "Chỉnh sửa khuyến mãi",
  };

  const [form, setForm] = useState(() => {
    if (kind === "packages") return {
      name: item?.name || "", price: item?.price ?? "", durationDays: item?.durationDays ?? 30,
      jobPostLimit: item?.jobPostLimit ?? "", cvViewLimit: item?.cvViewLimit ?? "",
      includedTokens: item?.includedTokens ?? 0, isActive: item?.isActive ?? true,
      canHighlightJobs: item?.canHighlightJobs ?? false, canPrioritizeJobs: item?.canPrioritizeJobs ?? false,
      canSearchCandidates: item?.canSearchCandidates ?? false, canDirectContact: item?.canDirectContact ?? false,
    };
    if (kind === "tokens") return {
      tokens: item?.tokens ?? "", price: item?.price ?? "", isActive: item?.isActive ?? true,
    };
    return {
      code: item?.code || "", discountType: item?.discountType || "percent",
      discountValue: item?.discountValue ?? "", minOrderAmount: item?.minOrderAmount ?? "",
      maxDiscountAmount: item?.maxDiscountAmount ?? "", startAt: toLocalInput(item?.startAt),
      endAt: toLocalInput(item?.endAt), usageLimit: item?.usageLimit ?? "",
      perUserLimit: item?.perUserLimit ?? 1, isActive: item?.isActive ?? true,
    };
  });
  const [formError, setFormError] = useState("");

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function num(v) {
    return v === "" || v === null ? null : Number(v);
  }

  function submit(e) {
    e.preventDefault();
    if (kind === "packages") {
      if (!form.name.trim()) return setFormError("Vui lòng nhập tên gói.");
      if (!(Number(form.price) >= 0)) return setFormError("Giá gói chưa hợp lệ.");
      return onSave({
        ...form, name: form.name.trim(), price: Number(form.price),
        durationDays: Number(form.durationDays), jobPostLimit: num(form.jobPostLimit),
        cvViewLimit: num(form.cvViewLimit), includedTokens: Number(form.includedTokens || 0),
      });
    }
    if (kind === "tokens") {
      if (!(Number(form.tokens) > 0)) return setFormError("Số Token phải lớn hơn 0.");
      if (!(Number(form.price) >= 0)) return setFormError("Giá gói chưa hợp lệ.");
      return onSave({ tokens: Number(form.tokens), price: Number(form.price), isActive: form.isActive });
    }
    if (!form.code.trim()) return setFormError("Vui lòng nhập mã khuyến mãi.");
    if (!(Number(form.discountValue) > 0)) return setFormError("Mức giảm phải lớn hơn 0.");
    return onSave({
      ...form, code: form.code.trim().toUpperCase(),
      discountValue: Number(form.discountValue),
      minOrderAmount: num(form.minOrderAmount), maxDiscountAmount: num(form.maxDiscountAmount),
      usageLimit: num(form.usageLimit), perUserLimit: num(form.perUserLimit),
      startAt: form.startAt || null, endAt: form.endAt || null,
    });
  }

  return (
    <AdminModal title={titles[kind]} onClose={onClose} wide={kind === "packages"}>
      <form className="admin-form" onSubmit={submit}>
        {kind === "packages" && (
          <>
            <div className="admin-form-grid">
              <label className="admin-field"><FieldLabel required>Tên gói</FieldLabel>
                <input className="admin-input" value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
              <label className="admin-field"><FieldLabel required>Giá (đ)</FieldLabel>
                <input className="admin-input" type="number" min="0" value={form.price} onChange={(e) => set("price", e.target.value)} /></label>
              <label className="admin-field"><FieldLabel required>Thời hạn (ngày)</FieldLabel>
                <input className="admin-input" type="number" min="1" value={form.durationDays} onChange={(e) => set("durationDays", e.target.value)} /></label>
              <label className="admin-field"><FieldLabel>Token kèm theo</FieldLabel>
                <input className="admin-input" type="number" min="0" value={form.includedTokens} onChange={(e) => set("includedTokens", e.target.value)} /></label>
              <label className="admin-field"><FieldLabel>Số tin đăng tối đa</FieldLabel>
                <input className="admin-input" type="number" min="0" value={form.jobPostLimit} onChange={(e) => set("jobPostLimit", e.target.value)} placeholder="Trống = không giới hạn" /></label>
              <label className="admin-field"><FieldLabel>Số lượt xem CV tối đa</FieldLabel>
                <input className="admin-input" type="number" min="0" value={form.cvViewLimit} onChange={(e) => set("cvViewLimit", e.target.value)} placeholder="Trống = không giới hạn" /></label>
            </div>
            <div className="admin-form-grid">
              {FEATURES.map((f) => (
                <label key={f.key} className="admin-checkbox">
                  <input type="checkbox" checked={!!form[f.key]} onChange={(e) => set(f.key, e.target.checked)} />
                  {f.label}
                </label>
              ))}
            </div>
          </>
        )}

        {kind === "tokens" && (
          <div className="admin-form-grid">
            <label className="admin-field"><FieldLabel required>Số Token</FieldLabel>
              <input className="admin-input" type="number" min="1" value={form.tokens} onChange={(e) => set("tokens", e.target.value)} /></label>
            <label className="admin-field"><FieldLabel required>Giá bán (đ)</FieldLabel>
              <input className="admin-input" type="number" min="0" value={form.price} onChange={(e) => set("price", e.target.value)} /></label>
          </div>
        )}

        {kind === "promotions" && (
          <>
            <div className="admin-form-grid">
              <label className="admin-field"><FieldLabel required>Mã khuyến mãi</FieldLabel>
                <input className="admin-input" value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="WELCOME10" /></label>
              <label className="admin-field"><FieldLabel>Loại giảm</FieldLabel>
                <select className="admin-select" value={form.discountType} onChange={(e) => set("discountType", e.target.value)}>
                  <option value="percent">Phần trăm (%)</option>
                  <option value="fixed_amount">Số tiền cố định (đ)</option>
                </select></label>
              <label className="admin-field"><FieldLabel required>Mức giảm</FieldLabel>
                <input className="admin-input" type="number" min="0" value={form.discountValue} onChange={(e) => set("discountValue", e.target.value)} /></label>
              <label className="admin-field"><FieldLabel>Giảm tối đa (đ)</FieldLabel>
                <input className="admin-input" type="number" min="0" value={form.maxDiscountAmount} onChange={(e) => set("maxDiscountAmount", e.target.value)} /></label>
              <label className="admin-field"><FieldLabel>Đơn tối thiểu (đ)</FieldLabel>
                <input className="admin-input" type="number" min="0" value={form.minOrderAmount} onChange={(e) => set("minOrderAmount", e.target.value)} /></label>
              <label className="admin-field"><FieldLabel>Tổng lượt dùng</FieldLabel>
                <input className="admin-input" type="number" min="0" value={form.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} placeholder="Trống = không giới hạn" /></label>
              <label className="admin-field"><FieldLabel>Bắt đầu</FieldLabel>
                <input className="admin-input" type="datetime-local" value={form.startAt} onChange={(e) => set("startAt", e.target.value)} /></label>
              <label className="admin-field"><FieldLabel>Kết thúc</FieldLabel>
                <input className="admin-input" type="datetime-local" value={form.endAt} onChange={(e) => set("endAt", e.target.value)} /></label>
            </div>
          </>
        )}

        <label className="admin-checkbox">
          <input type="checkbox" checked={!!form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
          Đang bán / đang áp dụng
        </label>

        {formError && <p className="admin-form-error">{formError}</p>}
        <button type="submit" className="admin-btn admin-btn--primary" style={{ justifyContent: "center" }} disabled={busy}>
          {busy ? "Đang lưu..." : <>Lưu thông tin <IconCheck size={18} /></>}
        </button>
      </form>
    </AdminModal>
  );
}

function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
