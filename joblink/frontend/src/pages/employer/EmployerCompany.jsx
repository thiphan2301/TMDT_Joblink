import { useRef, useState } from "react";
import { EmployerPageHeader } from "../../components/employer/EmployerLayout.jsx";
import { FieldLabel } from "../../components/employer/EmployerModal.jsx";
import {
  IconBuilding, IconCheck, IconPin, IconUsers, IconInfo, IconCamera, IconX,
} from "../../components/employer/EmployerIcons.jsx";
import useEmployerData from "../../hooks/useEmployerData.js";
import {
  getEmployerCompanies, getCompanyProfile, updateCompanyProfile,
  uploadCompanyLogo, uploadCompanyCover,
} from "../../services/employerService.js";

// Trang "Hồ sơ công ty" theo thiết kế Employer Portal: ảnh bìa +
// thẻ logo nổi, tên công ty kèm trạng thái xác thực, cột trái là
// Thông tin cơ bản + Giới thiệu, cột phải là Địa chỉ (kèm bản đồ
// tra theo địa chỉ) + thẻ Độ hoàn thiện màu navy, thanh Lưu dính
// cuối trang. Ảnh bìa tải từ máy tính lưu ở cột companies.cover
// (migration V12), áp dụng ngay như logo. Hệ thống không có cột
// số điện thoại, văn hóa, phúc lợi hay thư viện ảnh nên các mục
// đó trong bản mẫu không xuất hiện.
// Cấu trúc tránh set state đồng bộ trong useEffect (rule
// react-hooks/set-state-in-effect): công ty đang sửa được SUY RA
// từ lựa chọn + danh sách công ty, hồ sơ nạp qua useEmployerData,
// form là component con khởi tạo state từ profile (key theo công
// ty nên đổi công ty là form tự nạp lại giá trị).
const INDUSTRIES = [
  "Công nghệ phần mềm", "Thương mại điện tử", "Tài chính - Ngân hàng",
  "Giáo dục", "Y tế", "Sản xuất", "Bán lẻ", "Logistics", "Bất động sản",
  "Truyền thông - Marketing", "Khác",
];
const SIZES = ["1 - 10 nhân viên", "11 - 50 nhân viên", "51 - 150 nhân viên",
  "150 - 500 nhân viên", "500 - 1000 nhân viên", "Trên 1000 nhân viên"];

const VERIFICATION_LABELS = {
  verified: { text: "Đã xác thực", cls: "emp-badge--green" },
  pending: { text: "Chờ xác thực", cls: "emp-badge--amber" },
  rejected: { text: "Bị từ chối xác thực", cls: "emp-badge--red" },
};

// 9 trường backend dùng để tính độ hoàn thiện hồ sơ.
const COMPLETENESS_FIELDS = [
  ["name", "tên công ty"], ["legalName", "tên pháp lý"],
  ["taxCode", "mã số thuế"], ["website", "website"],
  ["industry", "lĩnh vực"], ["size", "quy mô"],
  ["address", "địa chỉ"], ["description", "phần giới thiệu"],
  ["logo", "logo"],
];

function initialForm(profile) {
  return {
    name: profile.name || "", legalName: profile.legalName || "",
    taxCode: profile.taxCode || "", website: profile.website || "",
    industry: profile.industry || INDUSTRIES[0], size: profile.size || SIZES[1],
    address: profile.address || "", description: profile.description || "",
    logo: profile.logo || "", cover: profile.cover || "",
  };
}

export default function EmployerCompany() {
  const { data: companies, error: companiesError } = useEmployerData(getEmployerCompanies, []);
  const [selectedId, setSelectedId] = useState("");
  // Chưa chọn tay thì mặc định là công ty đầu tiên trong danh sách.
  const companyId = selectedId
      || (companies?.length ? String(companies[0].id) : "");

  const {
    data: profile, setData: setProfile, loading, error: profileError,
  } = useEmployerData(
      () => (companyId ? getCompanyProfile(companyId) : Promise.resolve(null)),
      [companyId],
  );

  return (
      <>
        <EmployerPageHeader
            title="Hồ sơ công ty"
            description="Thông tin hiển thị với ứng viên trên trang công ty và các tin tuyển dụng."
        />
        {companiesError && <p className="emp-error">{companiesError}</p>}
        {profileError && <p className="emp-error">{profileError}</p>}
        {companies && companies.length === 0 && (
            <p className="emp-error">
              Tài khoản của bạn chưa sở hữu công ty nào trong hệ thống. Hãy liên hệ
              quản trị viên để được gắn công ty.
            </p>
        )}

        {companies && companies.length > 1 && (
            <label className="emp-field" style={{ maxWidth: 340, marginBottom: 16 }}>
              <span className="emp-field__label">Công ty đang sửa</span>
              <select className="emp-input" value={companyId} onChange={(e) => setSelectedId(e.target.value)}>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
        )}

        {loading && companyId && <p className="emp-muted">Đang tải hồ sơ...</p>}

        {profile && (
            <CompanyProfileForm
                key={profile.id}
                companyId={companyId}
                profile={profile}
                onProfileChange={setProfile}
            />
        )}
      </>
  );
}

