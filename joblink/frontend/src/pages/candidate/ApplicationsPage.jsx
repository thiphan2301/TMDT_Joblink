import { useEffect, useState } from "react";
import { Link } from "react-router";
import { CalendarClock, ChevronDown, FileText, MapPin } from "lucide-react";
import { CompanyLogo, formatSalary } from "../../components/JobCard";
import { getMyApplications } from "../../services/applicationService";
import "../../style/ApplicationsPage.css";

// Trạng thái đơn trong database -> nhãn, màu và lời nhắn cho ứng viên
const STATUS = {
    pending: {
        label: "Đang chờ",
        tone: "blue",
        message: "Hồ sơ đã được gửi, đang chờ nhà tuyển dụng xem xét.",
    },
    viewed: {
        label: "Đã xem hồ sơ",
        tone: "blue",
        message: "Nhà tuyển dụng đã xem hồ sơ của bạn. Kết quả sẽ được cập nhật tại đây.",
    },
    invited: {
        label: "Mời phỏng vấn",
        tone: "green",
        message: "Chúc mừng! Nhà tuyển dụng mời bạn tham gia phỏng vấn.",
    },
    rejected: {
        label: "Bị từ chối",
        tone: "red",
        message:
            "Rất tiếc, hồ sơ của bạn chưa phù hợp với vị trí này. Đừng nản lòng, còn nhiều cơ hội khác đang chờ bạn.",
    },
    hired: {
        label: "Trúng tuyển",
        tone: "green",
        message: "Chúc mừng! Bạn đã trúng tuyển vị trí này.",
    },
};

const FILTERS = [
    { id: "all", label: "Tất cả", match: () => true },
    { id: "waiting", label: "Đang chờ", match: (status) => status === "pending" || status === "viewed" },
    { id: "invited", label: "Phỏng vấn", match: (status) => status === "invited" },
    { id: "rejected", label: "Từ chối", match: (status) => status === "rejected" },
    { id: "hired", label: "Trúng tuyển", match: (status) => status === "hired", hideWhenEmpty: true },
];

const INTERVIEW_STATUS = {
    pending: "Chờ phản hồi",
    accepted: "Đã xác nhận tham gia",
    declined: "Đã từ chối lịch",
};

// Nội dung thông báo cập nhật mới theo trạng thái
const UPDATE_TEXT = {
    viewed: "hồ sơ đã được xem",
    invited: "lời mời phỏng vấn",
    rejected: "hồ sơ bị từ chối",
    hired: "thông báo trúng tuyển",
};

function pad(value) {
    return String(value).padStart(2, "0");
}

// "2026-10-18T09:30:00" (giờ Việt Nam từ backend) -> "18/10/2026"
function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    return `${pad(date.getHours())}:${pad(date.getMinutes())}, ${formatDate(value)}`;
}

// Lần đổi trạng thái gần nhất do nhà tuyển dụng thực hiện (bỏ qua lúc nộp hồ sơ)
function lastUpdateAt(application) {
    const changes = (application.history || []).filter((item) => item.toStatus !== "pending");
    return changes.length ? changes[changes.length - 1].changedAt : null;
}

// Lưu mốc "đã xem cập nhật" theo từng tài khoản trên trình duyệt này
function seenKey(userId) {
    return `joblink-applications-seen-${userId}`;
}

function readSeen(userId) {
    try {
        return localStorage.getItem(seenKey(userId));
    } catch {
        return null;
    }
}

function writeSeen(userId, applications) {
    const latest = applications
        .map(lastUpdateAt)
        .filter(Boolean)
        .sort((a, b) => new Date(b) - new Date(a))[0];

    if (!latest) return;

    try {
        localStorage.setItem(seenKey(userId), latest);
    } catch {
        // Trình duyệt chặn localStorage: chỉ mất dấu "Mới", trang vẫn hoạt động
    }
}

