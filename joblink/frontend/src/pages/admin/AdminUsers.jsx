import { useMemo, useState } from "react";
import { AdminPageHeader } from "../../components/admin/AdminLayout.jsx";
import { AdminModal, ConfirmDelete, FieldLabel } from "../../components/admin/AdminModal.jsx";
import { IconPlus, IconEdit, IconLock, IconUnlock, IconTrash, IconCheck, IconKey, IconCrown } from "../../components/admin/AdminIcons.jsx";
import { ROLE_LABELS, initialsOf } from "../../components/admin/adminFormat.js";
import useAdminData from "../../hooks/useAdminData.js";
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  setAdminUserStatus,
  deleteAdminUser,
  changeAdminUserPassword,
  setAdminUserPlan,
} from "../../services/adminService.js";

// 3 cấp gói dịch vụ của nhà tuyển dụng (Basic miễn phí < Pro < Premium).
const PLAN_OPTIONS = [
  { value: "basic", label: "Basic", desc: "Miễn phí — tin đăng thường, không tìm được hồ sơ ứng viên." },
  { value: "pro", label: "Pro", desc: "Tin ưu tiên lên đầu + hiển thị nổi bật, tìm được hồ sơ ứng viên." },
  { value: "premium", label: "Premium", desc: "Mọi quyền của Pro, kèm nhiều Token hơn — cấp cao nhất." },
];

const ROLE_FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "candidate", label: "Ứng viên" },
  { value: "employer", label: "Nhà tuyển dụng" },
  { value: "admin", label: "Quản trị viên" },
];

