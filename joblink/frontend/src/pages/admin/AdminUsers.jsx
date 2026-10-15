import { useMemo, useState } from "react";
import { AdminPageHeader } from "../../components/admin/AdminLayout.jsx";
import { AdminModal, ConfirmDelete, FieldLabel } from "../../components/admin/AdminModal.jsx";
import { IconPlus, IconEdit, IconLock, IconUnlock, IconTrash, IconCheck } from "../../components/admin/AdminIcons.jsx";
import { ROLE_LABELS, initialsOf } from "../../components/admin/adminFormat.js";
import useAdminData from "../../hooks/useAdminData.js";
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  setAdminUserStatus,
  deleteAdminUser,
} from "../../services/adminService.js";

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
                  <td><span className="admin-badge admin-badge--blue">{ROLE_LABELS[u.role] || u.role}</span></td>
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

      {editing !== null && (
        <UserFormModal
          user={editing}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
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
