import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { CompanyLogo, formatSalary } from "../../components/JobCard.jsx";
import useSavedJobs from "../../hooks/useSavedJobs.js";
import { getJobs } from "../../services/jobService.js";
import { formatRelativeTime } from "../../components/employer/employerFormat.js";
import {
  IconSearch, IconPin, IconBookmark, IconFilter, IconX,
} from "../../components/employer/EmployerIcons.jsx";
import "../../style/Public.css";

// Danh sách việc làm theo thiết kế mới. Toàn bộ cơ chế lọc giữ
// nguyên như trang cũ (tham số URL q/location/industry/level/
// type/schedule/unit/min/sort/page, lọc phía trình duyệt trên
// danh sách API trả về) — chỉ thay hình thức trình bày, và thêm
// hai bộ lọc thiết kế có mà dữ kiện có thật: khoảng lương tháng
// và ngày đăng.
const PAGE_SIZE = 8;

const SALARY_RANGES = [
  { key: "u10", label: "Dưới 10 triệu", lo: 0, hi: 10_000_000 },
  { key: "10-15", label: "10 - 15 triệu", lo: 10_000_000, hi: 15_000_000 },
  { key: "15-20", label: "15 - 20 triệu", lo: 15_000_000, hi: 20_000_000 },
  { key: "20-30", label: "20 - 30 triệu", lo: 20_000_000, hi: 30_000_000 },
  { key: "o30", label: "Trên 30 triệu", lo: 30_000_000, hi: Infinity },
];

const POSTED_OPTIONS = [
  { key: "", label: "Tất cả" },
  { key: "1", label: "24 giờ qua" },
  { key: "3", label: "3 ngày qua" },
  { key: "7", label: "7 ngày qua" },
  { key: "14", label: "14 ngày qua" },
];

function normalize(value) {
  return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .trim();
}

function matchesRange(job, range) {
  if (!range) return true;
  // Khoảng lương trong thiết kế tính theo tháng: tin có đơn vị
  // khác (giờ/dự án) hoặc thỏa thuận thì không lọt bộ lọc này.
  if (job.salaryUnit && job.salaryUnit !== "month") return false;
  const lo = job.salaryMin == null ? null : Number(job.salaryMin);
  const hi = job.salaryMax == null ? null : Number(job.salaryMax);
  if (lo == null && hi == null) return false;
  const jobLo = lo ?? hi;
  const jobHi = hi ?? lo;
  return jobHi >= range.lo && jobLo < range.hi;
}

