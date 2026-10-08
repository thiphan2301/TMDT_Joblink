import { useEffect, useRef, useState } from "react";
import JobCard, {
    CompanyLogo,
    formatSalary,
} from "../../components/JobCard";
import { getJobs } from "../../services/jobService";
import "../../style/DiscoverJobs.css";
import { Link, useNavigate } from "react-router";

const PAGE_SIZE = 6;
const STORAGE_KEY = "joblink-saved-jobs";

function normalize(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim();
}

function readSavedJobs() {
    try {
        const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(value)
            ? value.filter((id) => Number.isInteger(id))
            : [];
    } catch {
        return [];
    }
}

function getMapUrl(job) {
    const lat = Number(job.latitude);
    const lon = Number(job.longitude);

    if (
        job.latitude == null ||
        job.longitude == null ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        Math.abs(lat) > 90 ||
        Math.abs(lon) > 180
    ) {
        return null;
    }

    const box = [
        Math.max(-180, lon - 0.025),
        Math.max(-90, lat - 0.018),
        Math.min(180, lon + 0.025),
        Math.min(90, lat + 0.018),
    ].join(",");

    return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
        box
    )}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lon}`)}`;
}

export default function DiscoverJobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reload, setReload] = useState(0);

    const [keyword, setKeyword] = useState("");
    const [query, setQuery] = useState("");
    const [location, setLocation] = useState("");
    const [industry, setIndustry] = useState("");
    const [sort, setSort] = useState("priority");
    const [onlySaved, setOnlySaved] = useState(false);
    const [page, setPage] = useState(1);

    const [savedIds, setSavedIds] = useState(readSavedJobs);
    const [storageMessage, setStorageMessage] = useState("");
    const [mapJobId, setMapJobId] = useState(null);

    const resultsRef = useRef(null);

    const navigate = useNavigate();

    function openJob(job) {
        navigate(`/jobs/${job.id}`, {
            state: { from: "/discover" },
        });
    }

    useEffect(() => {
        const controller = new AbortController();

        setLoading(true);
        setError("");

        getJobs(controller.signal)
            .then(setJobs)
            .catch((err) => {
                if (err.name !== "AbortError") {
                    setError(err.message || "Không thể kết nối máy chủ.");
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [reload]);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(savedIds));
            setStorageMessage("");
        } catch {
            setStorageMessage(
                "Trình duyệt không cho lưu lâu dài. Việc đã lưu chỉ được giữ trong lần mở này."
            );
        }
    }, [savedIds]);

    function toggleSave(id) {
        setSavedIds((current) =>
            current.includes(id)
                ? current.filter((value) => value !== id)
                : [...current, id]
        );
    }

    const locations = [...new Set(jobs.map((job) => job.location).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "vi"));

    // DB hiện có lĩnh vực của doanh nghiệp, chưa có lĩnh vực riêng cho từng tin.
    const industries = [...new Set(jobs.map((job) => job.industry).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "vi"));

    const searchTerm = normalize(query);

    const filteredJobs = jobs
        .filter((job) => {
            const text = normalize(
                `${job.title} ${job.companyName} ${job.skills || ""}`
            );

            return (
                (!searchTerm || text.includes(searchTerm)) &&
                (!location || job.location === location) &&
                (!industry || job.industry === industry) &&
                (!onlySaved || savedIds.includes(job.id))
            );
        })
        .sort((a, b) => {
            if (sort === "salary") {
                return Number(b.salaryMax ?? b.salaryMin ?? -1) -
                    Number(a.salaryMax ?? a.salaryMin ?? -1);
            }

            if (sort === "priority") {
                const priorityDifference =
                    Number(b.prioritized) - Number(a.prioritized);
                if (priorityDifference) return priorityDifference;
            }

            return String(b.createdAt || "").localeCompare(
                String(a.createdAt || "")
            ) || b.id - a.id;
        });

    const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);

    const visibleJobs = filteredJobs.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    const mapJobs = filteredJobs.filter((job) => getMapUrl(job));
    const mapJob =
        mapJobs.find((job) => job.id === mapJobId) || mapJobs[0];

    const companies = [
        ...new Map(jobs.map((job) => [job.companyId, job])).values(),
    ].slice(0, 6);

    function search(event) {
        event.preventDefault();

        const params = new URLSearchParams();

        if (keyword.trim()) params.set("q", keyword.trim());
        if (location) params.set("location", location);
        if (industry) params.set("industry", industry);

        navigate(`/jobs?${params.toString()}`);
    }

    function clearFilters() {
        setKeyword("");
        setQuery("");
        setLocation("");
        setIndustry("");
        setOnlySaved(false);
        setSort("priority");
        setPage(1);
    }

    return (
        <div className="discover-page">
            <div className="discover-welcome">
                <div>
                    <p>Chào bạn, cơ hội mới đang chờ!</p>
                    <h1>Khám phá cơ hội mới</h1>
                </div>

                {!loading && !error && (
                    <span className="discover-total">
                        ● {jobs.length.toLocaleString("vi-VN")} việc làm đang tuyển
                    </span>
                )}
            </div>

            <section className="discover-hero">
                <div className="discover-hero__content">
                    <span className="discover-badge">
                        Một bước gần hơn đến công việc mơ ước
                    </span>

                    <h2>
                        Công việc phù hợp.
                        <br />
                        <span>Tương lai rộng mở.</span>
                    </h2>

                    <p>
                        Kết nối với nhà tuyển dụng.
                        <br />
                        Khám phá cơ hội để bạn phát triển mỗi ngày.
                    </p>
                </div>

                <form className="discover-search" onSubmit={search}>
                    <input
                        aria-label="Từ khóa tìm việc"
                        placeholder="Vị trí, kỹ năng hoặc tên công ty"
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                    />

                    <select
                        aria-label="Địa điểm làm việc"
                        value={location}
                        onChange={(event) => {
                            setLocation(event.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">Tất cả địa điểm</option>
                        {locations.map((item) => (
                            <option key={item} value={item}>{item}</option>
                        ))}
                    </select>

                    <button className="discover-primary" type="submit">
                        Tìm việc ngay
                    </button>
                </form>
            </section>

            <div className="discover-keywords">
                <span>Gợi ý tìm kiếm:</span>
                {["React", "Marketing", "Designer", "Thực tập"].map((item) => (
                    <button
                        key={item}
                        type="button"
                        onClick={() => {
                            setKeyword(item);
                            setQuery(item);
                            setPage(1);
                        }}
                    >
                        {item}
                    </button>
                ))}
            </div>

            <section className="discover-section">
                <h2>Khám phá theo lĩnh vực doanh nghiệp</h2>

                <div className="discover-categories">
                    {["", ...industries].map((item) => (
                        <button
                            key={item}
                            type="button"
                            className={industry === item ? "is-selected" : ""}
                            aria-pressed={industry === item}
                            onClick={() => {
                                setIndustry(item);
                                setPage(1);
                            }}
                        >
                            <strong>{item || "Tất cả"}</strong>
                            <span>
                                {item
                                    ? jobs.filter((job) => job.industry === item).length
                                    : jobs.length} việc làm
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            <section className="discover-section" ref={resultsRef}>
                <div className="discover-section__heading">
                    <div>
                        <h2>Việc làm dành cho bạn</h2>
                        <p>{filteredJobs.length} kết quả phù hợp</p>
                    </div>

                    <Link className="discover-view-all" to="/jobs">
                        Xem tất cả →
                    </Link>

                    <div className="discover-controls">
                        <label className="discover-saved-filter">
                            <input
                                type="checkbox"
                                checked={onlySaved}
                                onChange={(event) => {
                                    setOnlySaved(event.target.checked);
                                    setPage(1);
                                }}
                            />
                            Việc đã lưu
                        </label>

                        <select
                            aria-label="Sắp xếp việc làm"
                            value={sort}
                            onChange={(event) => {
                                setSort(event.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="priority">Ưu tiên hiển thị</option>
                            <option value="newest">Mới nhất</option>
                            <option value="salary">Mức lương cao nhất</option>
                        </select>

                        <button type="button" onClick={clearFilters}>
                            Xóa bộ lọc
                        </button>
                    </div>
                </div>

                {storageMessage && <p role="status">{storageMessage}</p>}

                {loading ? (
                    <div className="discover-status" role="status">
                        Đang tải danh sách việc làm…
                    </div>
                ) : error ? (
                    <div className="discover-status" role="alert">
                        <p>{error}</p>
                        <button
                            type="button"
                            className="discover-primary"
                            onClick={() => setReload((value) => value + 1)}
                        >
                            Thử lại
                        </button>
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="discover-status">
                        <h3>Chưa tìm thấy việc làm phù hợp</h3>
                        <p>Hãy thử từ khóa khác hoặc bỏ bớt bộ lọc.</p>
                        <button type="button" onClick={clearFilters}>
                            Xóa bộ lọc
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="discover-grid">
                            {visibleJobs.map((job) => (
                                <JobCard
                                    key={job.id}
                                    job={job}
                                    saved={savedIds.includes(job.id)}
                                    onSave={toggleSave}
                                    onView={openJob}
                                />
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <nav className="discover-pagination" aria-label="Phân trang">
                                <button
                                    type="button"
                                    disabled={currentPage === 1}
                                    onClick={() => setPage(currentPage - 1)}
                                >
                                    ← Trước
                                </button>
                                <span>Trang {currentPage} / {totalPages}</span>
                                <button
                                    type="button"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setPage(currentPage + 1)}
                                >
                                    Sau →
                                </button>
                            </nav>
                        )}
                    </>
                )}
            </section>

            {companies.length > 0 && (
                <section className="discover-companies">
                    <p>Doanh nghiệp đang tuyển dụng</p>
                    <div>
                        {companies.map((company) => (
                            <span key={company.companyId}>{company.companyName}</span>
                        ))}
                    </div>
                </section>
            )}

            {!loading && !error && (
                <section className="discover-map">
                    <div className="discover-map__content">
                        <h2>Khám phá vị trí doanh nghiệp</h2>
                        <p>
                            Chọn việc làm để xem vị trí doanh nghiệp trên bản đồ.
                            Địa điểm làm việc thực tế có thể khác địa chỉ doanh nghiệp.
                        </p>

                        {mapJob ? (
                            <>
                                <select
                                    aria-label="Chọn doanh nghiệp trên bản đồ"
                                    value={mapJob.id}
                                    onChange={(event) => setMapJobId(Number(event.target.value))}
                                >
                                    {mapJobs.map((job) => (
                                        <option key={job.id} value={job.id}>
                                            {job.companyName} — {job.title}
                                        </option>
                                    ))}
                                </select>

                                <h3>{mapJob.title}</h3>
                                <p>{mapJob.companyName}</p>
                                <p>{mapJob.companyAddress || mapJob.location}</p>

                                <button
                                    type="button"
                                    className="discover-primary"
                                    onClick={() => openJob(mapJob)}
                                >
                                    Xem việc làm
                                </button>
                            </>
                        ) : (
                            <p>Chưa có tọa độ doanh nghiệp cho các việc làm này.</p>
                        )}
                    </div>

                    {mapJob ? (
                        <iframe
                            title={`Bản đồ ${mapJob.companyName}`}
                            src={getMapUrl(mapJob)}
                            loading="lazy"
                        />
                    ) : (
                        <div className="discover-map__empty">Chưa có dữ liệu bản đồ</div>
                    )}
                </section>
            )}

            <footer className="discover-footer">
                © {new Date().getFullYear()} JobLink. Kết nối cơ hội, kiến tạo tương lai.
            </footer>

        </div>
    );
}