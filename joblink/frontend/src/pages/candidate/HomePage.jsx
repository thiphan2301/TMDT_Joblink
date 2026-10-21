import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { CompanyLogo, formatSalary } from "../../components/JobCard.jsx";
import { getJobs } from "../../services/jobService.js";
import {
  IconSearch, IconPin, IconBriefcase, IconChart, IconUsers,
  IconChevronRight, IconMonitor, IconMegaphone, IconCalculator,
  IconTruck, IconPalette, IconGradCap, IconArrowUp,
} from "../../components/employer/EmployerIcons.jsx";
import "../../style/Public.css";

// Trang chủ Khám phá theo thiết kế mới: mọi con số (việc đang
// tuyển, công ty, ngành nghề, địa điểm, việc hấp dẫn, nhà tuyển
// dụng) đều tính từ danh sách việc làm thật mà API trả về —
// thiết kế có các số mẫu 50.000+/15.000+/2 triệu ứng viên nhưng
// hệ thống không có dữ kiện đó nên thay bằng số thật tương ứng
// (việc đang tuyển / công ty đang tuyển / việc nổi bật).
// Icon ngành nghề chọn theo từ khóa tên ngành cho gần với ảnh
// thiết kế (IT: màn hình, Marketing: loa, Kế toán: máy tính…),
// ngành không khớp từ khóa nào thì dùng icon cặp táp chung.
function categoryIcon(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("công nghệ") || n.includes("thông tin") || n.includes("phần mềm") || n.includes("it")) return IconMonitor;
  if (n.includes("marketing") || n.includes("truyền thông") || n.includes("quảng cáo")) return IconMegaphone;
  if (n.includes("kế toán") || n.includes("kiểm toán") || n.includes("tài chính") || n.includes("ngân hàng")) return IconCalculator;
  if (n.includes("logistics") || n.includes("vận tải") || n.includes("kho vận") || n.includes("chuỗi cung ứng")) return IconTruck;
  if (n.includes("thiết kế") || n.includes("design") || n.includes("sáng tạo")) return IconPalette;
  if (n.includes("giáo dục") || n.includes("đào tạo")) return IconGradCap;
  if (n.includes("nhân sự") || n.includes("hành chính")) return IconUsers;
  if (n.includes("kinh doanh") || n.includes("bán hàng") || n.includes("sales")) return IconChart;
  return IconBriefcase;
}

const CITY_COLORS = [
  ["#0b5cff", "#38bdf8"], ["#7c3aed", "#c084fc"], ["#059669", "#34d399"],
  ["#ea580c", "#fbbf24"], ["#db2777", "#f472b6"],
];

function splitTags(job) {
  const skills = (job.skills || "").split(",").map((s) => s.trim()).filter(Boolean);
  return [job.jobType, ...skills].filter(Boolean).slice(0, 3);
}

