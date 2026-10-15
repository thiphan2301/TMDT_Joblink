import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Check, Sparkles } from "lucide-react";
import { getMyProfile, updateMyProfile } from "../../services/profileService";
import "../../style/ProfilePage.css";

const SUMMARY_MAX_LENGTH = 2000;

// Ngày sinh muộn nhất được chọn: đủ 15 tuổi (backend cũng kiểm tra).
const MAX_DOB = (() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 15);
    return date.toISOString().slice(0, 10);
})();

const EMPTY_FORM = {
    fullName: "",
    phone: "",
    dob: "",
    address: "",
    summary: "",
    skillsText: "",
    searchable: true,
};

// Chuyển dữ liệu API thành giá trị cho các ô nhập.
function toForm(profile) {
    return {
        fullName: profile.fullName || "",
        phone: profile.phone || "",
        dob: profile.dob || "",
        address: profile.address || "",
        summary: profile.summary || "",
        skillsText: (profile.skills || []).join(", "),
        searchable: profile.searchable !== false,
    };
}

// "Java, React , java" -> ["Java", "React"]
function parseSkills(text) {
    const seen = new Set();

    return text
        .split(",")
        .map((skill) => skill.trim())
        .filter((skill) => {
            const key = skill.toLowerCase();
            if (!skill || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

function getInitials(name) {
    return (name || "?")
        .trim()
        .split(/\s+/)
        .slice(-2)
        .map((word) => word[0])
        .join("")
        .toUpperCase();
}

// Các mục tính độ hoàn thiện hồ sơ
function getChecklist(form, avatar) {
    return [
        { label: "Họ và tên", done: Boolean(form.fullName.trim()) },
        { label: "Số điện thoại", done: Boolean(form.phone.trim()) },
        { label: "Ngày sinh", done: Boolean(form.dob) },
        { label: "Địa chỉ", done: Boolean(form.address.trim()) },
        { label: "Giới thiệu bản thân", done: Boolean(form.summary.trim()) },
        { label: "Kỹ năng chuyên môn", done: parseSkills(form.skillsText).length > 0 },
        { label: "Ảnh đại diện", done: Boolean(avatar) },
    ];
}

export default function ProfilePage({ onProfileUpdated }) {
    const [profile, setProfile] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [retry, setRetry] = useState(0);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState("");
    const [saveError, setSaveError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        getMyProfile(controller.signal)
            .then((data) => {
                setProfile(data);
                setForm(toForm(data));
                setLoadError(null);
            })
            .catch((err) => {
                if (err.name !== "AbortError") setLoadError(err);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [retry]);

    function handleRetry() {
        setLoading(true);
        setLoadError(null);
        setRetry((value) => value + 1);
    }

    function updateField(event) {
        const { name, value, type, checked } = event.target;
        setForm((previous) => ({
            ...previous,
            [name]: type === "checkbox" ? checked : value,
        }));
        setNotice("");
        setSaveError("");
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (saving) return;

        setSaving(true);
        setNotice("");
        setSaveError("");

        try {
            const saved = await updateMyProfile({
                fullName: form.fullName,
                phone: form.phone,
                dob: form.dob || null,
                address: form.address,
                summary: form.summary,
                searchable: form.searchable,
                skills: parseSkills(form.skillsText),
            });

            setProfile(saved);
            setForm(toForm(saved));
            setNotice("Đã lưu thay đổi.");

            if (onProfileUpdated) {
                onProfileUpdated(saved);
            }
        } catch (err) {
            setSaveError(err.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="profile-page" role="status">Đang tải hồ sơ…</div>;
    }

    // Chưa đăng nhập hoặc không phải tài khoản ứng viên
    if (loadError) {
        const needLogin = loadError.status === 401;

        return (
            <div className="profile-page">
                <h1>Hồ sơ của tôi</h1>
                <div className="profile-card profile-message">
                    <p role="alert">
                        {needLogin
                            ? "Bạn cần đăng nhập để xem và cập nhật hồ sơ cá nhân."
                            : loadError.message}
                    </p>
                    {needLogin ? (
                        <Link to="/login" className="profile-primary">
                            Đăng nhập
                        </Link>
                    ) : (
                        <button type="button" className="profile-outline" onClick={handleRetry}>
                            Thử lại
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const changed = JSON.stringify(form) !== JSON.stringify(toForm(profile));
    const skills = parseSkills(form.skillsText);
    const checklist = getChecklist(form, profile.avatar);
    const doneCount = checklist.filter((item) => item.done).length;
    const percent = Math.round((doneCount / checklist.length) * 100);
    const missing = checklist.filter((item) => !item.done);

    return (
        <div className="profile-page">
            <h1>Hồ sơ của tôi</h1>
            <p className="profile-muted">
                Thể hiện thế mạnh của bạn và tạo ấn tượng với nhà tuyển dụng.
            </p>

            <form className="profile-layout" onSubmit={handleSubmit}>
                <section className="profile-card">
                    <div className="profile-card__head">
                        {profile.avatar ? (
                            <img
                                className="profile-avatar"
                                src={profile.avatar}
                                alt=""
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <span className="profile-avatar" aria-hidden="true">
                                {getInitials(form.fullName)}
                            </span>
                        )}
                        <div>
                            <h2>Thông tin cá nhân</h2>
                            <p className="profile-muted">
                                Thông tin rõ ràng giúp kết nối hiệu quả hơn.
                            </p>
                        </div>
                    </div>

                    <div className="profile-grid">
                        <label className="profile-field">
                            <span>
                                Họ và tên <em>*</em>
                            </span>
                            <input
                                name="fullName"
                                value={form.fullName}
                                onChange={updateField}
                                maxLength={255}
                                required
                                placeholder="VD: Nguyễn Minh Anh"
                            />
                        </label>

                        <label className="profile-field">
                            <span>Email</span>
                            <input value={profile.email} disabled readOnly />
                            <small>Email đăng nhập, không thể thay đổi.</small>
                        </label>

                        <label className="profile-field">
                            <span>Số điện thoại</span>
                            <input
                                name="phone"
                                type="tel"
                                value={form.phone}
                                onChange={updateField}
                                maxLength={20}
                                placeholder="VD: 0901234567"
                            />
                        </label>

                        <label className="profile-field">
                            <span>Ngày sinh</span>
                            <input
                                name="dob"
                                type="date"
                                value={form.dob}
                                onChange={updateField}
                                min="1900-01-01"
                                max={MAX_DOB}
                            />
                        </label>

                        <label className="profile-field profile-field--wide">
                            <span>Địa chỉ</span>
                            <input
                                name="address"
                                value={form.address}
                                onChange={updateField}
                                maxLength={500}
                                placeholder="VD: Quận 1, TP. Hồ Chí Minh"
                            />
                        </label>
                    </div>

                    <label className="profile-field">
                        <span>Giới thiệu bản thân</span>
                        <textarea
                            name="summary"
                            value={form.summary}
                            onChange={updateField}
                            maxLength={SUMMARY_MAX_LENGTH}
                            rows={5}
                            placeholder="Kinh nghiệm, thế mạnh và mục tiêu nghề nghiệp của bạn…"
                        />
                        <small className="profile-counter">
                            {form.summary.length}/{SUMMARY_MAX_LENGTH}
                        </small>
                    </label>

                    <label className="profile-field">
                        <span>Kỹ năng chuyên môn</span>
                        <input
                            name="skillsText"
                            value={form.skillsText}
                            onChange={updateField}
                            placeholder="Phân cách các kỹ năng bằng dấu phẩy, VD: Java, React, Figma"
                        />
                    </label>
                    {skills.length > 0 && (
                        <div className="profile-skills">
                            {skills.map((skill) => (
                                <span key={skill.toLowerCase()}>{skill}</span>
                            ))}
                        </div>
                    )}

                    <label className="profile-switch">
                        <input
                            name="searchable"
                            type="checkbox"
                            checked={form.searchable}
                            onChange={updateField}
                        />
                        <span>
                            <strong>Cho phép nhà tuyển dụng tìm thấy hồ sơ</strong>
                            <small>Nhà tuyển dụng có thể tìm và mời bạn ứng tuyển.</small>
                        </span>
                    </label>

                    <div className="profile-actions">
                        <div className="profile-feedback">
                            {notice && <p className="profile-notice" role="status">{notice}</p>}
                            {saveError && <p className="profile-error" role="alert">{saveError}</p>}
                        </div>
                        <button
                            type="submit"
                            className="profile-primary"
                            disabled={saving || !changed}
                        >
                            <Check size={16} />
                            {saving ? "Đang lưu…" : "Lưu thay đổi"}
                        </button>
                    </div>
                </section>

                <aside className="profile-aside">
                    <div className="profile-card">
                        <p className="profile-progress__label">
                            <span>Độ hoàn thiện hồ sơ</span>
                            <strong>{percent}%</strong>
                        </p>
                        <div
                            className="profile-progress"
                            role="progressbar"
                            aria-valuenow={percent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                        >
                            <div style={{ width: `${percent}%` }} />
                        </div>
                        {missing.length > 0 ? (
                            <>
                                <p className="profile-muted">Bổ sung để hồ sơ nổi bật hơn:</p>
                                <ul className="profile-missing">
                                    {missing.map((item) => (
                                        <li key={item.label}>{item.label}</li>
                                    ))}
                                </ul>
                            </>
                        ) : (
                            <p className="profile-muted">Hồ sơ của bạn đã đầy đủ thông tin.</p>
                        )}
                    </div>

                    <div className="profile-tip">
                        <p className="profile-tip__title">
                            <Sparkles size={15} />
                            Một mẹo nhỏ
                        </p>
                        <p>
                            Phần giới thiệu ngắn gọn, tập trung vào kinh nghiệm và thành tựu cụ
                            thể sẽ giúp bạn nổi bật hơn với nhà tuyển dụng.
                        </p>
                    </div>
                </aside>
            </form>
        </div>
    );
}
