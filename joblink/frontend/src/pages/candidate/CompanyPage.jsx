import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { CompanyLogo, formatSalary } from "../../components/JobCard.jsx";
import { getCompanyPage } from "../../services/candidateService.js";
import useSavedJobs from "../../hooks/useSavedJobs.js";
import {
  formatDateTime, formatRelativeTime, initialsOf,
} from "../../components/employer/employerFormat.js";
import {
  IconPin, IconBuilding, IconGlobe, IconShield, IconUsers,
  IconBookmark, IconClock, IconChevronRight, IconArrowRight,
} from "../../components/employer/EmployerIcons.jsx";
import "../../style/Public.css";

// Trang công ty công khai theo thiết kế Visily mới nhất, dữ
// liệu thật từ /api/companies/{id}: hồ sơ công ty, tin đang
// tuyển, điểm và phân bổ đánh giá, nhận xét của ứng viên.
// Các mục trong thiết kế không có dữ kiện trong hệ thống —
// năm thành lập, quốc gia, văn hóa/phúc lợi dựng sẵn, sự
// kiện, số điện thoại/email công ty và giải thưởng "Top
// Employer" — không hiển thị; thẻ xanh ở cột phải thay bằng
// trạng thái xác thực + số vị trí đang mở thật của công ty.
function getMapUrl(lat, lng) {
  const la = Number(lat);
  const lo = Number(lng);
  if (lat == null || lng == null || !Number.isFinite(la) || !Number.isFinite(lo)) return null;
  const box = [
    Math.max(-180, lo - 0.025), Math.max(-90, la - 0.018),
    Math.min(180, lo + 0.025), Math.min(90, la + 0.018),
  ].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(box)}&layer=mapnik&marker=${encodeURIComponent(`${la},${lo}`)}`;
}

function Stars({ value }) {
  const full = Math.round(value);
  return (
      <span className="company-stars" style={{ fontSize: 17 }} aria-label={`${value}/5`}>
      {"★".repeat(full)}{"☆".repeat(Math.max(0, 5 - full))}
    </span>
  );
}

function jobTags(job) {
  const skills = (job.skills || "").split(",").map((s) => s.trim()).filter(Boolean);
  return [job.jobType, job.level, ...skills].filter(Boolean).slice(0, 3);
}

export default function CompanyPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const { savedIds, toggleSave } = useSavedJobs();

  // Đổi công ty thì xóa dữ liệu cũ (điều chỉnh khi render).
  const [seenId, setSeenId] = useState(id);
  if (seenId !== id) {
    setSeenId(id);
    setData(null);
    setError("");
  }

  useEffect(() => {
    let cancelled = false;
    getCompanyPage(id)
        .then((d) => { if (!cancelled) setData(d); })
        .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [id]);

  if (error) {
    return (
        <div className="pub-wrap">
          <p className="pub-center" role="alert">{error}</p>
        </div>
    );
  }
  if (!data) return <p className="pub-center">Đang tải trang công ty…</p>;

  const mapUrl = getMapUrl(data.latitude, data.longitude);
  const mapsLink = data.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.address)}`
      : null;
  const websiteHref = data.website
      ? (data.website.startsWith("http") ? data.website : `https://${data.website}`)
      : null;
  const paragraphs = String(data.description || "")
      .split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const verified = data.verificationStatus === "verified";

  const infoRows = [
    data.industry && { label: "Ngành nghề", value: data.industry },
    data.size && { label: "Quy mô nhân sự", value: data.size },
    data.address && { label: "Địa điểm", value: data.address },
    data.legalName && { label: "Tên pháp lý", value: data.legalName },
    websiteHref && {
      label: "Website",
      value: (
          <a href={websiteHref} target="_blank" rel="noreferrer">
            {data.website} <IconGlobe size={13} />
          </a>
      ),
    },
  ].filter(Boolean);

  return (
      <div className="company-page">
        <div className="company-cover">
          {data.cover && <img src={data.cover} alt="" />}
        </div>

        <div className="company-head">
          <div className="company-head__card">
            <CompanyLogo name={data.name} src={data.logo} />
            <div>
              <h1>
                {data.name}
                {verified && (
                    <span className="company-verified">
                  <IconShield size={13} /> Đã xác thực
                </span>
                )}
              </h1>
              <div className="company-head__meta">
                {data.industry && (
                    <span><IconBuilding size={15} /> {data.industry}</span>
                )}
                {data.size && (
                    <span><IconUsers size={15} /> {data.size}</span>
                )}
                {data.address && (
                    <span><IconPin size={15} /> {data.address}</span>
                )}
                {websiteHref && (
                    <span>
                  <IconGlobe size={15} />
                  <a href={websiteHref} target="_blank" rel="noreferrer">
                    {data.website}
                  </a>
                </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <nav className="company-tabs">
          <a href="#gioi-thieu" className="is-active">Giới thiệu</a>
          <a href="#viec-lam">Việc làm ({data.openJobs.length})</a>
          <a href="#danh-gia">Đánh giá</a>
        </nav>

        <div className="pub-wrap">
          <div className="company-grid">
            <div>
              <section className="co-section" id="gioi-thieu">
                <h2 className="co-h2">Giới thiệu công ty</h2>
                <div className="detail-text">
                  {paragraphs.length
                      ? paragraphs.map((p, i) => <p key={i}>{p}</p>)
                      : <p>Công ty chưa cập nhật phần giới thiệu.</p>}
                </div>
              </section>

              <section className="co-section" id="viec-lam">
                <div className="co-section__head">
                  <h2 className="co-h2">Việc làm đang tuyển</h2>
                  {data.openJobs.length > 0 && (
                      <Link to={`/jobs?q=${encodeURIComponent(data.name)}`}>
                        Xem tất cả {data.openJobs.length} việc làm
                      </Link>
                  )}
                </div>
                {data.openJobs.length === 0 && (
                    <p className="detail-text">Công ty hiện chưa có tin tuyển dụng đang mở.</p>
                )}
                <div className="co-jobs">
                  {data.openJobs.map((job) => (
                      <article key={job.id} className="co-job">
                        {job.highlighted && <span className="home-hot">HOT</span>}
                        <div className="co-job__top">
                          <Link className="co-job__title" to={`/jobs/${job.id}`}>
                            {job.title}
                          </Link>
                          <button
                              type="button"
                              className={`co-job__save${savedIds.includes(job.id) ? " is-saved" : ""}`}
                              onClick={() => toggleSave(job.id)}
                              aria-label={savedIds.includes(job.id) ? "Bỏ lưu việc làm" : "Lưu việc làm"}
                          >
                            <IconBookmark size={16} />
                          </button>
                        </div>
                        <div className="home-job__meta" style={{ marginTop: 8 }}>
                      <span className="home-job__salary">
                        <span className="home-job__dollar">$</span>
                        {formatSalary(job)}
                      </span>
                          <span className="home-job__loc">
                        <IconPin size={14} /> {job.location || "Chưa cập nhật"}
                      </span>
                        </div>
                        <div className="home-job__tags">
                          {jobTags(job).map((t) => <span key={t}>{t}</span>)}
                        </div>
                        <div className="co-job__foot">
                      <span>
                        <IconClock size={13} /> {formatRelativeTime(job.createdAt)}
                      </span>
                          <Link to={`/jobs/${job.id}`}>
                            Ứng tuyển <IconChevronRight size={13} />
                          </Link>
                        </div>
                      </article>
                  ))}
                </div>
              </section>

              <section className="co-section" id="danh-gia">
                <h2 className="co-h2">Đánh giá từ ứng viên</h2>
                <div className="co-panel">
                  {data.reviews.length === 0 && (
                      <p className="detail-text" style={{ padding: "14px 0" }}>
                        Chưa có đánh giá nào cho công ty này.
                      </p>
                  )}
                  {data.reviews.map((r, i) => (
                      <div key={i} className="review-item">
                        <div className="review-item__head">
                          {r.reviewerAvatar
                              ? <img src={r.reviewerAvatar} alt="" />
                              : (
                                  <span className="review-item__ini">
                            {initialsOf(r.reviewerName || "U")}
                          </span>
                              )}
                          <div>
                            <strong>{r.reviewerName}</strong>
                            <small>
                              <Stars value={r.rating} /> · {formatDateTime(r.createdAt)}
                            </small>
                          </div>
                        </div>
                        <p>{r.content}</p>
                        {r.replyContent && (
                            <div className="review-reply">
                              <strong>Phản hồi từ {data.name}</strong>
                              {r.replyContent}
                            </div>
                        )}
                      </div>
                  ))}
                </div>
              </section>
            </div>

            <aside>
              <section className="co-card">
                <h3 className="co-card__title">Thông tin cơ bản</h3>
                <div className="co-card__body">
                  {infoRows.length === 0 && (
                      <p className="detail-text">Công ty chưa cập nhật thông tin.</p>
                  )}
                  {infoRows.map((row) => (
                      <div key={row.label} className="co-info-row">
                        <span>{row.label}</span>
                        <strong>{row.value}</strong>
                      </div>
                  ))}
                </div>
              </section>

              <section className="co-card">
                <h3 className="co-card__title">Địa điểm làm việc</h3>
                {mapUrl ? (
                    <div className="co-map">
                      <iframe title="Bản đồ công ty" src={mapUrl} loading="lazy" />
                    </div>
                ) : (
                    <div className="co-map co-map--empty">
                      <IconPin size={34} />
                    </div>
                )}
                <div className="co-card__body">
                  <strong className="co-map__name">Trụ sở {data.name}</strong>
                  <p className="co-map__addr">{data.address || "Công ty chưa cập nhật địa chỉ."}</p>
                  {mapsLink && (
                      <a className="co-map__link" href={mapsLink} target="_blank" rel="noreferrer">
                        Xem trên Google Maps
                      </a>
                  )}
                </div>
              </section>

              <section className="co-card">
                <h3 className="co-card__title">Xếp hạng công ty</h3>
                <div className="co-card__body">
                  {data.reviewCount > 0 ? (
                      <>
                        <div className="company-rating-big">
                          <strong>{data.averageRating.toLocaleString("vi-VN")}</strong>
                          <div>
                            <Stars value={data.averageRating} />
                            <div className="pub-muted" style={{ fontSize: 12.5 }}>
                              Dựa trên {data.reviewCount} đánh giá
                            </div>
                          </div>
                        </div>
                        <div className="co-dist">
                          {data.ratingDistribution.map((count, i) => {
                            const star = 5 - i;
                            const pct = data.reviewCount
                                ? Math.round((count / data.reviewCount) * 100)
                                : 0;
                            return (
                                <div key={star} className="co-dist__row">
                                  <div className="co-dist__top">
                                    <span>{star} sao</span>
                                    <span>{pct}%</span>
                                  </div>
                                  <span className="bar"><span style={{ width: `${pct}%` }} /></span>
                                </div>
                            );
                          })}
                        </div>
                        <a className="co-btn-outline" href="#danh-gia">
                          Xem tất cả đánh giá <IconChevronRight size={13} />
                        </a>
                      </>
                  ) : (
                      <p className="detail-text">Chưa có đánh giá nào để xếp hạng.</p>
                  )}
                </div>
              </section>

              {(verified || data.openJobs.length > 0) && (
                  <section className="co-award">
                    <span className="co-award__ic"><IconShield size={19} /></span>
                    <h3>{verified ? "Công ty đã xác thực" : "Đang tuyển dụng"}</h3>
                    <p>
                      {data.openJobs.length > 0
                          ? `${data.name} hiện có ${data.openJobs.length} vị trí đang mở. Ứng tuyển ngay để không bỏ lỡ cơ hội.`
                          : "Hồ sơ của công ty đã được hệ thống xác thực thông tin."}
                    </p>
                    {data.openJobs.length > 0 && (
                        <a href="#viec-lam">
                          Xem việc làm <IconArrowRight size={14} />
                        </a>
                    )}
                  </section>
              )}
            </aside>
          </div>

          <section className="home-cta company-cta">
            <div className="home-cta__main">
              <h3>Bạn muốn tham gia đội ngũ {data.name}?</h3>
              <p>
                Chúng tôi luôn tìm kiếm những nhân tài khát khao đổi mới
                và sáng tạo. Hãy gửi hồ sơ ngay để bắt đầu hành trình sự
                nghiệp đầy hứng khởi cùng chúng tôi.
              </p>
            </div>
            <div className="company-cta__actions">
              <a className="home-cta__primary" href="#viec-lam">Xem tất cả việc làm</a>
              <Link className="home-cta__soft" to="/profile">Hồ sơ năng lực</Link>
            </div>
          </section>
        </div>
      </div>
  );
}