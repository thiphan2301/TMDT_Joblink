import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import JobCard from "../../components/JobCard";
import useSavedJobs from "../../hooks/useSavedJobs";
import { getJobs } from "../../services/jobService";
import "../../style/JobsPages.css";

const PAGE_SIZE = 8;

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .trim();
}

function CheckboxGroup({ title, values, selected, onChange }) {
  if (!values.length) return null;

  return (
    <fieldset className="jobs-filter-group">
      <legend>{title}</legend>

      {values.map((value) => (
        <label key={value}>
          <input
            type="checkbox"
            checked={selected.includes(value)}
            onChange={() => onChange(value)}
          />
          <span>{value}</span>
        </label>
      ))}
    </fieldset>
  );
}

export default function JobsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [keyword, setKeyword] = useState(params.get("q") || "");

  const { savedIds, toggleSave, saveError } = useSavedJobs();

  const query = params.get("q") || "";
  const location = params.get("location") || "";
  const industry = params.get("industry") || "";
  const levels = params.getAll("level");
  const types = params.getAll("type");
  const schedules = params.getAll("schedule");
  const unit = params.get("unit") || "";
  const sort = params.get("sort") || "priority";
  const view = params.get("view") || "grid";

  const minimum = Math.max(0, Number(params.get("min") || 0) || 0);

  const requestedPage = Math.max(
    1,
    Math.floor(Number(params.get("page")) || 1)
  );

  useEffect(() => {
    setKeyword(query);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError("");

    getJobs(controller.signal)
      .then(setJobs)
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [retry]);

  function options(field) {
    return [...new Set(jobs.map((job) => job[field]).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "vi"));
  }

  function changeFilter(key, value) {
    const next = new URLSearchParams(params);

    if (value) next.set(key, value);
    else next.delete(key);

    if (key !== "page") next.delete("page");

    // Không giữ ngưỡng lương khi đổi đơn vị.
    if (key === "unit") next.delete("min");

    setParams(next, { replace: true });
  }

  function toggleFilter(key, value) {
    const next = new URLSearchParams(params);
    const current = next.getAll(key);
    const values = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];

    next.delete(key);
    values.forEach((item) => next.append(key, item));
    next.delete("page");
    setParams(next, { replace: true });
  }

  const filtered = jobs
    .filter((job) => {
      const text = normalize(
        `${job.title} ${job.companyName} ${job.skills || ""}`
      );

      return (
        (!query || text.includes(normalize(query))) &&
        (!location || job.location === location) &&
        (!industry || job.industry === industry) &&
        (!levels.length || levels.includes(job.level)) &&
        (!types.length || types.includes(job.jobType)) &&
        (!schedules.length || schedules.includes(job.workingSchedule)) &&
        (!unit || job.salaryUnit === unit) &&
        (
          !unit ||
          minimum === 0 ||
          (
            job.salaryMin != null &&
            Number(job.salaryMin) >= minimum
          )
        )
      );
    })
    .sort((a, b) => {
      // Chỉ so sánh lương khi đã chọn cùng một đơn vị.
      if (sort === "salary" && unit) {
        return Number(b.salaryMax ?? b.salaryMin ?? -1) -
          Number(a.salaryMax ?? a.salaryMin ?? -1);
      }

      if (sort === "priority") {
        const difference = Number(b.prioritized) - Number(a.prioritized);
        if (difference) return difference;
      }

      return String(b.createdAt || "").localeCompare(
        String(a.createdAt || "")
      ) || b.id - a.id;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const visibleJobs = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openDetails(job) {
    navigate(`/jobs/${job.id}`, {
      state: { from: `/jobs?${params.toString()}` },
    });
  }

  return (
    <div className="jobs-page">
      <Link className="jobs-back" to="/discover">
        ← Khám phá việc làm
      </Link>

      <h1>Tìm công việc phù hợp với bạn</h1>
      <p className="jobs-muted">
        Cơ hội mới mỗi ngày, từ những doanh nghiệp đang tuyển dụng.
      </p>

      <form
        className="jobs-search"
        onSubmit={(event) => {
          event.preventDefault();
          changeFilter("q", keyword.trim());
        }}
      >
        <input
          aria-label="Từ khóa tìm kiếm"
          placeholder="Vị trí, kỹ năng hoặc tên công ty"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />

        <select
          aria-label="Địa điểm"
          value={location}
          onChange={(event) => changeFilter("location", event.target.value)}
        >
          <option value="">Tất cả địa điểm</option>
          {options("location").map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>

        <button className="jobs-primary" type="submit">
          Tìm việc ngay
        </button>
      </form>

      <div className="jobs-layout">
        <aside className="jobs-filters">
          <div className="jobs-filter-heading">
            <h2>Bộ lọc</h2>
            <button
              type="button"
              onClick={() => {
                setKeyword("");
                setParams({});
              }}
            >
              Xóa tất cả
            </button>
          </div>

          <label className="jobs-filter-select">
            Lĩnh vực doanh nghiệp
            <select
              value={industry}
              onChange={(event) => changeFilter("industry", event.target.value)}
            >
              <option value="">Tất cả</option>
              {options("industry").map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>

          <CheckboxGroup
            title="Cấp bậc"
            values={options("level")}
            selected={levels}
            onChange={(value) => toggleFilter("level", value)}
          />

          <CheckboxGroup
            title="Loại việc làm"
            values={options("jobType")}
            selected={types}
            onChange={(value) => toggleFilter("type", value)}
          />

          <CheckboxGroup
            title="Lịch làm việc"
            values={options("workingSchedule")}
            selected={schedules}
            onChange={(value) => toggleFilter("schedule", value)}
          />

          <label className="jobs-filter-select">
            Đơn vị lương
            <select
              value={unit}
              onChange={(event) => changeFilter("unit", event.target.value)}
            >
              <option value="">Tất cả</option>
              <option value="month">Theo tháng</option>
              <option value="hour">Theo giờ</option>
              <option value="project">Theo dự án</option>
            </select>
          </label>

          <label className="jobs-filter-select">
            Lương khởi điểm tối thiểu (VNĐ)
            <input
              type="number"
              min="0"
              step="1000"
              disabled={!unit}
              value={params.get("min") || ""}
              placeholder="Ví dụ: 10000000"
              onChange={(event) => changeFilter("min", event.target.value)}
            />
          </label>

          <small className="jobs-muted">
            Chọn đơn vị trước khi lọc lương. Tin không công bố lương khởi điểm
            sẽ bị loại khi đặt ngưỡng lớn hơn 0.
          </small>
        </aside>

        <section className="jobs-results">
          <div className="jobs-toolbar">
            <span><strong>{filtered.length} việc làm</strong> phù hợp</span>

            <div>
              <select
                aria-label="Sắp xếp"
                value={sort === "salary" && !unit ? "priority" : sort}
                onChange={(event) => changeFilter("sort", event.target.value)}
              >
                <option value="priority">Ưu tiên hiển thị</option>
                <option value="newest">Mới nhất</option>
                {unit && <option value="salary">Lương cao nhất</option>}
              </select>

              <button
                type="button"
                aria-pressed={view === "grid"}
                onClick={() => changeFilter("view", "grid")}
              >
                Lưới
              </button>

              <button
                type="button"
                aria-pressed={view === "list"}
                onClick={() => changeFilter("view", "list")}
              >
                Danh sách
              </button>
            </div>
          </div>

          {saveError && <p role="status">{saveError}</p>}

          {loading ? (
            <p className="jobs-state" role="status">Đang tải việc làm…</p>
          ) : error ? (
            <div className="jobs-state" role="alert">
              <p>{error}</p>
              <button type="button" onClick={() => setRetry((value) => value + 1)}>
                Thử lại
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="jobs-state">
              Chưa có việc làm phù hợp. Bạn thử bỏ bớt bộ lọc nhé.
            </p>
          ) : (
            <>
              <div className={`jobs-cards ${view === "list" ? "jobs-cards--list" : ""}`}>
                {visibleJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    saved={savedIds.includes(job.id)}
                    onSave={toggleSave}
                    onView={openDetails}
                  />
                ))}
              </div>

              <nav className="jobs-pagination" aria-label="Phân trang">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => changeFilter("page", String(page - 1))}
                >
                  ← Trước
                </button>
                <span>Trang {page} / {totalPages}</span>
                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => changeFilter("page", String(page + 1))}
                >
                  Sau →
                </button>
              </nav>
            </>
          )}
        </section>
      </div>
    </div>
  );
}