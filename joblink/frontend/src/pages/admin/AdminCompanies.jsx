import { useMemo, useState } from "react";
import { AdminPageHeader } from "../../components/admin/AdminLayout.jsx";
import { AdminModal } from "../../components/admin/AdminModal.jsx";
import { IconCheck, IconClose, IconClock } from "../../components/admin/AdminIcons.jsx";
import useAdminData from "../../hooks/useAdminData.js";
import { getAdminCompanies, setAdminCompanyVerification } from "../../services/adminService.js";

// Trạng thái xác thực hồ sơ công ty (companies.verification_status).
// Trạng thái chỉ là nhãn hiển thị cho ứng viên — không khóa chức năng nào
// của nhà tuyển dụng, kể cả khi đang "Chờ xác thực" hay bị "Từ chối".
const STATUS_META = {
    pending: { label: "Chờ xác thực", badge: "admin-badge--amber" },
    verified: { label: "Đã xác thực", badge: "admin-badge--green" },
    rejected: { label: "Đã từ chối", badge: "admin-badge--red" },
};

const STATUS_FILTERS = [
    { value: "all", label: "Tất cả trạng thái" },
    { value: "pending", label: "Chờ xác thực" },
    { value: "verified", label: "Đã xác thực" },
    { value: "rejected", label: "Đã từ chối" },
];

// Nút thao tác theo trạng thái đích, hiện ở cột Thao tác và hộp xác nhận.
const ACTIONS = [
    { target: "verified", label: "Duyệt", icon: IconCheck, className: "admin-btn--primary" },
    { target: "rejected", label: "Từ chối", icon: IconClose, className: "admin-btn--danger-ghost" },
    { target: "pending", label: "Chờ duyệt lại", icon: IconClock, className: "admin-btn--ghost" },
];

// Trang "Quản lý công ty" — duyệt hồ sơ công ty của nhà tuyển dụng:
// danh sách lấy từ database (công ty chờ xác thực xếp đầu), tìm theo tên /
// mã số thuế / email chủ sở hữu, lọc theo trạng thái, bấm Duyệt / Từ chối /
// Chờ duyệt lại là gọi API đổi trạng thái thật.
export default function AdminCompanies() {
    const { data: companies, loading, error, reload } = useAdminData(getAdminCompanies, []);
    const [keyword, setKeyword] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [confirming, setConfirming] = useState(null); // { company, target }
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState("");

    const pendingCount = useMemo(
        () => (companies ? companies.filter((c) => c.verificationStatus === "pending").length : 0),
        [companies],
    );

    const filtered = useMemo(() => {
        if (!companies) return [];
        const kw = keyword.trim().toLowerCase();
        return companies.filter((c) => {
            const matchStatus = statusFilter === "all" || c.verificationStatus === statusFilter;
            const matchKw =
                !kw ||
                (c.name || "").toLowerCase().includes(kw) ||
                (c.legalName || "").toLowerCase().includes(kw) ||
                (c.taxCode || "").toLowerCase().includes(kw) ||
                (c.ownerEmail || "").toLowerCase().includes(kw);
            return matchStatus && matchKw;
        });
    }, [companies, keyword, statusFilter]);

    async function applyVerification() {
        if (!confirming) return;
        setBusy(true);
        setActionError("");
        setNotice("");
        try {
            await setAdminCompanyVerification(confirming.company.id, confirming.target);
            setNotice(
                `Đã chuyển công ty "${confirming.company.name}" sang trạng thái "${STATUS_META[confirming.target].label}".`,
            );
            setConfirming(null);
            await reload();
        } catch (err) {
            setActionError(err.message || "Thao tác thất bại.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <AdminPageHeader
                eyebrow="QUẢN TRỊ HỆ THỐNG"
                title="Quản lý công ty"
                description="Duyệt hồ sơ công ty do nhà tuyển dụng tự tạo. Công ty đang chờ xác thực vẫn đăng tin và dùng tính năng bình thường — trạng thái này chỉ là nhãn hiển thị cho ứng viên."
            />

            {error && <p className="admin-error">{error}</p>}
            {actionError && <p className="admin-error">{actionError}</p>}
            {notice && <p className="admin-success-note">{notice}</p>}

            <div className="admin-card-table">
                <div className="admin-card-table__toolbar">
                    <div className="admin-toolbar">
                        <input
                            className="admin-input"
                            placeholder="Tìm theo tên công ty, mã số thuế hoặc email chủ sở hữu..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            aria-label="Tìm công ty"
                        />
                        <select
                            className="admin-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            aria-label="Lọc theo trạng thái xác thực"
                        >
                            {STATUS_FILTERS.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>
                    {pendingCount > 0 && (
                        <p className="admin-table__muted" style={{ margin: 0 }}>
                            Có {pendingCount} công ty đang chờ xác thực.
                        </p>
                    )}
                </div>

                {loading ? (
                    <p className="admin-loading">Đang tải danh sách công ty...</p>
                ) : (
                    <table className="admin-table">
                        <thead>
                        <tr>
                            <th>Công ty</th>
                            <th>Mã số thuế</th>
                            <th>Lĩnh vực</th>
                            <th>Chủ sở hữu</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filtered.map((c) => {
                            const meta = STATUS_META[c.verificationStatus] || STATUS_META.pending;
                            return (
                                <tr key={c.id}>
                                    <td>
                                        <div className="admin-table__title">{c.name}</div>
                                        {c.legalName && <div className="admin-table__sub">{c.legalName}</div>}
                                        {c.size && <div className="admin-table__sub">Quy mô: {c.size}</div>}
                                    </td>
                                    <td>{c.taxCode || <span className="admin-table__muted">Chưa có</span>}</td>
                                    <td>{c.industry || <span className="admin-table__muted">—</span>}</td>
                                    <td>{c.ownerEmail || <span className="admin-table__muted">—</span>}</td>
                                    <td>
                                        <span className={`admin-badge ${meta.badge}`}>{meta.label}</span>
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                            {ACTIONS.filter((a) => a.target !== c.verificationStatus).map((a) => (
                                                <button
                                                    key={a.target}
                                                    type="button"
                                                    className={`admin-btn ${a.className}`}
                                                    onClick={() => {
                                                        setActionError("");
                                                        setNotice("");
                                                        setConfirming({ company: c, target: a.target });
                                                    }}
                                                >
                                                    <a.icon size={15} /> {a.label}
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={6} className="admin-table__muted">
                                    Không tìm thấy công ty phù hợp.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                )}
            </div>

            {confirming && (
                <AdminModal
                    title="Xác nhận đổi trạng thái"
                    onClose={() => !busy && setConfirming(null)}
                >
                    <p className="admin-confirm-text">
                        Chuyển công ty <strong>{confirming.company.name}</strong> sang trạng thái{" "}
                        <strong>{STATUS_META[confirming.target].label}</strong>?
                        {confirming.target === "rejected" &&
                            " Công ty bị từ chối vẫn đăng nhập và đăng tin bình thường, chỉ mất nhãn xác thực."}
                    </p>
                    <div className="admin-modal__actions">
                        <button
                            type="button"
                            className="admin-btn admin-btn--ghost"
                            onClick={() => setConfirming(null)}
                            disabled={busy}
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            className="admin-btn admin-btn--primary"
                            onClick={applyVerification}
                            disabled={busy}
                        >
                            {busy ? "Đang lưu..." : "Xác nhận"}
                        </button>
                    </div>
                </AdminModal>
            )}
        </>
    );
}