import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { EmployerPageHeader } from "../../components/employer/EmployerLayout.jsx";
import {
  IconSearch, IconChat, IconPin, IconCrown, IconEye, IconClock,
  IconBriefcase, IconCheck, IconDots, IconX,
} from "../../components/employer/EmployerIcons.jsx";
import { initialsOf } from "../../components/employer/employerFormat.js";
import { PROVINCES } from "../../data/vietnamLocations.js";
import useEmployerData from "../../hooks/useEmployerData.js";
import { searchCandidates } from "../../services/employerService.js";
import { openConversation } from "../../services/chatService.js";

// Trang "Tìm kiếm ứng viên" theo thiết kế Employer Portal — tính
// năng của gói Pro/Premium (can_search_candidates). Thanh tìm kiếm
// BUNG RỘNG kiểu TopCV: ô địa điểm mở bộ chọn hai cột tỉnh/thành —
// quận/huyện (chọn tỉnh thì backend lọc theo tên tỉnh, chọn thêm
// quận/huyện thì lọc tiếp trên địa chỉ ứng viên); ô từ khóa mở
// panel gợi ý (kỹ năng nổi bật trong kết quả + ứng viên nổi bật).
// Lưu hồ sơ và lịch sử tìm kiếm lưu trên trình duyệt. Gói Basic
// bị backend trả 403 -> hiện panel mở khóa. Xem chi tiết một hồ
// sơ tính 1 lượt xem theo gói.
const PAGE_SIZE = 5;
const SAVED_KEY = "joblink-saved-candidates";
const HISTORY_KEY = "joblink-candidate-search-history";

const EXP_OPTIONS = [
  { value: 0, label: "Tất cả kinh nghiệm" },
  { value: 1, label: "Ít nhất 1 năm" },
  { value: 2, label: "Ít nhất 2 năm" },
  { value: 3, label: "Ít nhất 3 năm" },
  { value: 5, label: "Ít nhất 5 năm" },
];

const SORT_OPTIONS = [
  { value: "default", label: "Mặc định (hệ thống)" },
  { value: "exp", label: "Kinh nghiệm cao nhất" },
  { value: "skills", label: "Nhiều kỹ năng nhất" },
  { value: "name", label: "Tên A–Z" },
];