export default function HomePage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [sortMode, setSortMode] = useState("new");

  useEffect(() => {
    const controller = new AbortController();
    getJobs(controller.signal)
        .then(setJobs)
        .catch((err) => {
          if (err.name !== "AbortError") setError(err.message || "Không tải được dữ liệu.");
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  function search(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("q", keyword.trim());
    if (location) params.set("location", location);
    navigate(`/jobs${params.toString() ? `?${params}` : ""}`);
  }

  const locations = [...new Set(jobs.map((j) => j.location).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "vi"));

  const industryCounts = new Map();
  jobs.forEach((j) => {
    if (j.industry) industryCounts.set(j.industry, (industryCounts.get(j.industry) || 0) + 1);
  });
  const categories = [...industryCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

  const companyCounts = new Map();
  jobs.forEach((j) => {
    if (!companyCounts.has(j.companyId)) {
      companyCounts.set(j.companyId, { id: j.companyId, name: j.companyName, logo: j.companyLogo, count: 0 });
    }
    companyCounts.get(j.companyId).count += 1;
  });
  const employers = [...companyCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

  const locationCounts = new Map();
  jobs.forEach((j) => {
    if (j.location) locationCounts.set(j.location, (locationCounts.get(j.location) || 0) + 1);
  });
  const cities = [...locationCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

  // 2 tab như thiết kế: "Mới nhất" ưu tiên tin được đẩy/nổi bật
  // rồi đến tin mới đăng; "Lương cao" xếp theo mức lương tối đa
  // thật của tin (tin thỏa thuận/không ghi lương xuống cuối).
  const attractive = [...jobs]
      .sort((a, b) => (sortMode === "salary"
          ? (Number(b.salaryMax) || 0) - (Number(a.salaryMax) || 0) ||
          (Number(b.salaryMin) || 0) - (Number(a.salaryMin) || 0)
          : Number(b.prioritized) - Number(a.prioritized) ||
          Number(b.highlighted) - Number(a.highlighted) ||
          String(b.createdAt || "").localeCompare(String(a.createdAt || ""))))
      .slice(0, 6);
  const remainingJobs = jobs.length - attractive.length;

  const highlightedCount = jobs.filter((j) => j.highlighted).length;

  return (
      <div className="home-page">
        <section className="home-hero">
          <div className="home-hero__in">
            <h1>Tìm công việc phù hợp với bạn</h1>
            <p>
              Hàng ngàn cơ hội nghề nghiệp từ các công ty hàng đầu đang
              chờ đón bạn. Bắt đầu sự nghiệp mơ ước ngay hôm nay.
            </p>
            <form className="home-search" onSubmit={search}>
              <label className="home-search__field">
                <IconSearch size={17} />
                <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Vị trí, kỹ năng hoặc công ty"
                />
              </label>
              <label className="home-search__field">
                <IconPin size={17} />
                <select value={location} onChange={(e) => setLocation(e.target.value)}>
                  <option value="">Địa điểm</option>
                  {locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </label>
              <button type="submit">Tìm kiếm</button>
            </form>
            {!loading && !error && (
                <div className="home-stats">
                  <div>
                    <strong>{jobs.length.toLocaleString("vi-VN")}+</strong>
                    <span>Việc làm đang tuyển</span>
                  </div>
                  <div>
                    <strong>{companyCounts.size.toLocaleString("vi-VN")}+</strong>
                    <span>Công ty đang tuyển</span>
                  </div>
                  <div>
                    <strong>{highlightedCount.toLocaleString("vi-VN")}+</strong>
                    <span>Việc làm nổi bật</span>
                  </div>
                </div>
            )}
          </div>
        </section>

        <div className="pub-wrap">
          {loading && <p className="pub-center">Đang tải việc làm…</p>}
          {error && <p className="pub-center" role="alert">{error}</p>}

          {!loading && !error && (
              <>
                {categories.length > 0 && (
                    <section className="home-section">
                      <div className="home-section__head">
                        <div>
                          <h2>Ngành nghề phổ biến</h2>
                          <p>Khám phá cơ hội theo lĩnh vực bạn quan tâm</p>
                        </div>
                        <Link to="/jobs">Xem tất cả <IconChevronRight size={14} /></Link>
                      </div>
                      <div className="home-cats">
                        {categories.map((cat) => {
                          const Icon = categoryIcon(cat.name);
                          return (
                              <Link
                                  key={cat.name}
                                  className="home-cat"
                                  to={`/jobs?industry=${encodeURIComponent(cat.name)}`}
                              >
                                <span className="home-cat__icon"><Icon size={21} /></span>
                                <strong>{cat.name}</strong>
                                <span>{cat.count} việc làm</span>
                              </Link>
                          );
                        })}
                      </div>
                    </section>
                )}

                <section className="home-section">
                  <div className="home-section__head">
                    <div>
                      <h2>Việc làm hấp dẫn</h2>
                      <p>Đừng bỏ lỡ những cơ hội nghề nghiệp tốt nhất tuần này</p>
                    </div>
                    <div className="home-tabs" role="tablist" aria-label="Sắp xếp việc làm hấp dẫn">
                      <button
                          type="button"
                          role="tab"
                          aria-selected={sortMode === "new"}
                          className={sortMode === "new" ? "is-active" : ""}
                          onClick={() => setSortMode("new")}
                      >
                        Mới nhất
                      </button>
                      <button
                          type="button"
                          role="tab"
                          aria-selected={sortMode === "salary"}
                          className={sortMode === "salary" ? "is-active" : ""}
                          onClick={() => setSortMode("salary")}
                      >
                        Lương cao
                      </button>
                    </div>
                  </div>
                  <div className="home-joblist">
                    {attractive.map((job) => (
                        <article key={job.id} className="home-job">
                          {job.highlighted && <span className="home-hot">HOT</span>}
                          <Link
                              to={`/cong-ty/${job.companyId}`}
                              aria-label={`Xem trang công ty ${job.companyName}`}
                          >
                            <CompanyLogo name={job.companyName} src={job.companyLogo} />
                          </Link>
                          <div className="home-job__body">
                            <Link className="home-job__title" to={`/jobs/${job.id}`}>
                              {job.title}
                            </Link>
                            <Link
                                className="home-job__company home-job__company--link"
                                to={`/cong-ty/${job.companyId}`}
                            >
                              {job.companyName}
                            </Link>
                            <div className="home-job__meta">
                        <span className="home-job__salary">
                          <span className="home-job__dollar">$</span>
                          {formatSalary(job)}
                        </span>
                              <span className="home-job__loc">
                          <IconPin size={14} /> {job.location || "Chưa cập nhật"}
                        </span>
                            </div>
                            <div className="home-job__tags">
                              {splitTags(job).map((t) => <span key={t}>{t}</span>)}
                            </div>
                          </div>
                        </article>
                    ))}
                  </div>
                  <div className="home-more">
                    <Link to="/jobs">
                      {remainingJobs > 0
                          ? `Xem thêm ${remainingJobs.toLocaleString("vi-VN")} việc làm khác`
                          : "Xem tất cả việc làm"}
                    </Link>
                  </div>
                </section>

                {employers.length > 0 && (
                    <section className="home-section">
                      <div className="home-section__head">
                        <div>
                          <h2>Nhà tuyển dụng hàng đầu</h2>
                          <p>Hợp tác với những thương hiệu lớn nhất để xây dựng sự nghiệp vững chắc</p>
                        </div>
                      </div>
                      <div className="home-employers">
                        {employers.map((c) => (
                            <Link key={c.id} className="home-employer" to={`/cong-ty/${c.id}`}>
                              <CompanyLogo name={c.name} src={c.logo} />
                              <strong>{c.name}</strong>
                              <span>{c.count} việc làm đang tuyển</span>
                            </Link>
                        ))}
                      </div>
                    </section>
                )}

                {cities.length > 0 && (
                    <section className="home-section">
                      <div className="home-section__head">
                        <div>
                          <h2>Việc làm theo địa điểm</h2>
                          <p>Tìm kiếm cơ hội gần nơi bạn sinh sống</p>
                        </div>
                      </div>
                      <div className="home-cities">
                        {cities.map((city, i) => (
                            <Link
                                key={city.name}
                                className="home-city"
                                style={{
                                  "--c1": CITY_COLORS[i % CITY_COLORS.length][0],
                                  "--c2": CITY_COLORS[i % CITY_COLORS.length][1],
                                }}
                                to={`/jobs?location=${encodeURIComponent(city.name)}`}
                            >
                              <strong>{city.name}</strong>
                              <span>{city.count} việc làm</span>
                            </Link>
                        ))}
                      </div>
                    </section>
                )}

                <section className="home-cta">
                  <div className="home-cta__main">
                    <h3>Bạn đang tìm kiếm nhân tài?</h3>
                    <p>
                      Đăng tin tuyển dụng ngay hôm nay để kết nối với hàng
                      triệu ứng viên tiềm năng trên khắp Việt Nam.
                    </p>
                    <div className="home-cta__actions">
                      <Link className="home-cta__primary" to="/login">Đăng tuyển ngay</Link>
                      <Link className="home-cta__ghost" to="/employer">Tìm hiểu giải pháp</Link>
                    </div>
                  </div>
                  {/* Panel số liệu bên phải như thiết kế, nhưng là số
                  thật đang có trên hệ thống (thiết kế ghi +125% và
                  5.240 hồ sơ mới — hệ thống không có dữ kiện đó). */}
                  <div className="home-cta__panel">
                    <div>
                  <span className="home-cta__chip home-cta__chip--up">
                    <IconArrowUp size={16} />
                  </span>
                      <div>
                        <small>Việc làm đang tuyển</small>
                        <strong>{jobs.length.toLocaleString("vi-VN")} tin đang mở</strong>
                      </div>
                    </div>
                    <div>
                  <span className="home-cta__chip">
                    <IconUsers size={16} />
                  </span>
                      <div>
                        <small>Công ty đang tuyển dụng</small>
                        <strong>{companyCounts.size.toLocaleString("vi-VN")} công ty</strong>
                      </div>
                    </div>
                  </div>
                </section>
              </>
          )}
        </div>
      </div>
  );
}