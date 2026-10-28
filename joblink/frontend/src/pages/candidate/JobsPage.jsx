import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import JobCard from "../../components/JobCard";
import useSavedJobs from "../../hooks/useSavedJobs";
import { getJobs } from "../../services/jobService";
import "../../style/JobsPages.css";

const PAGE_SIZE = 8;

// Các kiểu sắp xếp (giá trị lưu trên URL ?sort=...).
const SORT_OPTIONS = [
  { value: "priority", label: "Ưu tiên hiển thị" },
  { value: "newest", label: "Mới nhất" },
  { value: "salary_desc", label: "Lương: cao đến thấp" },
  { value: "salary_asc", label: "Lương: thấp đến cao" },
  { value: "popular", label: "Nhiều người ứng tuyển nhất" },
  { value: "deadline", label: "Sắp hết hạn nộp" },
];

// Lương khác đơn vị không so được với nhau: xếp theo nhóm tháng -> giờ -> dự án.
const UNIT_ORDER = { month: 0, hour: 1, project: 2 };

// Giảm dần thì so mức lương cao nhất, tăng dần thì so mức thấp nhất.
function salaryValue(job, direction) {
  const min = job.salaryMin == null ? null : Number(job.salaryMin);
  const max = job.salaryMax == null ? null : Number(job.salaryMax);
  return direction === "desc" ? max ?? min : min ?? max;
}

function compareSalary(a, b, direction) {
  const valueA = salaryValue(a, direction);
  const valueB = salaryValue(b, direction);

  // Tin "Thỏa thuận" luôn xếp cuối.
  if (valueA == null || valueB == null) {
    return Number(valueA == null) - Number(valueB == null);
  }

  const unitDifference =
    (UNIT_ORDER[a.salaryUnit] ?? 9) - (UNIT_ORDER[b.salaryUnit] ?? 9);
  if (unitDifference) return unitDifference;

  return direction === "desc" ? valueB - valueA : valueA - valueB;
}

function compareNewest(a, b) {
  return String(b.createdAt || "").localeCompare(
    String(a.createdAt || "")
  ) || b.id - a.id;
}

// So sánh theo kiểu đã chọn; bằng nhau thì tin mới hơn đứng trước.
function compareJobs(a, b, sort) {
  let difference = 0;

  if (sort === "priority") {
    difference = Number(b.prioritized) - Number(a.prioritized);
  } else if (sort === "salary_desc") {
    difference = compareSalary(a, b, "desc");
  } else if (sort === "salary_asc") {
    difference = compareSalary(a, b, "asc");
  } else if (sort === "popular") {
    difference = Number(b.applicationCount || 0) - Number(a.applicationCount || 0);
  } else if (sort === "deadline") {
    // Tin không ghi hạn nộp xếp cuối.
    difference =
      Number(!a.deadline) - Number(!b.deadline) ||
      String(a.deadline || "").localeCompare(String(b.deadline || ""));
  }

  return difference || compareNewest(a, b);
}

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
  // "salary" là giá trị cũ (lương cao nhất), giữ cho link đã lưu trước đây.
  const requestedSort = params.get("sort") === "salary"
    ? "salary_desc"
    : params.get("sort");
  const sort = SORT_OPTIONS.some((option) => option.value === requestedSort)
    ? requestedSort
    : "priority";
  const sortingSalary = sort === "salary_desc" || sort === "salary_asc";
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
    .sort((a, b) => compareJobs(a, b, sort));

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
              <label className="jobs-sort">
                Sắp xếp
                <select
                  value={sort}
                  onChange={(event) =>
                    changeFilter(
                      "sort",
                      event.target.value === "priority" ? "" : event.target.value
                    )
                  }
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

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

          {sortingSalary && !unit && (
            <p className="jobs-sort-note">
              Lương được so sánh trong cùng đơn vị (tháng, giờ, dự án); tin
              lương thỏa thuận xếp cuối. Chọn "Đơn vị lương" ở bộ lọc để chỉ
              xem một loại.
            </p>
          )}

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