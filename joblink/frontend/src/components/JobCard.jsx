import "../style/JobCard.css";

export function formatSalary(job) {
  const min = job.salaryMin == null ? null : Number(job.salaryMin);
  const max = job.salaryMax == null ? null : Number(job.salaryMax);

  const formatMoney = (value) => {
    if (value >= 1000000) {
      return `${new Intl.NumberFormat("vi-VN", {
        maximumFractionDigits: 1,
      }).format(value / 1000000)} triệu`;
    }

    return `${new Intl.NumberFormat("vi-VN").format(value)} đ`;
  };

  if (min == null && max == null) return "Thỏa thuận";

  const unit = {
    hour: "/giờ",
    month: "/tháng",
    project: "/dự án",
  }[job.salaryUnit] || "";

  if (min != null && max != null) {
    return `${formatMoney(min)} – ${formatMoney(max)}${unit}`;
  }

  return min != null
    ? `Từ ${formatMoney(min)}${unit}`
    : `Đến ${formatMoney(max)}${unit}`;
}

export function CompanyLogo({ name = "", src }) {
  return (
    <span className="job-logo">
      <span aria-hidden="true">{name.slice(0, 2).toUpperCase()}</span>

      {src && (
        <img
          key={src}
          src={src}
          alt={`Logo ${name}`}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}
    </span>
  );
}

function formatDeadline(deadline) {
  if (!deadline) return "Không ghi hạn ứng tuyển";

  // Chỉ lấy phần ngày, tránh lệch ngày do múi giờ.
  const [year, month, day] = String(deadline).slice(0, 10).split("-");
  return `Hạn nộp: ${day}/${month}/${year}`;
}

export default function JobCard({ job, saved, onSave, onView }) {
  const highlighted = [true, 1, "1"].includes(job.highlighted);

  return (
    <article className={`job-card ${highlighted ? "job-card--featured" : ""}`}>
      <div className="job-card__top">
        <CompanyLogo name={job.companyName} src={job.companyLogo} />

        <div className="job-card__company">
          <p>{job.companyName}</p>

          {job.verificationStatus === "verified" && (
            <small>✓ Nhà tuyển dụng xác thực</small>
          )}
        </div>

        <button
          type="button"
          className={`job-save ${saved ? "job-save--active" : ""}`}
          onClick={() => onSave(job.id)}
          aria-pressed={saved}
          aria-label={`${saved ? "Bỏ lưu" : "Lưu"} ${job.title}`}
        >
          {saved ? "Đã lưu" : "Lưu"}
        </button>
      </div>

      <button
        type="button"
        className="job-card__title"
        onClick={() => onView(job)} 
      >
        {job.title}
      </button>

      <div className="job-card__info">
        <span>{job.location || "Chưa cập nhật địa điểm"}</span>
        <strong>{formatSalary(job)}</strong>
      </div>

      <div className="job-card__tags">
        {[job.jobType, job.level, job.workingSchedule]
          .filter(Boolean)
          .map((text, index) => <span key={index}>{text}</span>)}
      </div>

      <div className="job-card__bottom">
        <span>{formatDeadline(job.deadline)}</span>
        <button type="button" onClick={() => onView(job)}>
          Xem chi tiết ↗
        </button>
      </div>
    </article>
  );
}