// Đơn có cập nhật sau mốc đã xem lần trước
function findNewIds(applications, seenAt) {
    return applications
        .filter((application) => {
            const updatedAt = lastUpdateAt(application);
            return updatedAt && (!seenAt || new Date(updatedAt) > new Date(seenAt));
        })
        .map((application) => application.id);
}

function StatusBadge({ status }) {
    const info = STATUS[status] || { label: status, tone: "blue" };
    return <span className={`application-status application-status--${info.tone}`}>{info.label}</span>;
}

function ApplicationDetail({ application }) {
    const info = STATUS[application.status] || STATUS.pending;
    const interview = application.interview;
    const changes = (application.history || []).filter((item) => item.toStatus !== "pending");

    return (
        <div className="application-detail">
            <p className={`application-message application-message--${info.tone}`}>{info.message}</p>

            {interview && application.status === "invited" && (
                <div className="application-interview">
                    <h3>Lịch phỏng vấn</h3>
                    <p>
                        <CalendarClock size={16} />
                        {interview.scheduledAt
                            ? formatDateTime(interview.scheduledAt)
                            : "Nhà tuyển dụng sẽ liên hệ để chốt thời gian"}
                    </p>
                    {interview.location && (
                        <p>
                            <MapPin size={16} />
                            {interview.location}
                        </p>
                    )}
                    {interview.notes && <p className="application-interview__notes">{interview.notes}</p>}
                    <span className="application-interview__status">
                        {INTERVIEW_STATUS[interview.status] || interview.status}
                    </span>
                </div>
            )}

            {application.status === "rejected" && (
                <Link to="/jobs" className="application-link">
                    Khám phá việc làm khác →
                </Link>
            )}

            <h3 className="application-detail__title">Tiến trình hồ sơ</h3>
            <ol className="application-timeline">
                <li>
                    <strong>Đã nộp hồ sơ</strong>
                    <span>{formatDateTime(application.appliedAt)}</span>
                    {application.cvFileName && (
                        <small>
                            <FileText size={13} />
                            {application.cvFileName}
                        </small>
                    )}
                </li>
                {changes.map((change, index) => (
                    <li key={`${change.toStatus}-${index}`} className={`is-${STATUS[change.toStatus]?.tone || "blue"}`}>
                        <strong>{STATUS[change.toStatus]?.label || change.toStatus}</strong>
                        <span>{formatDateTime(change.changedAt)}</span>
                        {change.note && <small>{change.note}</small>}
                    </li>
                ))}
            </ol>
        </div>
    );
}

