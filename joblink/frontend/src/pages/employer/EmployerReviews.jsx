import { useState } from "react";
import { EmployerPageHeader } from "../../components/employer/EmployerLayout.jsx";
import { EmployerModal } from "../../components/employer/EmployerModal.jsx";
import {
  IconStar, IconChat, IconCheck, IconSearch, IconChart, IconInfo,
  IconClock, IconDots,
} from "../../components/employer/EmployerIcons.jsx";
import { initialsOf, formatDate } from "../../components/employer/employerFormat.js";
import useEmployerData from "../../hooks/useEmployerData.js";
import { getReviews, replyToReview } from "../../services/employerService.js";

// Trang "Đánh giá & Phản hồi" theo thiết kế Employer Portal: ứng
// viên đánh giá công ty trên trang công khai (bảng
// company_reviews); nhà tuyển dụng xem 4 thẻ số liệu, lọc/tìm/
// sắp xếp danh sách, viết phản hồi (bảng review_replies), xem
// phân tích sao và xuất báo cáo CSV. Mọi con số lấy từ API thật;
// dòng "vị trí ứng viên" trong bản mẫu được thay bằng công ty
// được đánh giá vì hồ sơ đánh giá không lưu vị trí của ứng viên.
const PAGE_SIZE = 4;

function Stars({ rating, size = 15 }) {
  return (
      <span className="emp-stars" aria-label={`${rating} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={n <= rating ? "" : "emp-stars--dim"} style={{ display: "inline-flex" }}>
          <IconStar size={size} filled={n <= rating} />
        </span>
      ))}
    </span>
  );
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export default function EmployerReviews() {
  const { data, setData, loading, error } = useEmployerData(getReviews, []);
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [starFilter, setStarFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [editorId, setEditorId] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  const stats = data?.stats;
  const allReviews = data?.reviews || [];
  const repliedCount = allReviews.filter((r) => r.replyContent).length;
  const companyCount = new Set(allReviews.map((r) => r.companyId)).size;

  const filtered = (() => {
    const q = query.trim().toLowerCase();
    let list = allReviews.filter((r) => {
      if (starFilter !== "all" && r.rating !== Number(starFilter)) return false;
      if (statusFilter === "replied" && !r.replyContent) return false;
      if (statusFilter === "pending" && r.replyContent) return false;
      if (q && !`${r.candidateName} ${r.companyName} ${r.content}`.toLowerCase().includes(q)) return false;
      return true;
    });
    list = [...list];
    if (sortKey === "newest") list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sortKey === "oldest") list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else if (sortKey === "rating-desc") list.sort((a, b) => b.rating - a.rating);
    else if (sortKey === "rating-asc") list.sort((a, b) => a.rating - b.rating);
    return list;
  })();

  const visible = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visible.length;

  function resetVisible() {
    setVisibleCount(PAGE_SIZE);
  }

  async function sendReply(review) {
    const content = (drafts[review.id] || "").trim();
    if (!content) return;
    setBusyId(review.id);
    setActionError("");
    try {
      const updated = await replyToReview(review.id, content);
      setData(updated);
      setDrafts((d) => ({ ...d, [review.id]: "" }));
      setEditorId(null);
      setNotice(`Đã gửi phản hồi cho đánh giá của ${review.candidateName}.`);
    } catch (err) {
      setActionError(err.message || "Không gửi được phản hồi.");
    } finally {
      setBusyId(null);
    }
  }

  async function copyContent(review) {
    setMenuId(null);
    try {
      await navigator.clipboard.writeText(review.content || "");
      setNotice("Đã sao chép nội dung đánh giá.");
    } catch {
      setActionError("Trình duyệt không cho sao chép tự động.");
    }
  }

  function exportReport() {
    const header = ["Ứng viên", "Công ty", "Số sao", "Nội dung đánh giá", "Ngày đánh giá",
      "Trạng thái", "Phản hồi của nhà tuyển dụng", "Ngày phản hồi"];
    const lines = allReviews.map((r) => [
      r.candidateName, r.companyName, r.rating, r.content, formatDate(r.createdAt),
      r.replyContent ? "Đã phản hồi" : "Chờ phản hồi", r.replyContent || "",
      r.replyAt ? formatDate(r.replyAt) : "",
    ].map(csvCell).join(","));
    const blob = new Blob(["\ufeff" + [header.map(csvCell).join(","), ...lines].join("\n")],
        { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bao-cao-danh-gia.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Gợi ý cải thiện suy từ số liệu thật của chính công ty.
  const pendingCount = (stats?.total || 0) - repliedCount;
  const suggestion = !stats || stats.total === 0
      ? "Chưa có đánh giá nào để phân tích. Khi ứng viên bắt đầu đánh giá, gợi ý cải thiện sẽ hiện ở đây."
      : pendingCount > 0
          ? `Bạn còn ${pendingCount} đánh giá chưa phản hồi. Hãy phản hồi các đánh giá mới trong vòng 48 giờ để tăng mức độ hài lòng và niềm tin của ứng viên.`
          : stats.positivePercent < 100
              ? `Mọi đánh giá đều đã được phản hồi. Hiện ${100 - stats.positivePercent}% đánh giá dưới 4 sao — hãy đọc kỹ các góp ý này để cải thiện trải nghiệm ứng viên.`
              : "Tuyệt vời — mọi đánh giá đều đã được phản hồi và phần lớn là tích cực. Hãy giữ nhịp phản hồi này cho các đánh giá tiếp theo.";

  return (
      <>
        <EmployerPageHeader
            title="Đánh giá & Phản hồi"
            description="Quản lý trải nghiệm ứng viên và duy trì hình ảnh thương hiệu nhà tuyển dụng chuyên nghiệp."
            action={
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="emp-btn" onClick={exportReport} disabled={!stats?.total}>
                  <IconChart size={17} /> Báo cáo trải nghiệm
                </button>
                <button type="button" className="emp-btn emp-btn--primary" onClick={() => setRulesOpen(true)}>
                  <IconInfo size={17} /> Xem quy tắc phản hồi
                </button>
              </div>
            }
        />
        {error && <p className="emp-error">{error}</p>}
        {actionError && <p className="emp-error">{actionError}</p>}
        {notice && <p className="emp-success">{notice}</p>}
        {loading && <p className="emp-muted">Đang tải dữ liệu...</p>}

        {stats && (
            <>
              <section className="emp-stat-grid">
                <article className="emp-stat-card">
                  <div className="emp-stat-card__top">
                    <span className="emp-stat-card__icon"><IconChat size={20} /></span>
                    <span className="emp-stat-card__trend">{companyCount} công ty</span>
                  </div>
                  <p className="emp-stat-card__label">Tổng số đánh giá</p>
                  <p className="emp-stat-card__value">{stats.total}</p>
                </article>
                <article className="emp-stat-card">
                  <div className="emp-stat-card__top">
                    <span className="emp-stat-card__icon emp-stat-card__icon--amber"><IconStar size={20} /></span>
                    <span className="emp-stat-card__trend">thang 5 sao</span>
                  </div>
                  <p className="emp-stat-card__label">Điểm trung bình</p>
                  <p className="emp-stat-card__value">{stats.total ? stats.average.toFixed(1) : "—"}</p>
                </article>
                <article className="emp-stat-card">
                  <div className="emp-stat-card__top">
                    <span className="emp-stat-card__icon emp-stat-card__icon--purple"><IconChat size={20} /></span>
                    <span className="emp-stat-card__trend">{repliedCount}/{stats.total} đánh giá</span>
                  </div>
                  <p className="emp-stat-card__label">Tỉ lệ phản hồi</p>
                  <p className="emp-stat-card__value">{stats.repliedPercent}%</p>
                </article>
                <article className="emp-stat-card">
                  <div className="emp-stat-card__top">
                    <span className="emp-stat-card__icon emp-stat-card__icon--green"><IconCheck size={20} /></span>
                    <span className="emp-stat-card__trend">đánh giá 4–5 sao</span>
                  </div>
                  <p className="emp-stat-card__label">Ứng viên hài lòng</p>
                  <p className="emp-stat-card__value">{stats.positivePercent}%</p>
                </article>
              </section>

              <div className="emp-toolbar" style={{ marginBottom: 18 }}>
                <label className="emp-searchbox">
                  <IconSearch size={17} />
                  <input placeholder="Tìm kiếm ứng viên, công ty hoặc nội dung..."
                         value={query} onChange={(e) => { setQuery(e.target.value); resetVisible(); }}
                         aria-label="Tìm kiếm đánh giá" />
                </label>
                <label>
                  Đánh giá:
                  <select className="emp-input" value={starFilter}
                          onChange={(e) => { setStarFilter(e.target.value); resetVisible(); }}
                          aria-label="Lọc theo số sao">
                    <option value="all">Tất cả sao</option>
                    {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} sao</option>)}
                  </select>
                </label>
                <label>
                  Trạng thái:
                  <select className="emp-input" value={statusFilter}
                          onChange={(e) => { setStatusFilter(e.target.value); resetVisible(); }}
                          aria-label="Lọc theo trạng thái phản hồi">
                    <option value="all">Tất cả</option>
                    <option value="pending">Chờ phản hồi</option>
                    <option value="replied">Đã phản hồi</option>
                  </select>
                </label>
                <label>
                  Sắp xếp:
                  <select className="emp-input" value={sortKey}
                          onChange={(e) => { setSortKey(e.target.value); resetVisible(); }}
                          aria-label="Sắp xếp đánh giá">
                    <option value="newest">Mới nhất</option>
                    <option value="oldest">Cũ nhất</option>
                    <option value="rating-desc">Sao cao nhất</option>
                    <option value="rating-asc">Sao thấp nhất</option>
                  </select>
                </label>
              </div>

              <div className="emp-dash-grid">
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0 }}>Danh sách đánh giá gần đây</h3>
                    <span className="emp-muted" style={{ fontSize: 13 }}>
                  Hiển thị {filtered.length ? 1 : 0} – {visible.length} trên {filtered.length} kết quả
                </span>
                  </div>

                  {visible.map((r) => (
                      <article className="emp-review" key={r.id}>
                        <div className="emp-user-cell">
                          {r.candidateAvatar
                              ? <img src={r.candidateAvatar} alt="" className="emp-avatar-img" />
                              : <span className="emp-avatar">{initialsOf(r.candidateName)}</span>}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="emp-table__title">
                              {r.candidateName}
                              <span className="emp-table__sub" style={{ display: "inline", marginLeft: 8, fontWeight: 500 }}>
                          · {formatDate(r.createdAt)}
                        </span>
                            </div>
                            <p className="emp-review__company">Đánh giá cho {r.companyName}</p>
                          </div>
                          <span className={`emp-badge ${r.replyContent ? "emp-badge--green" : "emp-badge--amber"}`}>
                      {r.replyContent ? "Đã phản hồi" : "Chờ phản hồi"}
                    </span>
                          <div className="emp-menu-wrap">
                            <button type="button" className="emp-icon-btn" aria-label="Thêm thao tác"
                                    onClick={() => setMenuId(menuId === r.id ? null : r.id)}>
                              <IconDots size={18} />
                            </button>
                            {menuId === r.id && (
                                <div className="emp-menu">
                                  {!r.replyContent && (
                                      <button type="button" onClick={() => { setMenuId(null); setEditorId(r.id); }}>
                                        <IconChat size={16} /> Viết phản hồi
                                      </button>
                                  )}
                                  <button type="button" onClick={() => copyContent(r)}>
                                    <IconCheck size={16} /> Sao chép nội dung
                                  </button>
                                </div>
                            )}
                          </div>
                        </div>
                        <div style={{ marginTop: 7 }}><Stars rating={r.rating} /></div>
                        <p style={{ margin: "9px 0 0", lineHeight: 1.65, fontStyle: "italic" }}>"{r.content}"</p>

                        {r.replyContent ? (
                            <>
                              <div className="emp-review__divider" />
                              <div className="emp-review__reply">
                                <strong style={{ fontSize: 12.5, color: "#0b5cff", letterSpacing: ".03em" }}>
                                  PHẢN HỒI TỪ NHÀ TUYỂN DỤNG
                                </strong>
                                <span className="emp-muted" style={{ float: "right", fontSize: 12.5 }}>{formatDate(r.replyAt)}</span>
                                <p>{r.replyContent}</p>
                              </div>
                            </>
                        ) : editorId === r.id ? (
                            <div style={{ marginTop: 13 }}>
                      <textarea
                          className="emp-input" rows={3} autoFocus
                          placeholder="Cảm ơn bạn đã dành thời gian đánh giá..."
                          value={drafts[r.id] || ""}
                          onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                      />
                              <div style={{ display: "flex", gap: 9, marginTop: 9 }}>
                                <button type="button" className="emp-btn emp-btn--primary"
                                        disabled={busyId === r.id || !(drafts[r.id] || "").trim()}
                                        onClick={() => sendReply(r)}>
                                  {busyId === r.id ? "Đang gửi..." : "Gửi phản hồi"}
                                </button>
                                <button type="button" className="emp-btn" onClick={() => setEditorId(null)}>
                                  Hủy
                                </button>
                              </div>
                            </div>
                        ) : (
                            <button type="button" className="emp-reply-cta" onClick={() => setEditorId(r.id)}>
                              + Viết phản hồi cho ứng viên này
                            </button>
                        )}
                      </article>
                  ))}
                  {filtered.length === 0 && (
                      <p className="emp-muted">
                        {stats.total === 0
                            ? "Công ty của bạn chưa có đánh giá nào từ ứng viên."
                            : "Không có đánh giá nào khớp điều kiện tìm kiếm và lọc hiện tại."}
                      </p>
                  )}

                  {remaining > 0 && (
                      <div style={{ textAlign: "center", marginTop: 6 }}>
                        <button type="button" className="emp-btn" style={{ padding: "11px 26px" }}
                                onClick={() => setVisibleCount(visibleCount + PAGE_SIZE)}>
                          Xem thêm {Math.min(PAGE_SIZE, remaining)} đánh giá khác
                        </button>
                      </div>
                  )}
                  {remaining <= 0 && filtered.length > PAGE_SIZE && (
                      <div style={{ textAlign: "center", marginTop: 6 }}>
                        <button type="button" className="emp-btn" onClick={resetVisible}>
                          Thu gọn danh sách
                        </button>
                      </div>
                  )}
                </div>

                <div>
                  <section className="emp-panel">
                    <div className="emp-panel__head"><h3>Phân tích đánh giá</h3></div>
                    {stats.starDistribution.map((row) => {
                      const pct = stats.total ? Math.round((row.count / stats.total) * 100) : 0;
                      return (
                          <div className="emp-starbar" key={row.date}>
                            <strong style={{ width: 12 }}>{row.date}</strong>
                            <IconStar size={14} filled />
                            <div className="emp-progress">
                              <div className="emp-progress__fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="emp-muted" style={{ width: 38, textAlign: "right" }}>{pct}%</span>
                          </div>
                      );
                    })}
                    <div className="emp-suggest-box">
                      <strong><IconInfo size={15} /> GỢI Ý CẢI THIỆN</strong>
                      <p>{suggestion}</p>
                    </div>
                  </section>

                  <section className="emp-panel">
                    <div className="emp-panel__head"><h3>Mẹo phản hồi chuyên nghiệp</h3></div>
                    <div className="emp-tip-item">
                      <span className="emp-stat-card__icon emp-stat-card__icon--green"><IconCheck size={16} /></span>
                      <div>
                        <strong>Cảm ơn chân thành</strong>
                        <p>Luôn bắt đầu bằng lời cảm ơn ứng viên đã dành thời gian.</p>
                      </div>
                    </div>
                    <div className="emp-tip-item">
                      <span className="emp-stat-card__icon"><IconClock size={16} /></span>
                      <div>
                        <strong>Phản hồi nhanh chóng</strong>
                        <p>Cố gắng trả lời các đánh giá mới trong vòng 24 – 48 giờ.</p>
                      </div>
                    </div>
                    <div className="emp-tip-item">
                      <span className="emp-stat-card__icon emp-stat-card__icon--amber"><IconStar size={16} /></span>
                      <div>
                        <strong>Luôn tích cực</strong>
                        <p>Dù là đánh giá tiêu cực, hãy giữ thái độ cầu thị và cầu tiến.</p>
                      </div>
                    </div>
                  </section>

                  <div className="emp-dark-card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <span className="emp-dark-card__label">Điểm trung bình của bạn</span>
                      <span className="emp-dark-card__pct" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                    <IconStar size={22} filled /> {stats.total ? stats.average.toFixed(1) : "—"}
                  </span>
                    </div>
                    <div className="emp-progress">
                      <div className="emp-progress__fill" style={{ width: `${stats.positivePercent}%` }} />
                    </div>
                    <p>
                      {stats.positivePercent}% đánh giá là tích cực (4–5 sao) trên tổng số
                      {" "}{stats.total} lượt đánh giá từ ứng viên cho các công ty của bạn.
                    </p>
                  </div>
                </div>
              </div>
            </>
        )}

        {rulesOpen && (
            <EmployerModal title="Quy tắc phản hồi đánh giá" onClose={() => setRulesOpen(false)}>
              <ul className="emp-perk-list" style={{ marginTop: 0 }}>
                <li><IconCheck size={16} /> Phản hồi hiển thị công khai ngay dưới đánh giá của ứng viên — hãy viết như đang nói trước mọi ứng viên khác.</li>
                <li><IconCheck size={16} /> Luôn cảm ơn ứng viên đã dành thời gian, kể cả khi đánh giá chưa tích cực.</li>
                <li><IconCheck size={16} /> Không tranh cãi, không đổ lỗi; nếu có hiểu lầm, mời ứng viên trao đổi thêm qua tin nhắn.</li>
                <li><IconCheck size={16} /> Không đưa thông tin cá nhân của ứng viên (số điện thoại, email, kết quả phỏng vấn chi tiết) vào phản hồi.</li>
                <li><IconCheck size={16} /> Trả lời trong 24–48 giờ giúp tăng rõ rệt mức độ hài lòng của ứng viên.</li>
              </ul>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button type="button" className="emp-btn emp-btn--primary" onClick={() => setRulesOpen(false)}>
                  Đã hiểu
                </button>
              </div>
            </EmployerModal>
        )}

        {menuId !== null && (
            <div
                style={{ position: "fixed", inset: 0, zIndex: 35 }}
                onClick={() => setMenuId(null)}
                aria-hidden="true"
            />
        )}
      </>
  );
}