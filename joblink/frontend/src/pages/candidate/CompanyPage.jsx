import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { openCompanyConversation } from "../../services/chatService";
import {
    createCompanyReview,
    deleteCompanyReview,
    getCompanyPage,
    getCompanyReviews,
    getMyCompanyReview,
    updateCompanyReview,
} from "../../services/candidateService";
import "../../style/CompanyPage.css";

const EMPTY_DRAFT = { rating: null, content: "" };
const SENTIMENT_LABELS = {
    positive: "Tích cực",
    neutral: "Trung tính",
    negative: "Tiêu cực",
};

function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(date);
}

function getWebsiteUrl(value) {
    if (!value) return null;
    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch {
        return null;
    }
}

function RatingStars({ rating }) {
    if (rating == null) return <span className="company-review-no-rating">Chưa chấm sao</span>;
    return (
        <span className="company-review-stars" aria-label={`${rating} trên 5 sao`}>
            {"★".repeat(rating)}{"☆".repeat(5 - rating)}
        </span>
    );
}

function SentimentBadge({ sentiment }) {
    if (!sentiment || !SENTIMENT_LABELS[sentiment]) return null;
    return (
        <span className={`company-sentiment-badge company-sentiment-badge--${sentiment}`}>
            {SENTIMENT_LABELS[sentiment]}
        </span>
    );
}