export default function ApplicationsPage({ userId }) {
    const [applications, setApplications] = useState([]);
    const [newIds, setNewIds] = useState([]);
    const [expandedIds, setExpandedIds] = useState([]);
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        const controller = new AbortController();

        getMyApplications(controller.signal)
            .then((data) => {
                // So với mốc đã xem lần trước rồi mới lưu mốc mới
                const freshIds = userId ? findNewIds(data, readSeen(userId)) : [];
                if (userId) writeSeen(userId, data);

                setApplications(data);
                setNewIds(freshIds);
                setExpandedIds(freshIds);
                setError(null);
            })
            .catch((err) => {
                if (err.name !== "AbortError") setError(err);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [retry, userId]);

    function handleRetry() {
        setLoading(true);
        setError(null);
        setRetry((value) => value + 1);
    }

    function toggle(id) {
        setExpandedIds((previous) =>
            previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id]
        );
    }

    if (loading) {
        return <div className="applications-page" role="status">Đang tải việc đã ứng tuyển…</div>;
    }

    if (error) {
        const needLogin = error.status === 401;

        return (
            <div className="applications-page">
                <h1>Việc đã ứng tuyển</h1>
                <div className="applications-card applications-message">
                    <p role="alert">
                        {needLogin ? "Bạn cần đăng nhập để xem các công việc đã ứng tuyển." : error.message}
                    </p>
                    {needLogin ? (
                        <Link to="/login" className="applications-primary">Đăng nhập</Link>
                    ) : (
                        <button type="button" className="applications-outline" onClick={handleRetry}>
                            Thử lại
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const activeFilter = FILTERS.find((item) => item.id === filter) || FILTERS[0];
    const visible = applications.filter((application) => activeFilter.match(application.status));
    const newUpdates = applications.filter((application) => newIds.includes(application.id));
    const updateSummary = Object.entries(UPDATE_TEXT)
        .map(([status, text]) => {
            const count = newUpdates.filter((application) => application.status === status).length;
            return count ? `${count} ${text}` : null;
        })
        .filter(Boolean)
        .join(", ");

    return (
        <div className="applications-page">
            <h1>Việc đã ứng tuyển</h1>
            <p className="applications-muted">Theo dõi từng bước trên hành trình sự nghiệp của bạn.</p>

            {newUpdates.length > 0 && (
                <div className="applications-banner" role="status">
                    <strong>Bạn có {newUpdates.length} cập nhật mới</strong>
                    {updateSummary && <span>{updateSummary}</span>}
                </div>
            )}

            <div className="applications-tabs" role="tablist" aria-label="Lọc theo trạng thái">
                {FILTERS.map((item) => {
                    const count = applications.filter((application) => item.match(application.status)).length;
                    if (item.hideWhenEmpty && count === 0) return null;

                    return (
                        <button
                            key={item.id}
                            type="button"
                            role="tab"
                            aria-selected={filter === item.id}
                            className={filter === item.id ? "is-active" : ""}
                            onClick={() => setFilter(item.id)}
                        >
                            {item.label} ({count})
                        </button>
                    );
                })}
            </div>

            {applications.length === 0 ? (
                <div className="applications-card applications-empty">
                    <h2>Bạn chưa ứng tuyển công việc nào</h2>
                    <p className="applications-muted">Khám phá các cơ hội phù hợp và gửi hồ sơ ngay hôm nay.</p>
                    <Link to="/jobs" className="applications-primary">Khám phá việc làm</Link>
                </div>
            ) : (
                <div className="applications-card applications-list">
                    <div className="applications-list__head" aria-hidden="true">
                        <span>Công việc</span>
                        <span>Ngày ứng tuyển</span>
                        <span>Trạng thái</span>
                        <span />
                    </div>

                    {visible.map((application) => {
                        const expanded = expandedIds.includes(application.id);
                        const isNew = newIds.includes(application.id);

                        return (
                            <article
                                key={application.id}
                                className={`application-row ${isNew ? "application-row--new" : ""}`}
                            >
                                <div className="application-row__job">
                                    <CompanyLogo name={application.companyName} src={application.companyLogo} />
                                    <div>
                                        <Link to={`/jobs/${application.jobId}`} className="application-row__title">
                                            {application.jobTitle}
                                        </Link>
                                        <p>
                                            {application.companyName}
                                            {application.jobLocation && ` · ${application.jobLocation}`}
                                            {" · "}
                                            {formatSalary(application)}
                                        </p>
                                    </div>
                                </div>

                                <div className="application-row__date">
                                    <span className="application-row__label">Ngày ứng tuyển</span>
                                    {formatDate(application.appliedAt)}
                                </div>

                                <div className="application-row__status">
                                    <StatusBadge status={application.status} />
                                    {isNew && <span className="application-new">Mới</span>}
                                </div>

                                <button
                                    type="button"
                                    className="application-toggle"
                                    aria-expanded={expanded}
                                    onClick={() => toggle(application.id)}
                                >
                                    {expanded ? "Thu gọn" : "Chi tiết"}
                                    <ChevronDown size={16} className={expanded ? "is-open" : ""} />
                                </button>

                                {expanded && <ApplicationDetail application={application} />}
                            </article>
                        );
                    })}

                    {visible.length === 0 && (
                        <p className="applications-muted applications-list__empty">
                            Chưa có hồ sơ ở trạng thái này.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
