import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { CompanyLogo, formatSalary } from "../../components/JobCard.jsx";
import useSavedJobs from "../../hooks/useSavedJobs.js";
import { getJobDetail, getJobs } from "../../services/jobService.js";
import { applyToJob } from "../../services/applicationService.js";
import {
  IconPin, IconClock, IconCalendar, IconBriefcase, IconUsers,
  IconBookmark, IconShield, IconCheck, IconBuilding,
} from "../../components/employer/EmployerIcons.jsx";
import "../../style/Public.css";

// Chi tiết việc làm theo thiết kế mới. Luồng dữ liệu và ứng
// tuyển giữ nguyên 100% như trang cũ: tải chi tiết qua
// getJobDetail, lưu việc bằng useSavedJobs, ứng tuyển qua
// applyToJob (xác nhận trừ 5 token, hiện số dư + thông báo máy
// chủ trả về). Mục "Quyền lợi" trong thiết kế không có cột dữ
// liệu riêng trong hệ thống nên không hiển thị mục đó.
function formatDate(value) {
  if (!value) return "Không ghi hạn";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function daysLeft(deadline) {
  if (!deadline) return null;
  const end = new Date(`${String(deadline).slice(0, 10)}T23:59:59`);
  const diff = Math.ceil((end.getTime() - Date.now()) / 86400000);
  return diff;
}

function getMapUrl(job) {
  const lat = Number(job.latitude);
  const lon = Number(job.longitude);
  if (job.latitude == null || job.longitude == null ||
      !Number.isFinite(lat) || !Number.isFinite(lon) ||
      Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const box = [
    Math.max(-180, lon - 0.025), Math.max(-90, lat - 0.018),
    Math.min(180, lon + 0.025), Math.min(90, lat + 0.018),
  ].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(box)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lon}`)}`;
}

// Văn bản mô tả/yêu cầu: dòng bắt đầu bằng -, •, * thành gạch
// đầu dòng, còn lại thành đoạn văn.
function RichText({ text }) {
  if (!text) return <p className="detail-text">Nhà tuyển dụng chưa cập nhật.</p>;
  const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const blocks = [];
  let bullets = [];
  const flush = () => {
    if (bullets.length) {
      blocks.push(<ul key={blocks.length}>{bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>);
      bullets = [];
    }
  };
  lines.forEach((line) => {
    if (/^[-•*]\s+/.test(line)) {
      bullets.push(line.replace(/^[-•*]\s+/, ""));
    } else {
      flush();
      blocks.push(<p key={blocks.length}>{line}</p>);
    }
  });
  flush();
  return <div className="detail-text">{blocks}</div>;
}

export default function JobDetailView() {
  const { id } = useParams();
  const location = useLocation();
  const { savedIds, toggleSave, saveError } = useSavedJobs();
  const [job, setJob] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [notice, setNotice] = useState("");
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(null);

  // Đổi sang tin khác thì xóa trạng thái ứng tuyển/thông báo cũ
  // (điều chỉnh khi render thay cho effect, tránh vòng lặp render).
  const [seenId, setSeenId] = useState(id);
  if (seenId !== id) {
    setSeenId(id);
    setApplied(false);
    setTokenBalance(null);
    setJob(null);
    setError("");
    setNotice("");
    setLoading(true);
  }

  const from = location.state?.from;
  const backTo =
    typeof from === "string" &&
    (from === "/discover" || from === "/jobs" || from.startsWith("/jobs?"))
      ? from
      : "/jobs";

  useEffect(() => {
    const controller = new AbortController();
    getJobDetail(id, controller.signal)
      .then((data) => { setJob(data); setError(""); })
      .catch((err) => { if (err.name !== "AbortError") setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, retry]);

  // Việc làm tương tự: cùng ngành hoặc chung kỹ năng, ưu tiên tin
  // được đẩy lên đầu — lấy từ cùng danh sách việc làm công khai.
  useEffect(() => {
    if (!job) return;
    const controller = new AbortController();
    getJobs(controller.signal)
      .then((all) => {
        const mySkills = new Set((job.skills || "").split(",")
          .map((s) => s.trim().toLowerCase()).filter(Boolean));
        const scored = all
          .filter((j) => j.id !== job.id)
          .map((j) => {
            let score = 0;
            if (j.industry && j.industry === job.industry) score += 2;
            (j.skills || "").split(",").map((s) => s.trim().toLowerCase())
              .forEach((s) => { if (s && mySkills.has(s)) score += 1; });
            return { j, score };
          })
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score ||
            Number(b.j.prioritized) - Number(a.j.prioritized) ||
            String(b.j.createdAt || "").localeCompare(String(a.j.createdAt || "")));
        setSimilar(scored.slice(0, 3).map((x) => x.j));
      })
      .catch(() => setSimilar([]));
    return () => controller.abort();
  }, [job]);

  if (loading) return <p className="pub-center" role="status">Đang tải chi tiết…</p>;

  if (error || !job) {
    return (
      <div className="pub-wrap">
        <p style={{ paddingTop: 22 }}>
          <Link to={backTo}>← Quay lại tìm kiếm</Link>
        </p>
        <p role="alert">{error || "Không tìm thấy việc làm."}</p>
        <button type="button" className="detail-save" onClick={() => setRetry((v) => v + 1)}>
          Thử lại
        </button>
      </div>
    );
  }

  const saved = savedIds.includes(job.id);
  const accepting = [true, 1, "1"].includes(job.acceptingApplications);
  const remaining = daysLeft(job.deadline);
  const mapUrl = getMapUrl(job);

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
    } catch (err) {
      setNotice(err.message || "Ứng tuyển thất bại. Vui lòng thử lại.");
    } finally {
      setApplying(false);
    }
  }

  const applyLabel = applying
    ? "Đang ứng tuyển…"
    : applied
      ? "Đã ứng tuyển"
      : !accepting
        ? "Đã ngừng nhận hồ sơ"
        : "Ứng tuyển ngay";

  const skillTags = (job.skills || "").split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <div>
      <nav className="detail-crumb">
        <Link to="/discover">Trang chủ</Link> ›
        <Link to="/jobs">Việc làm</Link> ›
        <span>{job.title}</span>
      </nav>

      <div className="pub-wrap">
        <section className="detail-head">
          <CompanyLogo name={job.companyName} src={job.companyLogo} />
          <div className="detail-head__main">
            <h1>{job.title}</h1>
            <Link className="detail-head__company" to={`/cong-ty/${job.companyId}`}>
              {job.companyName}
            </Link>
            <div className="detail-head__meta">
              <span className="salary">{formatSalary(job)}</span>
              <span><IconPin size={15} /> {job.location || "Chưa cập nhật"}</span>
              <span>
                <IconClock size={15} />
                {remaining == null
                  ? "Không ghi hạn ứng tuyển"
                  : remaining > 0
                    ? `Hết hạn trong ${remaining} ngày`
                    : "Đã hết hạn ứng tuyển"}
              </span>
            </div>
            <div className="detail-head__actions">
              <button
                type="button"
                className="detail-apply"
                disabled={!accepting || applying || applied}
                onClick={handleApply}
              >
                {applyLabel}
              </button>
              <button
                type="button"
                className="detail-save"
                aria-pressed={saved}
                onClick={() => toggleSave(job.id)}
              >
                <IconBookmark size={16} /> {saved ? "Đã lưu" : "Lưu việc làm"}
              </button>
            </div>
          </div>
          <aside className="detail-head__side">
            <div><span>Ngày đăng:</span><strong>{formatDate(job.createdAt)}</strong></div>
            <div><span>Hạn nộp:</span><strong>{formatDate(job.deadline)}</strong></div>
            <div>
              <span>Số lượng tuyển:</span>
              <strong>{job.vacancies ?? "Chưa cập nhật"}</strong>
            </div>
            {job.verificationStatus === "verified" && (
              <div className="detail-verified">
                <IconShield size={19} /> Nhà tuyển dụng xác thực
              </div>
            )}
          </aside>
        </section>
      </div>

      {(notice || saveError) && (
        <div className="detail-notice">
          <p role="status">
            {notice || saveError}
            {tokenBalance != null && <> · Số dư ví hiện tại: {tokenBalance} token.</>}
          </p>
        </div>
      )}

      <div className="pub-wrap">
        <div className="detail-grid">
          <div>
            {skillTags.length > 0 && (
              <section className="detail-card">
                <h2>Kỹ năng yêu cầu</h2>
                <div className="detail-skills">
                  {skillTags.map((s) => <span key={s}>{s}</span>)}
                </div>
              </section>
            )}

            <section className="detail-card">
              <h2><IconBriefcase size={18} /> Mô tả công việc</h2>
              <RichText text={job.description} />
            </section>

            <section className="detail-card">
              <h2><IconCheck size={18} /> Yêu cầu ứng viên</h2>
              <RichText text={job.requirements} />
            </section>

            <section className="detail-card">
              <div className="detail-where">
                <div>
                  <h3><IconPin size={16} /> Địa điểm làm việc</h3>
                  {mapUrl ? (
                    <div className="detail-map">
                      <iframe title="Bản đồ địa điểm làm việc" src={mapUrl} loading="lazy" />
                      <div className="detail-map__addr">
                        <strong>{job.companyName}</strong>
                        <br />{job.companyAddress || job.location || "Chưa cập nhật"}
                      </div>
                    </div>
                  ) : (
                    <p className="detail-text">
                      {job.companyAddress || job.location || "Chưa cập nhật địa chỉ."}
                    </p>
                  )}
                </div>
                <div>
                  <h3><IconClock size={16} /> Thời gian làm việc</h3>
                  <p className="detail-text">
                    {job.workingSchedule || "Theo thỏa thuận với nhà tuyển dụng."}
                    {job.jobType && <><br />Hình thức: {job.jobType}</>}
                  </p>
                </div>
              </div>

              <div className="detail-cta">
                <span className="detail-cta__ic"><IconBriefcase size={21} /></span>
                <div>
                  <strong>Bạn thấy mình phù hợp?</strong>
                  <span>Đừng bỏ lỡ cơ hội làm việc tại {job.companyName}.</span>
                </div>
                <button
                  type="button"
                  className="detail-apply"
                  disabled={!accepting || applying || applied}
                  onClick={handleApply}
                >
                  {applied ? "Đã ứng tuyển" : "Nộp đơn ngay"}
                </button>
              </div>
            </section>
          </div>

          <div>
            <section className="detail-card">
              <h2><IconCheck size={18} /> Thông tin chung</h2>
              <div className="detail-info-rows">
                <div>
                  <span className="ic"><IconCalendar size={17} /></span>
                  <div><small>Kinh nghiệm / Cấp bậc</small><strong>{job.level || "Chưa cập nhật"}</strong></div>
                </div>
                <div>
                  <span className="ic"><IconBriefcase size={17} /></span>
                  <div><small>Hình thức làm việc</small><strong>{job.jobType || "Chưa cập nhật"}</strong></div>
                </div>
                <div>
                  <span className="ic"><IconClock size={17} /></span>
                  <div><small>Lịch làm việc</small><strong>{job.workingSchedule || "Chưa cập nhật"}</strong></div>
                </div>
                <div>
                  <span className="ic"><IconUsers size={17} /></span>
                  <div><small>Số lượng tuyển</small><strong>{job.vacancies ?? "Chưa cập nhật"}</strong></div>
                </div>
              </div>
            </section>

            <section className="detail-card detail-company-card">
              <CompanyLogo name={job.companyName} src={job.companyLogo} />
              <h3>{job.companyName}</h3>
              <div className="tag">{job.industry || "Chưa cập nhật lĩnh vực"}</div>
              <dl>
                <div>
                  <dt><IconBuilding size={14} /></dt>
                  <dd style={{ margin: 0 }}>Quy mô: {job.companySize || "Chưa cập nhật"}</dd>
                </div>
                <div>
                  <dt><IconPin size={14} /></dt>
                  <dd style={{ margin: 0 }}>Địa chỉ: {job.companyAddress || "Chưa cập nhật"}</dd>
                </div>
              </dl>
              <Link className="btn" to={`/cong-ty/${job.companyId}`}>
                Xem trang công ty
              </Link>
            </section>

            <section className="detail-safety">
              <h3><IconShield size={17} /> Quy trình ứng tuyển an toàn</h3>
              <p>
                ViecLamViet cam kết bảo vệ thông tin ứng viên. Hãy báo
                cáo nếu thấy dấu hiệu lừa đảo.
              </p>
            </section>
          </div>
        </div>

        {similar.length > 0 && (
          <section className="home-section">
            <div className="home-section__head">
              <div>
                <h2>Việc làm tương tự</h2>
                <p>Gợi ý những cơ hội nghề nghiệp phù hợp với kỹ năng của bạn</p>
              </div>
              <Link to="/jobs">Xem tất cả</Link>
            </div>
            <div className="similar-grid">
              {similar.map((j) => (
                <article key={j.id} className="home-job">
                  <CompanyLogo name={j.companyName} src={j.companyLogo} />
                  <div className="home-job__body">
                    <Link className="home-job__title" to={`/jobs/${j.id}`}>{j.title}</Link>
                    <div className="home-job__company">{j.companyName}</div>
                    <div className="home-job__meta">
                      <span className="home-job__salary">{formatSalary(j)}</span>
                      <span className="home-job__loc">
                        <IconPin size={14} /> {j.location || "Chưa cập nhật"}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