// Form sửa hồ sơ một công ty — state khởi tạo một lần từ profile,
// component cha gắn key theo id công ty nên không cần effect đồng bộ.
function CompanyProfileForm({ companyId, profile, onProfileChange }) {
  const [form, setForm] = useState(() => initialForm(profile));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [brokenLogoSrc, setBrokenLogoSrc] = useState("");
  const [brokenCoverSrc, setBrokenCoverSrc] = useState("");

  const verification = VERIFICATION_LABELS[profile?.verificationStatus] || VERIFICATION_LABELS.pending;
  const missing = COMPLETENESS_FIELDS
      .filter(([key]) => !String(form[key] || "").trim())
      .map(([, label]) => label);
  const websiteHref = form.website
      ? (/^https?:\/\//i.test(form.website) ? form.website : `https://${form.website}`)
      : null;

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function resetForm() {
    setForm(initialForm(profile));
    setFormError("");
    setNotice("");
  }

  // Báo cho EmployerLayout tải lại công ty để logo ở sidebar +
  // topbar đổi ngay, không phải chờ tải lại trang.
  function notifyLayout() {
    window.dispatchEvent(new Event("joblink:company-updated"));
  }

  // Tải logo lên từ file trong máy tính — áp dụng ngay, không cần
  // bấm Lưu thay đổi (vẫn giữ ô dán URL ở form bên dưới nếu cần).
  async function handleLogoFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setFormError("");
    setNotice("");
    try {
      const saved = await uploadCompanyLogo(companyId, file);
      onProfileChange(saved);
      setForm((f) => ({ ...f, logo: saved.logo || "" }));
      notifyLayout();
      setNotice("Đã tải logo mới lên và áp dụng ngay cho công ty.");
    } catch (err) {
      setFormError(err.message || "Không tải được ảnh lên.");
    } finally {
      setUploading(false);
    }
  }

  // Tải ảnh bìa lên từ máy tính — áp dụng ngay như logo (cột cover,
  // migration V12). Xóa bìa thì lưu lại hồ sơ đã lưu với cover trống,
  // giữ nguyên các thay đổi chưa lưu khác trong form.
  async function handleCoverFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingCover(true);
    setFormError("");
    setNotice("");
    try {
      const saved = await uploadCompanyCover(companyId, file);
      onProfileChange(saved);
      setForm((f) => ({ ...f, cover: saved.cover || "" }));
      setNotice("Đã tải ảnh bìa mới lên và áp dụng ngay cho công ty.");
    } catch (err) {
      setFormError(err.message || "Không tải được ảnh bìa lên.");
    } finally {
      setUploadingCover(false);
    }
  }

  async function removeCover() {
    setUploadingCover(true);
    setFormError("");
    setNotice("");
    try {
      const saved = await updateCompanyProfile(companyId, {
        ...initialForm(profile), cover: null,
      });
      onProfileChange(saved);
      setForm((f) => ({ ...f, cover: "" }));
      setNotice("Đã xóa ảnh bìa. Trang hồ sơ quay về nền mặc định.");
    } catch (err) {
      setFormError(err.message || "Không xóa được ảnh bìa.");
    } finally {
      setUploadingCover(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setFormError("");
    setNotice("");
    if (!form.name.trim()) return setFormError("Vui lòng nhập tên công ty.");
    setSaving(true);
    try {
      const saved = await updateCompanyProfile(companyId, {
        ...form,
        name: form.name.trim(),
        legalName: form.legalName || null,
        taxCode: form.taxCode || null,
        website: form.website || null,
        address: form.address || null,
        description: form.description || null,
        logo: form.logo || null,
      });
      onProfileChange(saved);
      notifyLayout();
      setNotice("Đã lưu hồ sơ công ty. Thông tin mới áp dụng ngay trên trang công khai.");
    } catch (err) {
      setFormError(err.message || "Không lưu được hồ sơ công ty.");
    } finally {
      setSaving(false);
    }
  }

  return (
      <form onSubmit={submit}>
        <section className="emp-panel" style={{ paddingTop: 0, overflow: "hidden" }}>
          <div
              className="emp-cover emp-cover--tall"
              style={form.cover && brokenCoverSrc !== form.cover
                  ? { backgroundImage: `linear-gradient(rgba(10, 30, 60, .12), rgba(10, 30, 60, .12)), url(${form.cover})` }
                  : undefined}
          >
            {form.cover && brokenCoverSrc !== form.cover && (
                <img src={form.cover} alt="" style={{ display: "none" }}
                     onError={() => setBrokenCoverSrc(form.cover)} />
            )}
            <input
                ref={coverInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                style={{ display: "none" }}
                onChange={handleCoverFile}
            />
            <div className="emp-cover__actions">
              <button type="button" className="emp-cover__btn" disabled={uploadingCover}
                      onClick={() => coverInputRef.current?.click()}>
                <IconCamera size={16} />
                {uploadingCover ? "Đang tải lên..." : form.cover ? "Thay đổi ảnh bìa" : "Tải ảnh bìa từ máy tính"}
              </button>
              {form.cover && (
                  <button type="button" className="emp-cover__btn" disabled={uploadingCover}
                          onClick={removeCover}>
                    <IconX size={15} /> Xóa ảnh bìa
                  </button>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 18, alignItems: "flex-end", marginTop: -54, flexWrap: "wrap", position: "relative" }}>
            <div className="emp-logo-card">
              {form.logo && brokenLogoSrc !== form.logo
                  ? <img src={form.logo} alt={`Logo ${profile.name}`} onError={() => setBrokenLogoSrc(form.logo)} />
                  : <span style={{ color: "#94a3b8", display: "inline-flex" }}><IconBuilding size={44} /></span>}
            </div>
            <div style={{ flex: 1, minWidth: 230, paddingBottom: 8 }}>
              <h2 className="emp-company-name">
                {profile.name}
                <span className={`emp-badge ${verification.cls}`}>{verification.text}</span>
              </h2>
              <div className="emp-company-meta">
                <span><IconBuilding size={15} /> {profile.industry || "Chưa rõ lĩnh vực"}</span>
                {profile.size && <span><IconUsers size={15} /> {profile.size}</span>}
                {websiteHref && (
                    <span>
                  <a className="emp-link" href={websiteHref} target="_blank" rel="noreferrer">
                    {form.website}
                  </a>
                </span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                style={{ display: "none" }}
                onChange={handleLogoFile}
            />
            <button type="button" className="emp-btn"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}>
              {uploading ? "Đang tải lên..." : "Tải ảnh logo từ máy tính"}
            </button>
            <span className="emp-muted" style={{ fontSize: 12.5 }}>
            PNG / JPG / GIF / WEBP, tối đa 5 MB — áp dụng ngay sau khi tải.
          </span>
          </div>
          {formError && <p className="emp-form-error">{formError}</p>}
          {notice && <p className="emp-success" style={{ marginTop: 12 }}>{notice}</p>}
        </section>

        <div className="emp-company-layout">
          <div>
            <section className="emp-panel" id="thong-tin-co-ban">
              <h3 className="emp-section-bar">Thông tin cơ bản</h3>
              <div className="emp-form-grid">
                <label className="emp-field">
                  <FieldLabel required>Tên công ty</FieldLabel>
                  <input className="emp-input" value={form.name} onChange={(e) => set("name", e.target.value)} />
                </label>
                <label className="emp-field">
                  <FieldLabel>Mã số thuế</FieldLabel>
                  <input className="emp-input" value={form.taxCode} onChange={(e) => set("taxCode", e.target.value)} />
                </label>
                <label className="emp-field">
                  <FieldLabel>Lĩnh vực hoạt động</FieldLabel>
                  <select className="emp-input" value={form.industry} onChange={(e) => set("industry", e.target.value)}>
                    {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                    {form.industry && !INDUSTRIES.includes(form.industry) && (
                        <option value={form.industry}>{form.industry}</option>
                    )}
                  </select>
                </label>
                <label className="emp-field">
                  <FieldLabel>Quy mô công ty</FieldLabel>
                  <select className="emp-input" value={form.size} onChange={(e) => set("size", e.target.value)}>
                    {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                    {form.size && !SIZES.includes(form.size) && (
                        <option value={form.size}>{form.size}</option>
                    )}
                  </select>
                </label>
                <label className="emp-field">
                  <FieldLabel>Website</FieldLabel>
                  <input className="emp-input" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="VD: www.congty.vn" />
                </label>
                <label className="emp-field">
                  <FieldLabel>Tên pháp lý</FieldLabel>
                  <input className="emp-input" value={form.legalName} onChange={(e) => set("legalName", e.target.value)} placeholder="Tên đầy đủ trên giấy phép kinh doanh" />
                </label>
                <label className="emp-field" style={{ gridColumn: "1 / -1" }}>
                  <FieldLabel>Đường dẫn logo (URL)</FieldLabel>
                  <input className="emp-input" value={form.logo} onChange={(e) => set("logo", e.target.value)} placeholder="https://..." />
                </label>
              </div>
            </section>

            <section className="emp-panel">
              <h3 className="emp-section-bar">Giới thiệu công ty</h3>
              <label className="emp-field">
                <FieldLabel>Mô tả ngắn gọn về công ty của bạn</FieldLabel>
                <textarea className="emp-input" rows={7} value={form.description}
                          onChange={(e) => set("description", e.target.value)}
                          placeholder="Lĩnh vực hoạt động, sản phẩm chính, văn hóa làm việc, môi trường và các hoạt động nội bộ nổi bật..." />
              </label>
              <p className="emp-muted" style={{ textAlign: "right", fontSize: 12.5, fontStyle: "italic", margin: "8px 0 0" }}>
                {form.description.length} ký tự
                {form.description.length < 100 ? " — sử dụng tối thiểu 100 ký tự để hồ sơ trông chuyên nghiệp hơn." : ""}
              </p>
            </section>
          </div>

          <div>
            <section className="emp-panel">
              <h3 className="emp-section-bar">Địa chỉ công ty</h3>
              <label className="emp-field" style={{ marginBottom: 13 }}>
                <FieldLabel>Trụ sở chính</FieldLabel>
                <input className="emp-input" value={form.address} onChange={(e) => set("address", e.target.value)}
                       placeholder="VD: Tòa nhà TechTower, 123 Lê Lợi, Quận 1, TP. Hồ Chí Minh" />
              </label>
              {form.address.trim()
                  ? (
                      <iframe
                          className="emp-map-frame"
                          title={`Bản đồ: ${form.address}`}
                          loading="lazy"
                          src={`https://maps.google.com/maps?q=${encodeURIComponent(form.address)}&z=15&output=embed`}
                      />
                  )
                  : (
                      <div className="emp-map-empty">
                        <span><IconPin size={18} /><br />Nhập địa chỉ trụ sở để hiện bản đồ tại đây.</span>
                      </div>
                  )}
              <p className="emp-muted" style={{ fontSize: 12.5, margin: "10px 0 0" }}>
                Bản đồ được tra tự động theo địa chỉ trụ sở bạn nhập ở trên.
              </p>
            </section>

            <div className="emp-dark-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span className="emp-dark-card__label">Độ hoàn thiện hồ sơ</span>
                <span className="emp-dark-card__pct">{profile.completeness}%</span>
              </div>
              <div className="emp-progress">
                <div className="emp-progress__fill" style={{ width: `${profile.completeness}%` }} />
              </div>
              <p>
                {missing.length
                    ? `Chỉ còn một chút nữa! Bổ sung ${missing.join(", ")} để hồ sơ đầy đủ hơn và tăng uy tín thương hiệu.`
                    : "Hồ sơ của bạn đã đầy đủ các thông tin cơ bản. Hãy giữ thông tin luôn mới để ứng viên tin tưởng hơn."}
              </p>
              {missing.length > 0 && (
                  <a className="emp-btn" href="#thong-tin-co-ban">Bổ sung thông tin còn thiếu</a>
              )}
            </div>
          </div>
        </div>

        {formError && <p className="emp-form-error" style={{ marginTop: 14 }}>{formError}</p>}
        {notice && <p className="emp-success" style={{ marginTop: 14 }}>{notice}</p>}
        <div className="emp-savebar">
        <span className="emp-muted" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          <IconInfo size={16} /> Mọi thay đổi sẽ được cập nhật ngay trên trang công cộng sau khi lưu.
        </span>
          <span style={{ flex: 1 }} />
          <button type="button" className="emp-btn" onClick={resetForm} disabled={saving}>
            Hủy bỏ
          </button>
          <button type="submit" className="emp-btn emp-btn--primary" disabled={saving}>
            {saving ? "Đang lưu..." : <><IconCheck size={17} /> Lưu thay đổi</>}
          </button>
        </div>
      </form>
  );
}