export default function CompanyPage({ currentUser }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [company, setCompany] = useState(null);
    const [myReview, setMyReview] = useState(null);
    const [draft, setDraft] = useState(EMPTY_DRAFT);
    const [editing, setEditing] = useState(false);
    const [loadedCompanyId, setLoadedCompanyId] = useState(null);
    const [busy, setBusy] = useState(false);
    const [chatBusy, setChatBusy] = useState(false);
    const [errorState, setErrorState] = useState(null);
    const [notice, setNotice] = useState("");
    const [reload, setReload] = useState(0);
    const [sentimentFilter, setSentimentFilter] = useState("all");
    const [reviewPageNumber, setReviewPageNumber] = useState(0);
    const [reviewPageData, setReviewPageData] = useState(null);
    const [loadedReviewKey, setLoadedReviewKey] = useState("");

    useEffect(() => {
        let cancelled = false;

        const requests = [
            getCompanyPage(id).then((value) => {
                if (!cancelled) setCompany(value);
            }),
        ];
        if (currentUser?.role === "candidate") {
            requests.push(
                getMyCompanyReview(id).then((value) => {
                    if (!cancelled) {
                        const review = value?.id ? value : null;
                        setMyReview(review);
                        setDraft(review
                            ? { rating: review.rating ?? null, content: review.content ?? "" }
                            : EMPTY_DRAFT);
                    }
                })
            );
        }

        Promise.all(requests)
            .catch((requestError) => {
                if (!cancelled) {
                    setErrorState({
                        id,
                        message: requestError.message || "Không tải được hồ sơ công ty.",
                    });
                }
            })
            .finally(() => {
                if (!cancelled) setLoadedCompanyId(id);
            });

        return () => {
            cancelled = true;
        };
    }, [id, currentUser?.id, currentUser?.role, reload]);

    const reviewKey = `${id}:${sentimentFilter}:${reviewPageNumber}:${reload}`;
    useEffect(() => {
        let cancelled = false;
        getCompanyReviews(id, { sentiment: sentimentFilter, page: reviewPageNumber })
            .then((result) => {
                if (!cancelled) setReviewPageData(result);
            })
            .catch((requestError) => {
                if (!cancelled) {
                    setErrorState({
                        id,
                        message: requestError.message || "Không tải được danh sách nhận xét.",
                    });
                }
            })
            .finally(() => {
                if (!cancelled) setLoadedReviewKey(reviewKey);
            });

        return () => {
            cancelled = true;
        };
    }, [id, sentimentFilter, reviewPageNumber, reload, reviewKey]);

    const loading = loadedCompanyId !== id;
    const error = errorState?.id === id ? errorState.message : "";
    const reviewLoading = loadedReviewKey !== reviewKey;

    async function handleSubmit(event) {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setErrorState(null);
        setNotice("");

        const payload = {
            rating: draft.rating,
            content: draft.content.trim(),
        };

        try {
            const review = myReview && editing
                ? await updateCompanyReview(id, payload)
                : await createCompanyReview(id, payload);
            setMyReview(review);
            setDraft({ rating: review.rating ?? null, content: review.content });
            setEditing(false);
            setNotice("Đánh giá của bạn đã được lưu.");
            setReload((value) => value + 1);
        } catch (requestError) {
            setErrorState({ id, message: requestError.message || "Không thể lưu đánh giá." });
        } finally {
            setBusy(false);
        }
    }

    async function handleDelete() {
        if (busy || !window.confirm("Bạn có chắc muốn xóa đánh giá này không?")) return;
        setBusy(true);
        setErrorState(null);
        setNotice("");
        try {
            await deleteCompanyReview(id);
            setMyReview(null);
            setDraft(EMPTY_DRAFT);
            setEditing(false);
            setNotice("Đánh giá đã được xóa.");
            setReload((value) => value + 1);
        } catch (requestError) {
            setErrorState({ id, message: requestError.message || "Không thể xóa đánh giá." });
        } finally {
            setBusy(false);
        }
    }

    async function handleChat() {
        if (chatBusy) return;
        setChatBusy(true);
        setErrorState(null);
        try {
            const conversation = await openCompanyConversation(id);
            navigate(`/tin-nhan?c=${conversation.id}`);
        } catch (requestError) {
            setErrorState({ id, message: requestError.message || "Không thể mở cuộc trò chuyện." });
        } finally {
            setChatBusy(false);
        }
    }

    function cancelEdit() {
        setDraft(myReview
            ? { rating: myReview.rating ?? null, content: myReview.content ?? "" }
            : EMPTY_DRAFT);
        setEditing(false);
        setErrorState(null);
    }

    if (loading) {
        return <div className="company-page" role="status">Đang tải hồ sơ công ty…</div>;
    }

    if (error && !company) {
        return (
            <div className="company-page">
                <p className="company-alert" role="alert">{error}</p>
                <Link to="/jobs">Quay lại tìm việc</Link>
            </div>
        );
    }

    if (!company) return null;

    const ratings = company.ratingDistribution || [0, 0, 0, 0, 0];
    const ratingTotal = ratings.reduce((sum, count) => sum + count, 0);
    const canReview = currentUser?.role === "candidate";
    const needsLogin = !currentUser;
    const companyWebsite = getWebsiteUrl(company.website);

    return (
        <main className="company-page">
            <Link className="company-back" to="/jobs">← Quay lại tìm việc</Link>

            <section className="company-hero">
                {company.cover && (
                    <img className="company-cover" src={company.cover} alt="" />
                )}
                <div className="company-identity">
                    {company.logo
                        ? <img className="company-logo" src={company.logo} alt="" />
                        : <div className="company-logo company-logo-placeholder" aria-hidden="true">
                            {(company.name || "C").slice(0, 1).toUpperCase()}
                        </div>}
                    <div className="company-identity-copy">
                        <p className="company-eyebrow">{company.industry || "Doanh nghiệp"}</p>
                        <h1>{company.name}</h1>
                        {company.verificationStatus === "verified" && (
                            <span className="company-verified">✓ Đã xác thực</span>
                        )}
                        {company.legalName && company.legalName !== company.name && (
                            <p className="company-legal-name">{company.legalName}</p>
                        )}
                    </div>
                    {companyWebsite && (
                        <a className="company-website" href={companyWebsite} target="_blank" rel="noreferrer">
                            Website công ty
                        </a>
                    )}
                    {canReview && (
                        <button
                            className="company-chat-button"
                            disabled={chatBusy}
                            onClick={handleChat}
                            type="button"
                        >
                            {chatBusy ? "Đang mở…" : "Nhắn tin nhà tuyển dụng"}
                        </button>
                    )}
                    {needsLogin && (
                        <Link className="company-chat-button" to="/login">
                            Đăng nhập để nhắn tin
                        </Link>
                    )}
                </div>
                <div className="company-facts">
                    <div><span>Lĩnh vực</span><strong>{company.industry || "Chưa cập nhật"}</strong></div>
                    <div><span>Quy mô</span><strong>{company.size || "Chưa cập nhật"}</strong></div>
                    <div><span>Địa chỉ</span><strong>{company.address || "Chưa cập nhật"}</strong></div>
                    <div><span>Tin đang tuyển</span><strong>{company.openJobs?.length || 0}</strong></div>
                </div>
                <section className="company-description">
                    <h2>Giới thiệu công ty</h2>
                    <p>{company.description || "Công ty chưa cập nhật phần giới thiệu."}</p>
                </section>
            </section>

            <section className="company-reputation">
                <div className="company-section-heading">
                    <div>
                        <p className="company-eyebrow">Chia sẻ trải nghiệm của bạn</p>
                        <h2>Đánh giá & nhận xét</h2>
                    </div>
                    <div className="company-overall-rating">
                        <strong>{company.reviewCount ? Number(company.averageRating).toFixed(1) : "—"}</strong>
                        <RatingStars rating={company.reviewCount ? Math.round(company.averageRating) : null} />
                        <span>{company.reviewCount || 0} đánh giá</span>
                    </div>
                </div>

                <div className="company-review-layout">
                    <div className="company-rating-breakdown" aria-label="Phân bổ số lượng đánh giá theo sao">
                        {[5, 4, 3, 2, 1].map((stars, index) => {
                            const count = ratings[index] || 0;
                            const percent = ratingTotal ? (count / ratingTotal) * 100 : 0;
                            return (
                                <div className="company-rating-row" key={stars}>
                                    <span>{stars} sao</span>
                                    <div className="company-rating-track">
                                        <span style={{ width: `${percent}%` }} />
                                    </div>
                                    <span>{count}</span>
                                </div>
                            );
                        })}
                        {company.reviewCount > ratingTotal && (
                            <p className="company-review-no-rating">
                                {company.reviewCount - ratingTotal} đánh giá chưa chấm sao
                            </p>
                        )}
                    </div>

                    <div className="company-review-form-wrap">
                        {canReview && (!myReview || editing) && (
                            <form className="company-review-form" onSubmit={handleSubmit}>
                                <h3>{myReview ? "Chỉnh sửa đánh giá" : "Viết đánh giá của bạn"}</h3>
                                <fieldset className="company-star-picker">
                                    <legend>Chấm sao <span>(không bắt buộc)</span></legend>
                                    <div className="company-star-options">
                                        {[1, 2, 3, 4, 5].map((rating) => (
                                            <button
                                                aria-label={`${rating} sao`}
                                                aria-pressed={draft.rating === rating}
                                                className={draft.rating >= rating ? "is-selected" : ""}
                                                key={rating}
                                                onClick={() => setDraft((value) => ({ ...value, rating }))}
                                                type="button"
                                            >
                                                ★
                                            </button>
                                        ))}
                                        <button
                                            aria-pressed={draft.rating == null}
                                            className="company-clear-rating"
                                            onClick={() => setDraft((value) => ({ ...value, rating: null }))}
                                            type="button"
                                        >
                                            Bỏ chọn
                                        </button>
                                    </div>
                                </fieldset>
                                <label className="company-comment-label" htmlFor="company-review-content">
                                    Nhận xét
                                </label>
                                <textarea
                                    id="company-review-content"
                                    maxLength={5000}
                                    onChange={(event) => setDraft((value) => ({
                                        ...value,
                                        content: event.target.value,
                                    }))}
                                    placeholder="Chia sẻ trải nghiệm làm việc hoặc phỏng vấn của bạn…"
                                    required
                                    rows={5}
                                    value={draft.content}
                                />
                                <div className="company-form-footer">
                                    <span>{draft.content.length}/5000</span>
                                    <div>
                                        {editing && (
                                            <button className="company-secondary-button" onClick={cancelEdit} type="button">
                                                Hủy
                                            </button>
                                        )}
                                        <button className="company-primary-button" disabled={busy} type="submit">
                                            {busy ? "Đang lưu…" : myReview ? "Lưu thay đổi" : "Gửi đánh giá"}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}

                        {canReview && myReview && !editing && (
                            <div className="company-own-review">
                                <div className="company-own-review-heading">
                                    <h3>Đánh giá của bạn</h3>
                                    <div className="company-review-labels">
                                        <RatingStars rating={myReview.rating} />
                                        <SentimentBadge sentiment={myReview.sentiment} />
                                    </div>
                                </div>
                                {myReview.status === "hidden" && (
                                    <p className="company-hidden-note">
                                        Đánh giá hiện đang được ẩn và không hiển thị công khai.
                                    </p>
                                )}
                                <p>{myReview.content}</p>
                                <div className="company-own-review-actions">
                                    <button
                                        className="company-secondary-button"
                                        disabled={busy}
                                        onClick={() => setEditing(true)}
                                        type="button"
                                    >
                                        Chỉnh sửa
                                    </button>
                                    <button
                                        className="company-danger-button"
                                        disabled={busy}
                                        onClick={handleDelete}
                                        type="button"
                                    >
                                        Xóa đánh giá
                                    </button>
                                </div>
                            </div>
                        )}

                        {needsLogin && (
                            <div className="company-login-prompt">
                                <p>Đăng nhập bằng tài khoản ứng viên để chia sẻ đánh giá.</p>
                                <Link to="/login">Đăng nhập</Link>
                            </div>
                        )}
                        {currentUser && !canReview && (
                            <p className="company-login-prompt">
                                Chức năng gửi đánh giá chỉ dành cho tài khoản ứng viên.
                            </p>
                        )}
                        {error && <p className="company-alert" role="alert">{error}</p>}
                        {notice && <p className="company-success" role="status">{notice}</p>}
                    </div>
                </div>

                <div className="company-review-list">
                    <div className="company-review-list-heading">
                        <div>
                            <h3>Nhận xét từ ứng viên</h3>
                            <p>Chia sẻ thực tế về môi trường và trải nghiệm làm việc.</p>
                        </div>
                        <label className="company-review-filter">
                            Lọc cảm xúc
                            <select
                                onChange={(event) => {
                                    setSentimentFilter(event.target.value);
                                    setReviewPageNumber(0);
                                }}
                                value={sentimentFilter}
                            >
                                <option value="all">Tất cả cảm xúc</option>
                                <option value="positive">Tích cực</option>
                                <option value="neutral">Trung tính</option>
                                <option value="negative">Tiêu cực</option>
                            </select>
                        </label>
                    </div>
                    {reviewLoading ? (
                        <p className="company-empty-state" role="status">Đang tải nhận xét…</p>
                    ) : reviewPageData?.content?.length ? reviewPageData.content.map((review) => (
                        <article className="company-review-card" key={review.id}>
                            <div className="company-review-card-heading">
                                <div className="company-review-author">
                                    {review.reviewerAvatar
                                        ? <img className="company-review-avatar" src={review.reviewerAvatar} alt="" />
                                        : <span className="company-review-avatar" aria-hidden="true">
                                            {(review.reviewerName || "Ứ").slice(0, 1).toUpperCase()}
                                        </span>}
                                    <div className="company-review-author-info">
                                        <strong>{review.reviewerName || "Ứng viên"}</strong>
                                        <time>{formatDate(review.createdAt)}</time>
                                    </div>
                                </div>
                                <div className="company-review-labels">
                                    <RatingStars rating={review.rating} />
                                    <SentimentBadge sentiment={review.sentiment} />
                                </div>
                            </div>
                            <p className="company-review-content">{review.content}</p>
                            {review.replyContent && (
                                <div className="company-review-reply">
                                    <strong>Phản hồi từ nhà tuyển dụng</strong>
                                    <p>{review.replyContent}</p>
                                </div>
                            )}
                        </article>
                    )) : (
                        <p className="company-empty-state">
                            {sentimentFilter === "all"
                                ? "Chưa có nhận xét công khai nào. Hãy là người đầu tiên chia sẻ trải nghiệm."
                                : `Chưa có nhận xét được phân loại ${SENTIMENT_LABELS[sentimentFilter]?.toLowerCase()}.`}
                        </p>
                    )}
                    {reviewPageData?.totalPages > 1 && (
                        <nav className="company-review-pagination" aria-label="Phân trang nhận xét">
                            <button
                                className="company-secondary-button"
                                disabled={reviewLoading || reviewPageNumber === 0}
                                onClick={() => setReviewPageNumber((value) => value - 1)}
                                type="button"
                            >
                                Trước
                            </button>
                            <span>
                                Trang {reviewPageData.page + 1}/{reviewPageData.totalPages}
                                {" · "}{reviewPageData.totalElements} nhận xét
                            </span>
                            <button
                                className="company-secondary-button"
                                disabled={reviewLoading || reviewPageNumber + 1 >= reviewPageData.totalPages}
                                onClick={() => setReviewPageNumber((value) => value + 1)}
                                type="button"
                            >
                                Sau
                            </button>
                        </nav>
                    )}
                </div>
            </section>

            <section className="company-open-jobs">
                <div className="company-section-heading">
                    <div>
                        <p className="company-eyebrow">Cơ hội nghề nghiệp</p>
                        <h2>Việc làm đang tuyển</h2>
                    </div>
                </div>
                {company.openJobs?.length ? (
                    <div className="company-job-list">
                        {company.openJobs.map((job) => (
                            <article className="company-job-card" key={job.id}>
                                <div>
                                    <Link to={`/jobs/${job.id}`}>{job.title}</Link>
                                    <p>{[job.location, job.level, job.jobType].filter(Boolean).join(" · ") || "Thông tin việc làm"}</p>
                                </div>
                                <Link className="company-job-apply" to={`/jobs/${job.id}`}>Xem chi tiết</Link>
                            </article>
                        ))}
                    </div>
                ) : (
                    <p className="company-empty-state">Hiện công ty chưa có tin tuyển dụng đang mở.</p>
                )}
            </section>
        </main>
    );
}