function readJson(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

// Danh sách số trang có dấu "…" ở giữa khi có quá nhiều trang.
function pageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set([1, 2, total - 1, total, current - 1, current, current + 1]
      .filter((n) => n >= 1 && n <= total));
  const sorted = [...keep].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

const EMPTY_FILTERS = { q: "", skill: "", location: "" };

export default function EmployerCandidates() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [districtFilter, setDistrictFilter] = useState([]);
  const [minExp, setMinExp] = useState(0);
  const [onlyApplied, setOnlyApplied] = useState(false);
  const [onlySaved, setOnlySaved] = useState(false);
  const [sort, setSort] = useState("default");
  const [page, setPage] = useState(1);
  const [menuId, setMenuId] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [saved, setSaved] = useState(() => new Set(readJson(SAVED_KEY, [])));
  const [history, setHistory] = useState(() => readJson(HISTORY_KEY, []));
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, loading, error } = useEmployerData(
      () => searchCandidates(applied), [applied],
  );
  const locked = Boolean(error) && (error.includes("Pro") || error.includes("nâng cấp"));

  function set(field, value) {
    setFilters((f) => ({ ...f, [field]: value }));
  }

  function pushHistory(entry) {
    if (!entry.q.trim() && !entry.skill.trim()) return;
    setHistory((prev) => {
      const next = [entry, ...prev.filter((h) =>
          !(h.q === entry.q && h.skill === entry.skill && h.location === entry.location),
      )].slice(0, 6);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }

  function applyFilters(e) {
    e?.preventDefault();
    setApplied(filters);
    setPage(1);
    setSuggestOpen(false);
    pushHistory({ ...filters });
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setDistrictFilter([]);
    setMinExp(0);
    setOnlyApplied(false);
    setOnlySaved(false);
    setSort("default");
    setPage(1);
  }

  function applyHistory(entry) {
    setFilters(entry);
    setApplied(entry);
    setDistrictFilter([]);
    setPage(1);
    setHistoryOpen(false);
  }

  // Bộ chọn địa điểm áp dụng xong: tỉnh đi qua backend (khớp tên
  // tỉnh trong địa chỉ), quận/huyện lọc tiếp ngay trên kết quả.
  function applyLocation(province, districts) {
    const next = { ...filters, location: province };
    setFilters(next);
    setApplied(next);
    setDistrictFilter(districts);
    setPage(1);
    setLocOpen(false);
    pushHistory(next);
  }

  function toggleSaved(id) {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(SAVED_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  const visible = useMemo(() => {
    let list = [...(data?.items || [])];
    if (districtFilter.length) {
      list = list.filter((c) => {
        const addr = (c.address || "").toLowerCase();
        return districtFilter.some((d) => addr.includes(d.toLowerCase()));
      });
    }
    if (minExp > 0) list = list.filter((c) => Number(c.maxYearsExp || 0) >= minExp);
    if (onlyApplied) list = list.filter((c) => c.hasAppliedToUs);
    if (onlySaved) list = list.filter((c) => saved.has(c.id));
    if (sort === "exp") list.sort((a, b) => Number(b.maxYearsExp || 0) - Number(a.maxYearsExp || 0));
    else if (sort === "skills") list.sort((a, b) => b.skillsCount - a.skillsCount);
    else if (sort === "name") list.sort((a, b) => (a.fullName || "").localeCompare(b.fullName || "", "vi"));
    return list;
  }, [data, districtFilter, minExp, onlyApplied, onlySaved, saved, sort]);

  // Gợi ý cho panel bung rộng: kỹ năng xuất hiện nhiều nhất trong
  // kết quả hiện tại + 3 ứng viên kinh nghiệm cao nhất.
  const topSkills = useMemo(() => {
    const counts = new Map();
    (data?.items || []).forEach((c) => (c.skills || []).forEach((s) => {
      counts.set(s, (counts.get(s) || 0) + 1);
    }));
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
        .map(([name, count]) => ({ name, count }));
  }, [data]);

  const topCandidates = useMemo(
      () => [...(data?.items || [])]
          .sort((a, b) => Number(b.maxYearsExp || 0) - Number(a.maxYearsExp || 0))
          .slice(0, 3),
      [data],
  );

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function startChat(candidate) {
    setBusy(true);
    setActionError("");
    try {
      const conversation = await openConversation(candidate.id, null);
      navigate(`/employer/chat?c=${conversation.id}`);
    } catch (err) {
      setActionError(err.message || "Không mở được cuộc trò chuyện.");
    } finally {
      setBusy(false);
    }
  }

  function pickSkill(name) {
    const next = { ...filters, skill: name };
    setFilters(next);
    setApplied(next);
    setPage(1);
    setSuggestOpen(false);
    pushHistory(next);
  }

  return (
      <>
        <EmployerPageHeader
            title={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            Tìm kiếm ứng viên
            <span className="emp-badge emp-badge--blue">PREMIUM FEATURE</span>
          </span>
            }
            description="Tìm kiếm và kết nối với những nhân tài xuất sắc nhất cho doanh nghiệp của bạn."
            action={
              <div style={{ display: "flex", gap: 10 }}>
                <div className="emp-menu-wrap">
                  <button type="button" className="emp-btn" onClick={() => setHistoryOpen(!historyOpen)}>
                    <IconClock size={17} /> Lịch sử tìm kiếm
                  </button>
                  {historyOpen && (
                      <div className="emp-menu" style={{ minWidth: 250 }}>
                        {history.length === 0 && (
                            <p className="emp-muted" style={{ margin: 0, padding: "8px 11px", fontSize: 13 }}>
                              Chưa có tìm kiếm nào được lưu.
                            </p>
                        )}
                        {history.map((h, i) => (
                            <button key={i} type="button" onClick={() => applyHistory(h)}>
                              <IconSearch size={15} />
                              {[h.q, h.skill, h.location].filter(Boolean).join(" · ") || "Tìm tất cả"}
                            </button>
                        ))}
                      </div>
                  )}
                </div>
                <Link to="/employer/jobs/new" className="emp-btn emp-btn--primary">
                  <IconBriefcase size={17} /> Tạo tin tuyển dụng
                </Link>
              </div>
            }
        />
        {actionError && <p className="emp-error">{actionError}</p>}

        {loading && <p className="emp-muted">Đang tải kho hồ sơ...</p>}

        {!loading && locked && (
            <>
              <div className="emp-search-hero" aria-hidden="true" style={{ opacity: 0.55, pointerEvents: "none" }}>
            <span className="emp-search-hero__field" style={{ flex: 1 }}>
              <IconSearch size={19} />
              <input placeholder="Tìm theo tên ứng viên, vị trí mong muốn hoặc từ khóa kỹ năng..." disabled />
            </span>
                <span className="emp-search-hero__divider" />
                <span className="emp-search-hero__field" style={{ width: 210 }}>
              <IconPin size={17} />
              <input placeholder="Tất cả địa điểm" disabled />
            </span>
                <button type="button" className="emp-btn emp-btn--primary" disabled>Tìm kiếm ngay</button>
              </div>
              <div className="emp-upsell">
                <span className="emp-badge emp-badge--blue" style={{ marginBottom: 12 }}>TÍNH NĂNG PREMIUM</span>
                <h2>Mở khóa Tìm kiếm ứng viên nâng cao</h2>
                <p>
                  Bạn đang dùng gói chưa có quyền tìm hồ sơ. Hãy nâng cấp lên gói
                  <strong> Pro </strong> hoặc <strong> Premium </strong> để truy cập kho hồ sơ ứng viên,
                  lọc theo kỹ năng và địa điểm, xem thông tin liên hệ và nhắn tin
                  trực tiếp — kể cả với ứng viên chưa từng ứng tuyển vào tin của bạn.
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                  <Link to="/employer/plan" className="emp-btn emp-btn--primary">Nâng cấp ngay</Link>
                  <Link to="/employer/plan" className="emp-btn">Xem bảng giá dịch vụ</Link>
                </div>
                <div className="emp-upsell__features">
                  <div><strong>Tìm kiếm không giới hạn</strong><span>Truy cập toàn bộ kho hồ sơ ứng viên đã bật cho phép tìm kiếm trên hệ thống.</span></div>
                  <div><strong>Bộ lọc chuyên sâu</strong><span>Lọc theo kỹ năng chuyên môn, địa điểm và số năm kinh nghiệm của ứng viên.</span></div>
                  <div><strong>Liên hệ trực tiếp</strong><span>Xem email, số điện thoại và nhắn tin ngay với ứng viên phù hợp.</span></div>
                </div>
              </div>
            </>
        )}

        {!loading && !locked && error && <p className="emp-error">{error}</p>}

        {!loading && data && (
            <>
              <div className="emp-search-wrap">
                <form className="emp-search-hero" onSubmit={applyFilters}>
              <span className="emp-search-hero__field" style={{ flex: 1 }}>
                <IconSearch size={19} />
                <input
                    placeholder="Tìm theo tên ứng viên hoặc từ khóa trong hồ sơ..."
                    value={filters.q}
                    onChange={(e) => set("q", e.target.value)}
                    onFocus={() => { setSuggestOpen(true); setLocOpen(false); }}
                    aria-label="Từ khóa tìm ứng viên"
                />
              </span>
                  <span className="emp-search-hero__divider" />
                  <span className="emp-search-hero__field" style={{ width: 230 }}>
                <IconPin size={17} />
                <input
                    placeholder="Tất cả địa điểm"
                    value={filters.location}
                    onChange={(e) => { set("location", e.target.value); setDistrictFilter([]); }}
                    aria-label="Địa điểm"
                />
                <button type="button" className="emp-icon-btn" style={{ width: 28, height: 28 }}
                        aria-label="Mở bộ chọn địa điểm" title="Chọn tỉnh / quận huyện"
                        onClick={() => { setLocOpen(!locOpen); setSuggestOpen(false); }}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>▼</span>
                </button>
              </span>
                  <button type="submit" className="emp-btn emp-btn--primary">Tìm kiếm ngay</button>
                </form>

                {locOpen && (
                    <LocationPicker
                        initialProvince={applied.location}
                        initialDistricts={districtFilter}
                        onApply={applyLocation}
                        onClose={() => setLocOpen(false)}
                    />
                )}

                {suggestOpen && (
                    <div className="emp-suggest-panel">
                      <div className="emp-suggest-panel__col">
                        <h4>Kỹ năng nổi bật trong kết quả</h4>
                        {topSkills.length === 0 && (
                            <p className="emp-muted" style={{ margin: 0, fontSize: 13.5 }}>
                              Chưa có dữ liệu — hãy tìm kiếm trước để thấy gợi ý.
                            </p>
                        )}
                        {topSkills.map((s) => (
                            <button key={s.name} type="button" className="emp-suggest-skill"
                                    onClick={() => pickSkill(s.name)}>
                              ↗ {s.name} <span>{s.count} hồ sơ</span>
                            </button>
                        ))}
                        {history.length > 0 && (
                            <>
                              <h4 style={{ marginTop: 16 }}>Tìm kiếm gần đây</h4>
                              {history.slice(0, 3).map((h, i) => (
                                  <button key={i} type="button" className="emp-suggest-skill"
                                          onClick={() => { applyHistory(h); setSuggestOpen(false); }}>
                                    <IconClock size={14} /> {[h.q, h.skill, h.location].filter(Boolean).join(" · ")}
                                  </button>
                              ))}
                            </>
                        )}
                      </div>
                      <div className="emp-suggest-panel__col">
                        <h4>Ứng viên nổi bật</h4>
                        {topCandidates.length === 0 && (
                            <p className="emp-muted" style={{ margin: 0, fontSize: 13.5 }}>Chưa có ứng viên nào trong kết quả hiện tại.</p>
                        )}
                        {topCandidates.map((c) => (
                            <button key={c.id} type="button" className="emp-suggest-cand"
                                    onClick={() => navigate(`/employer/candidates/${c.id}`)}>
                              {c.avatar
                                  ? <img src={c.avatar} alt="" className="emp-avatar-img" />
                                  : <span className="emp-avatar">{initialsOf(c.fullName)}</span>}
                              <span style={{ minWidth: 0 }}>
                        <strong>{c.fullName}</strong>
                        <span>
                          {[c.address, c.maxYearsExp ? `KN tới ${Number(c.maxYearsExp)} năm` : null]
                              .filter(Boolean).join(" · ")}
                        </span>
                      </span>
                            </button>
                        ))}
                      </div>
                    </div>
                )}
              </div>

              <div className="emp-search-layout">
                <aside>
                  <section className="emp-panel" style={{ padding: 18 }}>
                    <div className="emp-panel__head">
                      <h3 style={{ fontSize: 15.5 }}>Bộ lọc nâng cao</h3>
                      <button type="button" className="emp-link" onClick={resetFilters}
                              style={{ background: "none", border: "none", cursor: "pointer", font: "inherit", fontSize: 13 }}>
                        Làm mới
                      </button>
                    </div>
                    <label className="emp-field" style={{ display: "block", marginBottom: 13 }}>
                      <span className="emp-field__label">Kỹ năng chuyên môn</span>
                      <input className="emp-input" placeholder="VD: Java, React..."
                             value={filters.skill} onChange={(e) => set("skill", e.target.value)} />
                    </label>
                    <label className="emp-field" style={{ display: "block", marginBottom: 13 }}>
                      <span className="emp-field__label">Kinh nghiệm</span>
                      <select className="emp-input" value={minExp}
                              onChange={(e) => { setMinExp(Number(e.target.value)); setPage(1); }}>
                        {EXP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </label>
                    <label className="emp-field" style={{ display: "block", marginBottom: 13 }}>
                      <span className="emp-field__label">Trình độ học vấn</span>
                      <select className="emp-input" disabled>
                        <option>Hồ sơ chưa có dữ liệu học vấn</option>
                      </select>
                    </label>
                    <label className="emp-field" style={{ display: "block", marginBottom: 13 }}>
                      <span className="emp-field__label">Mức lương mong muốn</span>
                      <select className="emp-input" disabled>
                        <option>Hồ sơ chưa có dữ liệu lương</option>
                      </select>
                    </label>
                    <label className="emp-check-row">
                      <input type="checkbox" checked={onlyApplied}
                             onChange={(e) => { setOnlyApplied(e.target.checked); setPage(1); }} />
                      Đã ứng tuyển vào công ty bạn
                    </label>
                    <label className="emp-check-row">
                      <input type="checkbox" checked={onlySaved}
                             onChange={(e) => { setOnlySaved(e.target.checked); setPage(1); }} />
                      Chỉ hồ sơ đã lưu ({saved.size})
                    </label>
                    <div style={{ display: "flex", gap: 9, marginTop: 15 }}>
                      <button type="button" className="emp-btn" style={{ flex: 1, justifyContent: "center" }}
                              onClick={resetFilters}>
                        Làm mới
                      </button>
                      <button type="button" className="emp-btn emp-btn--primary" style={{ flex: 1, justifyContent: "center" }}
                              onClick={applyFilters}>
                        Áp dụng
                      </button>
                    </div>
                  </section>

                  <section className="emp-panel" style={{ padding: 18 }}>
                    <h3 className="emp-section-title">
                      <span className="emp-stat-card__icon emp-stat-card__icon--amber"><IconCrown size={18} /></span>
                      Quyền lợi gói của bạn
                    </h3>
                    <p className="emp-muted" style={{ margin: "0 0 2px", fontSize: 13.5 }}>
                      Đã xem <strong style={{ color: "#0f2540" }}>{data.viewsUsed}</strong>
                      {data.viewsLimit !== null ? ` / ${data.viewsLimit}` : ""} hồ sơ trong lượt đăng ký hiện tại
                    </p>
                    {data.viewsLimit !== null && (
                        <div className="emp-usage-bar">
                          <div className="emp-usage-bar__fill"
                               style={{ width: `${Math.min(100, (data.viewsUsed / Math.max(1, data.viewsLimit)) * 100)}%` }} />
                        </div>
                    )}
                    <p className="emp-muted" style={{ margin: "6px 0 14px", fontSize: 13.5, lineHeight: 1.6 }}>
                      {data.canDirectContact
                          ? "Gói có quyền xem thông tin liên hệ và nhắn tin trực tiếp."
                          : "Gói chưa có quyền liên hệ trực tiếp với ứng viên lạ."}
                    </p>
                    <Link to="/employer/plan" className="emp-btn" style={{ width: "100%", justifyContent: "center" }}>
                      Quản lý gói dịch vụ
                    </Link>
                  </section>

                  <section className="emp-panel" style={{ padding: 18 }}>
                    <h3 style={{ margin: "0 0 7px", fontSize: 13, color: "#0b5cff", letterSpacing: ".03em" }}>
                      <IconCheck size={15} /> MẸO TÌM KIẾM
                    </h3>
                    <p className="emp-muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.65 }}>
                      Bấm vào ô <strong>Địa điểm</strong> rồi bấm nút ▼ để mở bộ chọn
                      Tỉnh — Quận/Huyện như các trang tuyển dụng lớn; chọn tới cấp
                      quận/huyện để kết quả sát nhất với nơi bạn cần người.
                    </p>
                  </section>
                </aside>

                <div>
                  <div className="emp-results-head">
                    <h3>Ứng viên phù hợp <span>(Tìm thấy {visible.length} kết quả)</span></h3>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#64748b" }}>
                      Sắp xếp theo:
                      <select className="emp-input" style={{ width: 200 }} value={sort}
                              onChange={(e) => { setSort(e.target.value); setPage(1); }}
                              aria-label="Sắp xếp kết quả">
                        {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </label>
                  </div>

                  {districtFilter.length > 0 && (
                      <p style={{ margin: "-4px 0 12px" }}>
                  <span className="emp-badge emp-badge--blue" style={{ gap: 8 }}>
                    <IconPin size={13} /> {applied.location}: {districtFilter.join(", ")}
                    <button type="button" aria-label="Bỏ lọc quận/huyện"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "inline-flex", padding: 0 }}
                            onClick={() => { setDistrictFilter([]); setPage(1); }}>
                      <IconX size={13} />
                    </button>
                  </span>
                      </p>
                  )}

                  {pageItems.map((c, idx) => (
                      <article className="emp-cand-card" key={c.id}>
                        {c.avatar
                            ? <img src={c.avatar} alt="" className="emp-avatar-img emp-avatar-img--lg" />
                            : <span className="emp-avatar emp-avatar--lg">{initialsOf(c.fullName)}</span>}
                        <div className="emp-cand-card__main">
                          <div className="emp-cand-card__top">
                            <p className="emp-cand-card__name">{c.fullName}</p>
                            {c.hasAppliedToUs && <span className="emp-badge emp-badge--green">Đã ứng tuyển vào công ty bạn</span>}
                            <div className="emp-cand-card__actions">
                              <button type="button" className="emp-btn" disabled={busy} onClick={() => startChat(c)}>
                                <IconChat size={16} /> Nhắn tin
                              </button>
                              <button type="button"
                                      className={`emp-btn ${saved.has(c.id) ? "emp-btn--saved" : "emp-btn--primary"}`}
                                      onClick={() => toggleSaved(c.id)}>
                                {saved.has(c.id) ? <><IconCheck size={16} /> Đã lưu</> : "Lưu hồ sơ"}
                              </button>
                              <div className="emp-menu-wrap">
                                <button type="button" className="emp-icon-btn" aria-label="Thêm thao tác"
                                        onClick={() => setMenuId(menuId === c.id ? null : c.id)}>
                                  <IconDots size={18} />
                                </button>
                                {menuId === c.id && (
                                    <div className={`emp-menu${idx === pageItems.length - 1 && pageItems.length > 1 ? " emp-menu--up" : ""}`}>
                                      <button type="button" onClick={() => { setMenuId(null); navigate(`/employer/candidates/${c.id}`); }}>
                                        <IconEye size={16} /> Xem hồ sơ chi tiết
                                      </button>
                                      <button type="button" onClick={() => { setMenuId(null); toggleSaved(c.id); }}>
                                        {saved.has(c.id) ? "Bỏ lưu hồ sơ" : "Lưu hồ sơ"}
                                      </button>
                                    </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="emp-cand-card__meta">
                            {c.address && <span><IconPin size={14} /> {c.address}</span>}
                            {c.maxYearsExp ? <span><IconClock size={14} /> Kinh nghiệm tới {Number(c.maxYearsExp)} năm (theo kỹ năng)</span> : null}
                            {c.email && <span>{c.email}</span>}
                            {c.phone && <span>{c.phone}</span>}
                          </div>
                          {c.summary && <p className="emp-cand-card__summary">{c.summary}</p>}
                          <div className="emp-chips">
                            {c.skills.slice(0, 5).map((s) => <span key={s} className="emp-chip">{s}</span>)}
                            {c.skillsCount > 5 && <span className="emp-chip">+{c.skillsCount - 5} kỹ năng</span>}
                            <Link to={`/employer/candidates/${c.id}`} className="emp-link" style={{ fontSize: 13 }}>
                              Xem hồ sơ →
                            </Link>
                          </div>
                        </div>
                      </article>
                  ))}
                  {visible.length === 0 && (
                      <p className="emp-muted">Không có ứng viên nào khớp điều kiện tìm kiếm và bộ lọc hiện tại.</p>
                  )}

                  {visible.length > 0 && (
                      <div className="emp-pagination" style={{ justifyContent: "center" }}>
                        <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Trang trước</button>
                        {pageList(currentPage, pageCount).map((n, i) => (
                            n === "…"
                                ? <span key={`dots-${i}`} className="emp-pagination__dots">…</span>
                                : <button key={n} type="button" className={n === currentPage ? "is-active" : ""} onClick={() => setPage(n)}>{n}</button>
                        ))}
                        <button type="button" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>Trang kế tiếp</button>
                      </div>
                  )}
                </div>
              </div>
            </>
        )}

        {(menuId !== null || historyOpen || locOpen || suggestOpen) && (
            <div
                style={{ position: "fixed", inset: 0, zIndex: 35 }}
                onClick={() => { setMenuId(null); setHistoryOpen(false); setLocOpen(false); setSuggestOpen(false); }}
                aria-hidden="true"
            />
        )}
      </>
  );
}

// Bộ chọn địa điểm hai cột (tỉnh/thành — quận/huyện) bung ra dưới
// thanh tìm kiếm, theo mẫu TopCV: mỗi cột có ô tìm riêng, chọn
// tỉnh ở cột trái thì cột phải hiện quận/huyện của tỉnh đó, tích
// "Tất cả" nghĩa là lấy toàn tỉnh. Bấm Áp dụng mới chốt lựa chọn.
function LocationPicker({ initialProvince, initialDistricts, onApply, onClose }) {
  const known = PROVINCES.find((p) => p.name === initialProvince);
  const [province, setProvince] = useState(known ? known.name : "");
  const [districts, setDistricts] = useState(() => new Set(initialDistricts || []));
  const [provinceQuery, setProvinceQuery] = useState("");
  const [districtQuery, setDistrictQuery] = useState("");

  const active = PROVINCES.find((p) => p.name === province);
  const provinceList = PROVINCES.filter((p) =>
      p.name.toLowerCase().includes(provinceQuery.trim().toLowerCase()));
  const districtList = (active?.districts || []).filter((d) =>
      d.toLowerCase().includes(districtQuery.trim().toLowerCase()));

  function pickProvince(name) {
    if (name !== province) {
      setProvince(name);
      setDistricts(new Set());
    }
  }

  function toggleDistrict(name) {
    setDistricts((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const summary = !province
      ? "Chưa chọn địa điểm — kết quả gồm mọi nơi."
      : districts.size
          ? `${province}: đã chọn ${districts.size} quận/huyện.`
          : `${province}: toàn tỉnh/thành.`;

  return (
      <div className="emp-loc-panel" role="dialog" aria-label="Chọn địa điểm">
        <div className="emp-loc-panel__cols">
          <div className="emp-loc-col">
          <span className="emp-loc-col__search">
            <IconSearch size={15} />
            <input placeholder="Nhập Tỉnh/Thành phố" value={provinceQuery}
                   onChange={(e) => setProvinceQuery(e.target.value)} aria-label="Tìm tỉnh/thành" />
          </span>
            <div className="emp-loc-col__list">
              {provinceList.map((p) => {
                const selected = province === p.name;
                return (
                    <button key={p.name} type="button"
                            className={`emp-loc-row${selected ? " is-checked" : ""}`}
                            onClick={() => pickProvince(p.name)}>
                      <input type="checkbox" checked={selected} readOnly tabIndex={-1} />
                      {p.name}
                      {selected && districts.size === 0 && <span className="emp-loc-row__all">Tất cả</span>}
                      {selected && districts.size > 0 && <span className="emp-loc-row__all">{districts.size} quận/huyện</span>}
                      {p.districts.length > 0 && <span className="emp-loc-row__go">›</span>}
                    </button>
                );
              })}
              {provinceList.length === 0 && (
                  <p className="emp-muted" style={{ padding: "8px 10px", margin: 0, fontSize: 13.5 }}>
                    Không thấy tỉnh/thành nào khớp.
                  </p>
              )}
            </div>
          </div>
          <div className="emp-loc-col">
          <span className="emp-loc-col__search">
            <IconSearch size={15} />
            <input placeholder="Nhập Quận/Huyện" value={districtQuery}
                   onChange={(e) => setDistrictQuery(e.target.value)} aria-label="Tìm quận/huyện"
                   disabled={!active} />
          </span>
            <div className="emp-loc-col__list">
              {!active && (
                  <p className="emp-muted" style={{ padding: "8px 10px", margin: 0, fontSize: 13.5 }}>
                    Chọn một tỉnh/thành ở cột trái để xem quận/huyện.
                  </p>
              )}
              {active && (
                  <>
                    <button type="button"
                            className={`emp-loc-row${districts.size === 0 ? " is-checked" : ""}`}
                            onClick={() => setDistricts(new Set())}>
                      <input type="checkbox" checked={districts.size === 0} readOnly tabIndex={-1} />
                      Tất cả {active.name}
                    </button>
                    {districtList.map((d) => (
                        <button key={d} type="button"
                                className={`emp-loc-row${districts.has(d) ? " is-checked" : ""}`}
                                onClick={() => toggleDistrict(d)}>
                          <input type="checkbox" checked={districts.has(d)} readOnly tabIndex={-1} />
                          {d}
                        </button>
                    ))}
                    {active.districts.length === 0 && (
                        <p className="emp-muted" style={{ padding: "8px 10px", margin: 0, fontSize: 13.5 }}>
                          Tỉnh này chọn ở cấp tỉnh (chưa có danh sách quận/huyện).
                        </p>
                    )}
                  </>
              )}
            </div>
          </div>
        </div>
        <div className="emp-loc-panel__foot">
          <button type="button" className="emp-link"
                  style={{ background: "none", border: "none", cursor: "pointer", font: "inherit" }}
                  onClick={() => { setProvince(""); setDistricts(new Set()); }}>
            Bỏ chọn tất cả
          </button>
          <span className="emp-muted">{summary}</span>
          <span style={{ display: "inline-flex", gap: 8 }}>
          <button type="button" className="emp-btn" onClick={onClose}>Đóng</button>
          <button type="button" className="emp-btn emp-btn--primary"
                  onClick={() => onApply(province, [...districts])}>
            Áp dụng
          </button>
        </span>
        </div>
      </div>
  );
}