// Trang "Quản lý người dùng" — đúng bản thiết kế:
// tìm theo tên/email, lọc theo vai trò, bảng người dùng với thao tác
// sửa / khóa-mở khóa / xóa, modal sửa và modal xác nhận xóa.
export default function AdminUsers() {
  const { data: users, loading, error, reload } = useAdminData(getAdminUsers, []);
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editing, setEditing] = useState(null); // null: đóng; {}: thêm mới; user: sửa
  const [deleting, setDeleting] = useState(null);
  const [passwordUser, setPasswordUser] = useState(null); // user đang được đổi mật khẩu
  const [planUser, setPlanUser] = useState(null); // nhà tuyển dụng đang được đổi gói
  const [planTarget, setPlanTarget] = useState("basic"); // gói đang chọn trong hộp thoại đổi gói
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const filtered = useMemo(() => {
    if (!users) return [];
    const kw = keyword.trim().toLowerCase();
    return users.filter((u) => {
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchKw = !kw || u.fullName.toLowerCase().includes(kw) || u.email.toLowerCase().includes(kw);
      return matchRole && matchKw;
    });
  }, [users, keyword, roleFilter]);

  // Mọi thao tác đều gọi API thật rồi nạp lại danh sách từ database.
  // Trả về true nếu thành công để nơi gọi quyết định có đóng modal hay không.
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

  async function handleSave(form) {
    const ok = editing?.id
      ? await run(() => updateAdminUser(editing.id, form))
      : await run(() => createAdminUser(form));
    if (ok) setEditing(null);
  }

  async function handleToggleLock(user) {
    const next = user.status === "locked" ? "active" : "locked";
    await run(() => setAdminUserStatus(user.id, next));
  }

  async function handleDelete() {
    const ok = await run(() => deleteAdminUser(deleting.id));
    if (ok) setDeleting(null);
  }

  // Đổi gói dịch vụ cho nhà tuyển dụng (PATCH /users/{id}/plan).
  async function handleSetPlan() {
    const label = PLAN_OPTIONS.find((o) => o.value === planTarget)?.label || planTarget;
    const ok = await run(() => setAdminUserPlan(planUser.id, planTarget));
    if (ok) {
      setNotice(`Đã chuyển ${planUser.fullName} sang gói ${label}.`);
      setPlanUser(null);
    }
  }

  function openPlanModal(user) {
    setPlanUser(user);
    setPlanTarget(user.plan || "basic");
  }

  return (
    <>
      <AdminPageHeader
        title="Quản lý người dùng"
        description="Quản lý tài khoản, vai trò và quyền truy cập nền tảng."
        action={
          <button type="button" className="admin-btn admin-btn--primary" onClick={() => setEditing({})}>
            <IconPlus size={18} /> Thêm người dùng
          </button>
        }
      />
      {error && <p className="admin-error">{error}</p>}
      {actionError && <p className="admin-error">{actionError}</p>}
      {notice && <p className="admin-success-note">{notice}</p>}

      <div className="admin-card-table">
        <div className="admin-card-table__toolbar">
          <div className="admin-toolbar">
            <input
              className="admin-input"
              placeholder="Tìm theo tên hoặc email..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              aria-label="Tìm theo tên hoặc email"
            />
            <select
              className="admin-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Lọc theo vai trò"
            >
              {ROLE_FILTERS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="admin-loading">Đang tải danh sách người dùng...</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>Người dùng</th><th>Vai trò</th><th>Trạng thái</th><th>Thao tác</th></tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="admin-user-cell">
                      <span className="admin-avatar">{initialsOf(u.fullName)}</span>
                      <div>
                        <div className="admin-table__title">{u.fullName}</div>
                        <div className="admin-table__sub">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="admin-badge admin-badge--blue">{ROLE_LABELS[u.role] || u.role}</span>
                    {u.role === "employer" && (
                      u.plan === "premium"
                        ? <span className="admin-badge admin-badge--blue" style={{ marginLeft: 6 }}>PREMIUM</span>
                        : u.plan === "pro"
                          ? <span className="admin-badge admin-badge--gold" style={{ marginLeft: 6 }}>PRO</span>
                          : <span className="admin-badge admin-badge--gray" style={{ marginLeft: 6 }}>Basic</span>
                    )}
                  </td>
                  <td>
                    {u.status === "locked"
                      ? <span className="admin-badge admin-badge--red">Đã khóa</span>
                      : <span className="admin-badge admin-badge--green">Đang hoạt động</span>}
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button type="button" className="admin-icon-btn" onClick={() => setEditing(u)} aria-label={`Sửa ${u.fullName}`} disabled={busy}>
                        <IconEdit size={18} />
                      </button>
                      <button type="button" className="admin-icon-btn" onClick={() => setPasswordUser(u)} aria-label={`Đổi mật khẩu ${u.fullName}`} disabled={busy}>
                        <IconKey size={18} />
                      </button>
                      {u.role === "employer" && (
                        <button type="button" className="admin-icon-btn" onClick={() => openPlanModal(u)} aria-label={`Đổi gói dịch vụ cho ${u.fullName}`} disabled={busy}>
                          <IconCrown size={18} />
                        </button>
                      )}
                      <button
                        type="button" className="admin-icon-btn"
                        onClick={() => handleToggleLock(u)}
                        aria-label={u.status === "locked" ? `Mở khóa ${u.fullName}` : `Khóa ${u.fullName}`}
                        disabled={busy}
                      >
                        {u.status === "locked" ? <IconUnlock size={18} /> : <IconLock size={18} />}
                      </button>
                      <button type="button" className="admin-icon-btn" onClick={() => setDeleting(u)} aria-label={`Xóa ${u.fullName}`} disabled={busy}>
                        <IconTrash size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="admin-table__muted">Không tìm thấy người dùng phù hợp.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {passwordUser && (
        <ChangePasswordModal
          user={passwordUser}
          onClose={() => setPasswordUser(null)}
          onDone={() => {
            setNotice(`Đã đổi mật khẩu cho tài khoản ${passwordUser.email}.`);
            setPasswordUser(null);
          }}
        />
      )}

      {editing !== null && (
        <UserFormModal
          user={editing}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

      {planUser && (
        <AdminModal title="Đổi gói dịch vụ" onClose={() => setPlanUser(null)}>
          <p style={{ margin: "0 0 14px", lineHeight: 1.6 }}>
            Chọn gói cho nhà tuyển dụng <strong>{planUser.fullName}</strong>. Gói trả phí
            được ghi nhận bằng một đơn hàng 0đ (admin cấp tay) nên không tính vào doanh thu;
            chuyển xuống Basic sẽ hủy gói trả phí đang hiệu lực và tắt ưu tiên tin đăng.
          </p>
          <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
            {PLAN_OPTIONS.map((o) => (
              <label
                key={o.value}
                style={{
                  display: "flex", gap: 10, alignItems: "flex-start",
                  border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px",
                  cursor: "pointer",
                  background: planTarget === o.value ? "#f5f9ff" : "#fff",
                }}
              >
                <input
                  type="radio" name="plan-target" value={o.value}
                  checked={planTarget === o.value}
                  onChange={() => setPlanTarget(o.value)}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <strong>{o.label}</strong>
                  {planUser.plan === o.value && (
                    <span className="admin-badge admin-badge--gray" style={{ marginLeft: 8 }}>Đang dùng</span>
                  )}
                  <span style={{ display: "block", color: "#64748b", fontSize: 13, marginTop: 2 }}>{o.desc}</span>
                </span>
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="admin-btn" onClick={() => setPlanUser(null)} disabled={busy}>
              Hủy
            </button>
            <button
              type="button" className="admin-btn admin-btn--primary" onClick={handleSetPlan}
              disabled={busy || planTarget === (planUser.plan || "basic")}
            >
              {busy ? "Đang xử lý..." : "Lưu gói"}
            </button>
          </div>
        </AdminModal>
      )}

      {deleting && (
        <ConfirmDelete
          title="Xóa tài khoản người dùng?"
          message={<>Tài khoản <strong>{deleting.fullName}</strong> sẽ bị xóa khỏi hệ thống. Thao tác không thể hoàn tác.</>}
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}

function UserFormModal({ user, busy, onClose, onSave }) {
  const isNew = !user.id;
  const [form, setForm] = useState({
    fullName: user.fullName || "",
    email: user.email || "",
    role: user.role || "candidate",
    password: "",
  });
  const [formError, setFormError] = useState("");

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e) {
    e.preventDefault();
    if (!form.fullName.trim()) return setFormError("Vui lòng nhập họ và tên.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setFormError("Email chưa đúng định dạng.");
    if (isNew && form.password && form.password.length < 6) return setFormError("Mật khẩu cần ít nhất 6 ký tự.");
    const payload = { fullName: form.fullName.trim(), email: form.email.trim(), role: form.role };
    if (isNew) payload.password = form.password || "123456";
    onSave(payload);
  }

  return (
    <AdminModal title={isNew ? "Thêm người dùng" : "Chỉnh sửa người dùng"} onClose={onClose}>
      <form className="admin-form" onSubmit={submit}>
        <label className="admin-field">
          <FieldLabel required>Họ và tên</FieldLabel>
          <input className="admin-input" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
        </label>
        <label className="admin-field">
          <FieldLabel required>Email</FieldLabel>
          <input className="admin-input" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </label>
        <label className="admin-field">
          <FieldLabel>Vai trò</FieldLabel>
          <select className="admin-select" value={form.role} onChange={(e) => set("role", e.target.value)}>
            <option value="candidate">Ứng viên</option>
            <option value="employer">Nhà tuyển dụng</option>
            <option value="admin">Quản trị viên</option>
          </select>
        </label>
        {isNew && (
          <label className="admin-field">
            <FieldLabel>Mật khẩu (để trống = 123456)</FieldLabel>
            <input className="admin-input" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} />
          </label>
        )}
        {formError && <p className="admin-form-error">{formError}</p>}
        <button type="submit" className="admin-btn admin-btn--primary" style={{ justifyContent: "center" }} disabled={busy}>
          {busy ? "Đang lưu..." : <>Lưu thông tin <IconCheck size={18} /></>}
        </button>
      </form>
    </AdminModal>
  );
}

// Modal admin đặt lại mật khẩu cho một tài khoản: nhập mật khẩu mới 2 lần,
// gửi PATCH /api/admin/users/{id}/password (backend băm BCrypt rồi lưu).
function ChangePasswordModal({ user, onClose, onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (password.length < 6) return setFormError("Mật khẩu mới cần ít nhất 6 ký tự.");
    if (password !== confirm) return setFormError("Mật khẩu nhập lại chưa khớp.");
    setSaving(true);
    setFormError("");
    try {
      await changeAdminUserPassword(user.id, password);
      onDone();
    } catch (err) {
      setFormError(err.message || "Không đổi được mật khẩu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminModal title={`Đổi mật khẩu — ${user.fullName}`} onClose={onClose}>
      <form className="admin-form" onSubmit={submit}>
        <p className="admin-table__muted" style={{ margin: 0 }}>
          Đặt mật khẩu mới cho tài khoản <strong>{user.email}</strong>. Mật khẩu cũ
          không cần nhập và sẽ bị thay thế ngay khi lưu.
        </p>
        <label className="admin-field">
          <FieldLabel required>Mật khẩu mới</FieldLabel>
          <input className="admin-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </label>
        <label className="admin-field">
          <FieldLabel required>Nhập lại mật khẩu mới</FieldLabel>
          <input className="admin-input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </label>
        {formError && <p className="admin-form-error">{formError}</p>}
        <button type="submit" className="admin-btn admin-btn--primary" style={{ justifyContent: "center" }} disabled={saving}>
          {saving ? "Đang lưu..." : <>Lưu mật khẩu <IconKey size={18} /></>}
        </button>
      </form>
    </AdminModal>
  );
}