export default function JobsListPage() {
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
  const rangeKey = params.get("range") || "";
  const posted = params.get("posted") || "";
  const minimum = Math.max(0, Number(params.get("min") || 0) || 0);
  const requestedPage = Math.max(1, Math.floor(Number(params.get("page")) || 1));

  // Đồng bộ ô từ khóa với tham số URL (điều chỉnh khi render,
  // cùng mẫu với trang cũ nhưng không dùng effect).
  const [seenQuery, setSeenQuery] = useState(query);
  if (seenQuery !== query) {
    setSeenQuery(query);
    setKeyword(query);
  }

  useEffect(() => {
    const controller = new AbortController();
    getJobs(controller.signal)
        .then((data) => { setJobs(data); setError(""); })
        .catch((err) => { if (err.name !== "AbortError") setError(err.message); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  function options(field) {
    return [...new Set(jobs.map((j) => j[field]).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "vi"));
  }

  function changeFilter(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    if (key === "unit") next.delete("min");
    setParams(next, { replace: true });
  }

  function toggleFilter(key, value) {
    const next = new URLSearchParams(params);
    const current = next.getAll(key);
    const values = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
    next.delete(key);
    values.forEach((v) => next.append(key, v));
    next.delete("page");
    setParams(next, { replace: true });
  }

  function clearAll() {
    setParams({}, { replace: true });
    setKeyword("");
  }

  const range = SALARY_RANGES.find((r) => r.key === rangeKey) || null;
  const postedDays = posted ? Number(posted) : 0;

  const filtered = jobs
      .filter((job) => {
        const text = normalize(`${job.title} ${job.companyName} ${job.skills || ""}`);
        return (
            (!query || text.includes(normalize(query))) &&
            (!location || job.location === location) &&
            (!industry || job.industry === industry) &&
            (!levels.length || levels.includes(job.level)) &&
            (!types.length || types.includes(job.jobType)) &&
            (!schedules.length || schedules.includes(job.workingSchedule)) &&
            (!unit || job.salaryUnit === unit) &&
            (!unit || minimum === 0 ||
                (job.salaryMin != null && Number(job.salaryMin) >= minimum)) &&
            matchesRange(job, range) &&
            (!postedDays || !job.createdAt ||
                Date.now() - new Date(job.createdAt).getTime() <= postedDays * 86400000)
        );
      })
      .sort((a, b) => {
        if (sort === "salary" && unit) {
          return Number(b.salaryMax ?? b.salaryMin ?? -1) -
              Number(a.salaryMax ?? a.salaryMin ?? -1);
        }
        if (sort === "priority") {
          const diff = Number(b.prioritized) - Number(a.prioritized);
          if (diff) return diff;
        }
        return String(b.createdAt || "").localeCompare(String(a.createdAt || "")) || b.id - a.id;
      });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const visibleJobs = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pageItems = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const keep = [...new Set([1, totalPages, page - 1, page, page + 1])]
        .filter((n) => n >= 1 && n <= totalPages)
        .sort((a, b) => a - b);
    const out = [];
    keep.forEach((n, i) => {
      if (i > 0 && n - keep[i - 1] > 1) out.push("…");
      out.push(n);
    });
    return out;
  })();

  const chips = [];
  if (query) chips.push({ label: query, clear: () => changeFilter("q", "") });
  if (industry) chips.push({ label: industry, clear: () => changeFilter("industry", "") });
  if (location) chips.push({ label: location, clear: () => changeFilter("location", "") });
  levels.forEach((v) => chips.push({ label: v, clear: () => toggleFilter("level", v) }));
  types.forEach((v) => chips.push({ label: v, clear: () => toggleFilter("type", v) }));
  schedules.forEach((v) => chips.push({ label: v, clear: () => toggleFilter("schedule", v) }));
  if (range) chips.push({ label: range.label, clear: () => changeFilter("range", "") });
  if (posted) {
    chips.push({
      label: POSTED_OPTIONS.find((o) => o.key === posted)?.label || "",
      clear: () => changeFilter("posted", ""),
    });
  }

  function openDetails(job) {
    navigate(`/jobs/${job.id}`, { state: { from: `/jobs?${params.toString()}` } });
  }

  return (
      <div>
        <div className="jobs-hero">
          <div className="jobs-hero__in">
            <form
                className="jobs-searchbar"
                onSubmit={(e) => { e.preventDefault(); changeFilter("q", keyword.trim()); }}
            >
              <label className="home-search__field">
                <IconSearch size={17} />
                <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Vị trí, kỹ năng hoặc công ty"
                    aria-label="Từ khóa tìm kiếm"
                />
              </label>
              <label className="home-search__field">
                <IconPin size={17} />
                <select
                    value={location}
                    onChange={(e) => changeFilter("location", e.target.value)}
                    aria-label="Địa điểm"
                >
                  <option value="">Địa điểm</option>
                  {options("location").map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </label>
              <button type="submit" className="detail-apply" style={{ padding: "11px 24px" }}>
                Tìm kiếm
              </button>
            </form>
          </div>
        </div>

        <div className="pub-wrap">
          <div className="jobs-layout">
            <aside className="jobs-filters">
              <div className="jobs-filters__head">
                <strong><IconFilter size={16} /> Bộ lọc tìm kiếm</strong>
                <button type="button" onClick={clearAll}>Xóa tất cả</button>
              </div>

              <div className="jobs-fgroup">
                <h5>Ngành nghề</h5>
                {options("industry").map((v) => (
                    <label key={v}>
                      <input
                          type="checkbox"
                          checked={industry === v}
                          onChange={() => changeFilter("industry", industry === v ? "" : v)}
                      />
                      <span>{v}</span>
                    </label>
                ))}
              </div>

              <div className="jobs-fgroup">
                <h5>Địa điểm</h5>
                {options("location").map((v) => (
                    <label key={v}>
                      <input
                          type="checkbox"
                          checked={location === v}
                          onChange={() => changeFilter("location", location === v ? "" : v)}
                      />
                      <span>{v}</span>
                    </label>
                ))}
              </div>

              <div className="jobs-fgroup">
                <h5>Mức lương (theo tháng)</h5>
                {SALARY_RANGES.map((r) => (
                    <label key={r.key}>
                      <input
                          type="radio"
                          name="salary-range"
                          checked={rangeKey === r.key}
                          onChange={() => changeFilter("range", r.key)}
                      />
                      <span>{r.label}</span>
                    </label>
                ))}
                {rangeKey && (
                    <button type="button" className="jobs-chip-clear" onClick={() => changeFilter("range", "")}>
                      Bỏ lọc lương
                    </button>
                )}
              </div>

              <div className="jobs-fgroup">
                <h5>Kinh nghiệm / Cấp bậc</h5>
                {options("level").map((v) => (
                    <label key={v}>
                      <input
                          type="checkbox"
                          checked={levels.includes(v)}
                          onChange={() => toggleFilter("level", v)}
                      />
                      <span>{v}</span>
                    </label>
                ))}
              </div>

              <div className="jobs-fgroup">
                <h5>Hình thức làm việc</h5>
                {options("jobType").map((v) => (
                    <label key={v}>
                      <input
                          type="checkbox"
                          checked={types.includes(v)}
                          onChange={() => toggleFilter("type", v)}
                      />
                      <span>{v}</span>
                    </label>
                ))}
              </div>

              <div className="jobs-fgroup">
                <h5>Lịch làm việc</h5>
                {options("workingSchedule").map((v) => (
                    <label key={v}>
                      <input
                          type="checkbox"
                          checked={schedules.includes(v)}
                          onChange={() => toggleFilter("schedule", v)}
                      />
                      <span>{v}</span>
                    </label>
                ))}
              </div>

              <div className="jobs-fgroup">
                <h5>Ngày đăng</h5>
                {POSTED_OPTIONS.map((o) => (
                    <label key={o.key || "all"}>
                      <input
                          type="radio"
                          name="posted"
                          checked={posted === o.key}
                          onChange={() => changeFilter("posted", o.key)}
                      />
                      <span>{o.label}</span>
                    </label>
                ))}
              </div>
            </aside>

            <section>
              <div className="jobs-results__head">
                <div>
                  <h1>Việc làm phù hợp với bạn</h1>
                  <p>
                    Tìm thấy <strong>{filtered.length.toLocaleString("vi-VN")}</strong>{" "}
                    việc làm đang tuyển dụng
                  </p>
                </div>
                <label className="jobs-sort">
                  Sắp xếp theo:
                  <select
                      value={sort}
                      onChange={(e) => changeFilter("sort", e.target.value)}
                  >
                    <option value="priority">Phù hợp nhất</option>
                    <option value="newest">Mới nhất</option>
                    <option value="salary">Lương cao</option>
                  </select>
                </label>
              </div>

              {chips.length > 0 && (
                  <div className="jobs-chips">
                    <span className="lbl">Bộ lọc đang áp dụng:</span>
                    {chips.map((chip, i) => (
                        <button key={i} type="button" className="jobs-chip" onClick={chip.clear}>
                          {chip.label} <IconX size={12} />
                        </button>
                    ))}
                    <button type="button" className="jobs-chip-clear" onClick={clearAll}>
                      Xóa bộ lọc
                    </button>
                  </div>
              )}

              {saveError && <p className="pub-muted" role="status">{saveError}</p>}
              {loading && <p className="pub-center">Đang tải việc làm…</p>}
              {error && (
                  <div className="jobs-empty">
                    <strong>Không tải được việc làm</strong>
                    <p>{error}</p>
                    <button type="button" onClick={() => setRetry((v) => v + 1)}>Thử lại</button>
                  </div>
              )}

              {!loading && !error && visibleJobs.map((job) => {
                const saved = savedIds.includes(job.id);
                const tags = [job.jobType, ...(job.skills || "").split(",")
                    .map((s) => s.trim()).filter(Boolean)].filter(Boolean).slice(0, 4);
                return (
                    <article key={job.id} className="jobrow">
                      {job.highlighted && <span className="home-hot">HOT</span>}
                      <Link
                          to={`/cong-ty/${job.companyId}`}
                          aria-label={`Xem trang công ty ${job.companyName}`}
                      >
                        <CompanyLogo name={job.companyName} src={job.companyLogo} />
                      </Link>
                      <div className="jobrow__body">
                        <Link
                            className="jobrow__title"
                            to={`/jobs/${job.id}`}
                            state={{ from: `/jobs?${params.toString()}` }}
                        >
                          {job.title}
                        </Link>
                        <Link
                            className="jobrow__company jobrow__company--link"
                            to={`/cong-ty/${job.companyId}`}
                        >
                          {job.companyName}
                        </Link>
                        <div className="jobrow__meta">
                          <span className="home-job__salary">{formatSalary(job)}</span>
                          <span className="home-job__loc">
                        <IconPin size={14} /> {job.location || "Chưa cập nhật"}
                      </span>
                          <span className="home-job__loc">{formatRelativeTime(job.createdAt)}</span>
                        </div>
                        <div className="home-job__tags">
                          {tags.map((t) => <span key={t}>{t}</span>)}
                        </div>
                      </div>
                      <div className="jobrow__side">
                        <button
                            type="button"
                            className={`jobrow__save${saved ? " is-saved" : ""}`}
                            onClick={() => toggleSave(job.id)}
                            aria-pressed={saved}
                            aria-label={saved ? "Bỏ lưu" : "Lưu việc làm"}
                        >
                          <IconBookmark size={19} />
                        </button>
                        <button
                            type="button"
                            className="jobrow__apply"
                            onClick={() => openDetails(job)}
                        >
                          Ứng tuyển ngay
                        </button>
                      </div>
                    </article>
                );
              })}

              {!loading && !error && filtered.length === 0 && (
                  <div className="jobs-empty">
                    <strong>Không tìm thấy công việc ưng ý?</strong>
                    <p>Hãy thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh bộ lọc để có thêm nhiều lựa chọn hấp dẫn khác.</p>
                    <button type="button" onClick={clearAll}>Làm mới kết quả</button>
                  </div>
              )}

              {!loading && !error && totalPages > 1 && (
                  <div className="jobs-pager">
                    <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => changeFilter("page", String(page - 1))}
                    >
                      ‹
                    </button>
                    {pageItems.map((item, i) =>
                        item === "…"
                            ? <span key={`gap-${i}`}>…</span>
                            : (
                                <button
                                    key={item}
                                    type="button"
                                    className={item === page ? "is-active" : ""}
                                    onClick={() => changeFilter("page", String(item))}
                                >
                                  {item}
                                </button>
                            ))}
                    <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => changeFilter("page", String(page + 1))}
                    >
                      ›
                    </button>
                  </div>
              )}
            </section>
          </div>
        </div>
      </div>
  );
}