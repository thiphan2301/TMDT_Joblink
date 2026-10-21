import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { CompanyLogo, formatSalary } from "../../components/JobCard";
import useSavedJobs from "../../hooks/useSavedJobs";
import { getJobDetail } from "../../services/jobService";
import "../../style/JobsPages.css";
import { applyToJob } from "../../services/applicationService";

function formatDate(value) {
    if (!value) return "Không ghi hạn";
    const [year, month, day] = String(value).slice(0, 10).split("-");
    return `${day}/${month}/${year}`;
}

export default function JobDetailPage() {
    const { id } = useParams();
    const location = useLocation();
    const { savedIds, toggleSave, saveError } = useSavedJobs();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);
    const [notice, setNotice] = useState("");
    const [applying, setApplying] = useState(false);
    const [applied, setApplied] = useState(false);
    const [tokenBalance, setTokenBalance] = useState(null);
    useEffect(() => {
        setApplied(false);
        setTokenBalance(null);
    }, [id]);
    const from = location.state?.from;
    const backTo =
        typeof from === "string" &&
            (from === "/discover" || from === "/jobs" || from.startsWith("/jobs?"))
            ? from
            : "/jobs";

    useEffect(() => {
        const controller = new AbortController();

        setLoading(true);
        setError("");
        setJob(null);
        setNotice("");

        getJobDetail(id, controller.signal)
            .then(setJob)
            .catch((err) => {
                if (err.name !== "AbortError") setError(err.message);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [id, retry]);

    if (loading) {
        return <div className="jobs-page" role="status">Đang tải chi tiết…</div>;
    }

    if (error || !job) {
        return (
            <div className="jobs-page">
                <Link to={backTo}>← Quay lại tìm kiếm</Link>
                <p role="alert">{error || "Không tìm thấy việc làm."}</p>
                <button type="button" onClick={() => setRetry((value) => value + 1)}>
                    Thử lại
                </button>
            </div>
        );
    }

    const saved = savedIds.includes(job.id);
    const accepting = [true, 1, "1"].includes(job.acceptingApplications);

    async function handleApply() {
        if (applying || applied) return;

        const confirmed = window.confirm(
            "Ứng tuyển bằng CV mặc định? Nếu thành công, ví của bạn sẽ bị trừ 5 token."
        );

        if (!confirmed) return;

        setApplying(true);
        setNotice("");

        try {
            const result = await applyToJob(id);

            setApplied(true);
            setTokenBalance(result.balance);
            setNotice(result.message);
        } catch (error) {
            setNotice(error.message || "Ứng tuyển thất bại. Vui lòng thử lại.");
        } finally {
            setApplying(false);
        }
    }

    return (
        <div className="jobs-page">
            <Link className="jobs-back" to={backTo}>← Quay lại tìm kiếm</Link>

            <section className="detail-hero">
                <div className="detail-hero__top">
                    <CompanyLogo name={job.companyName} src={job.companyLogo} />

                    <div className="detail-title">
                        <p>{job.companyName}</p>
                        <h1>{job.title}</h1>

                        <div className="job-card__tags">
                            {[job.jobType, job.level, job.workingSchedule]
                                .filter(Boolean)
                                .map((value, index) => <span key={index}>{value}</span>)}
                        </div>
                    </div>

                    <div className="detail-actions">
                        <button
                            className="jobs-outline"
                            type="button"
                            aria-pressed={saved}
                            onClick={() => toggleSave(job.id)}
                        >
                            {saved ? "Đã lưu" : "Lưu việc"}
                        </button>

                        <button
                            className="jobs-primary"
                            type="button"
                            disabled={!accepting || applying || applied}
                            onClick={handleApply}
                        >
                            {applying
                                ? "Đang ứng tuyển…"
                                : applied
                                    ? "Đã ứng tuyển"
                                    : !accepting
                                        ? "Đã ngừng nhận hồ sơ"
                                        : "Ứng tuyển · 5 token"}
                        </button>
                    </div>
                </div>

                {(notice || saveError) && (
                    <p className="detail-notice" role="status">{notice || saveError}</p>
                )}

                <div className="detail-facts">
                    <div>
                        <span>Mức lương</span>
                        <strong>{formatSalary(job)}</strong>
                    </div>
                    <div>
                        <span>Địa điểm</span>
                        <strong>{job.location || "Chưa cập nhật"}</strong>
                    </div>
                    <div>
                        <span>Hạn ứng tuyển</span>
                        <strong>{formatDate(job.deadline)}</strong>
                    </div>
                </div>
            </section>

            <div className="detail-layout">
                <article className="detail-content">
                    <h2>Mô tả công việc</h2>
                    <p className="detail-text">
                        {job.description || "Nhà tuyển dụng chưa cập nhật."}
                    </p>

                    <h2>Yêu cầu ứng viên</h2>
                    <p className="detail-text">
                        {job.requirements || "Nhà tuyển dụng chưa cập nhật."}
                    </p>

                    {job.skills && (
                        <>
                            <h2>Kỹ năng yêu cầu</h2>
                            <p className="detail-text">{job.skills}</p>
                        </>
                    )}

                    <h2>Thông tin tuyển dụng</h2>
                    <dl className="detail-info">
                        <dt>Số lượng tuyển</dt>
                        <dd>{job.vacancies ?? "Chưa cập nhật"}</dd>
                        <dt>Cấp bậc</dt>
                        <dd>{job.level || "Chưa cập nhật"}</dd>
                        <dt>Loại việc làm</dt>
                        <dd>{job.jobType || "Chưa cập nhật"}</dd>
                        <dt>Lịch làm việc</dt>
                        <dd>{job.workingSchedule || "Chưa cập nhật"}</dd>
                    </dl>
                </article>

                <aside className="detail-company">
                    <CompanyLogo name={job.companyName} src={job.companyLogo} />
                    <h2>{job.companyName}</h2>

                    {job.verificationStatus === "verified" && (
                        <p className="detail-verified">✓ Nhà tuyển dụng xác thực</p>
                    )}

                    <p className="detail-text">
                        {job.companyDescription || "Chưa có giới thiệu doanh nghiệp."}
                    </p>

                    <dl className="detail-info">
                        <dt>Lĩnh vực</dt>
                        <dd>{job.industry || "Chưa cập nhật"}</dd>
                        <dt>Quy mô</dt>
                        <dd>{job.companySize || "Chưa cập nhật"}</dd>
                        <dt>Địa chỉ</dt>
                        <dd>{job.companyAddress || "Chưa cập nhật"}</dd>
                    </dl>
                </aside>
            </div>
        </div>
    );
}