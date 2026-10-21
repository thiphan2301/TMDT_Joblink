import { Link, useNavigate, useParams } from "react-router";
import { useState } from "react";
import { EmployerPageHeader } from "../../components/employer/EmployerLayout.jsx";
import {
  IconChat, IconPin, IconFile, IconCheck, IconBriefcase, IconUsers,
} from "../../components/employer/EmployerIcons.jsx";
import {
  APPLICATION_STATUS_LABELS, APPLICATION_STATUS_BADGE,
  initialsOf, formatDate, formatDateTime,
} from "../../components/employer/employerFormat.js";
import useEmployerData from "../../hooks/useEmployerData.js";
import { getCandidateDetail } from "../../services/employerService.js";
import { openConversation } from "../../services/chatService.js";

// Trang chi tiết hồ sơ ứng viên (từ Tìm kiếm ứng viên). Dữ liệu lấy
// đúng những gì database có: giới thiệu, kỹ năng kèm số năm kinh
// nghiệm, thông tin liên hệ (chỉ hiện khi gói có quyền liên hệ trực
// tiếp hoặc ứng viên đã ứng tuyển), danh sách CV, các đơn đã nộp vào
// công ty mình và ứng viên tương tự theo kỹ năng chung.
// Mở trang này tính 1 lượt xem hồ sơ theo giới hạn của gói.
export default function EmployerCandidateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const { data, loading, error } = useEmployerData(
    () => getCandidateDetail(id), [id],
  );

  async function startChat() {
    setBusy(true);
    setActionError("");
    try {
      const conversation = await openConversation(data.id, null);
      navigate(`/employer/chat?c=${conversation.id}`);
    } catch (err) {
      setActionError(err.message || "Không mở được cuộc trò chuyện.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <EmployerPageHeader
        title="Chi tiết hồ sơ"
        description="Thông tin ứng viên trong kho hồ sơ JobLink."
        action={<Link to="/employer/candidates" className="emp-btn">← Quay lại tìm kiếm</Link>}
      />
      {loading && <p className="emp-muted">Đang tải hồ sơ...</p>}
      {error && <p className="emp-error">{error}</p>}
      {actionError && <p className="emp-error">{actionError}</p>}

      {data && (
        <>
          <section className="emp-panel">
            <div className="emp-detail-head">
              {data.avatar
                ? <img src={data.avatar} alt="" className="emp-avatar-img emp-avatar-img--lg" />
                : <span className="emp-avatar emp-avatar--lg">{initialsOf(data.fullName)}</span>}
              <div style={{ flex: 1, minWidth: 220 }}>
                <h2>{data.fullName}</h2>
                <p>
                  {data.address && <><IconPin size={14} /> {data.address} · </>}
                  {data.dob && <>Sinh năm {new Date(data.dob).getFullYear()} · </>}
                  Đã xem {data.viewsUsed}{data.viewsLimit !== null ? ` / ${data.viewsLimit}` : ""} hồ sơ trong gói
                </p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="emp-btn emp-btn--primary" onClick={startChat} disabled={busy}>
                  <IconChat size={17} /> Nhắn tin ngay
                </button>
              </div>
            </div>
          </section>

          <div className="emp-dash-grid">
            <div>
              {data.summary && (
                <section className="emp-panel">
                  <h3 className="emp-section-title"><span className="emp-stat-card__icon"><IconFile size={16} /></span> Giới thiệu bản thân</h3>
                  <p style={{ margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{data.summary}</p>
                </section>
              )}

              <section className="emp-panel">
                <h3 className="emp-section-title"><span className="emp-stat-card__icon"><IconBriefcase size={16} /></span> Kỹ năng chuyên môn</h3>
                {data.skills.length === 0 && <p className="emp-muted" style={{ margin: 0 }}>Ứng viên chưa khai báo kỹ năng.</p>}
                <div style={{ display: "grid", gap: 9 }}>
                  {data.skills.map((s) => (
                    <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="emp-chip" style={{ fontSize: 13, padding: "5px 12px" }}>{s.name}</span>
                      {s.level && <span className="emp-muted" style={{ fontSize: 13 }}>{s.level}</span>}
                      {s.yearsExp && <span className="emp-muted" style={{ fontSize: 13 }}>· {s.yearsExp} năm kinh nghiệm</span>}
                    </div>
                  ))}
                </div>
              </section>

              <section className="emp-panel">
                <h3 className="emp-section-title"><span className="emp-stat-card__icon"><IconFile size={16} /></span> CV của ứng viên</h3>
                {data.cvs.length === 0 && <p className="emp-muted" style={{ margin: 0 }}>Ứng viên chưa tải CV nào lên hệ thống.</p>}
                {data.cvs.map((cv) => (
                  <div className="emp-list-row" key={cv.id}>
                    <div className="emp-list-row__main">
                      <strong>{cv.fileName || "CV"}</strong>
                      <span>Tải lên {formatDateTime(cv.uploadedAt)}{cv.isDefault ? " · CV mặc định" : ""}</span>
                    </div>
                    {cv.fileUrl && (
                      <a href={cv.fileUrl} target="_blank" rel="noreferrer" className="emp-btn">Xem CV</a>
                    )}
                  </div>
                ))}
              </section>

              {data.myApplications.length > 0 && (
                <section className="emp-panel">
                  <h3 className="emp-section-title"><span className="emp-stat-card__icon"><IconCheck size={16} /></span> Đã ứng tuyển vào công ty bạn</h3>
                  {data.myApplications.map((app) => (
                    <div className="emp-list-row" key={app.id}>
                      <div className="emp-list-row__main">
                        <strong>{app.jobTitle}</strong>
                        <span>Nộp ngày {formatDate(app.appliedAt)}</span>
                      </div>
                      <span className={`emp-badge ${APPLICATION_STATUS_BADGE[app.status] || "emp-badge--gray"}`}>
                        {APPLICATION_STATUS_LABELS[app.status] || app.status}
                      </span>
                    </div>
                  ))}
                  <Link to="/employer/applications" className="emp-link">Tới trang quản lý ứng viên →</Link>
                </section>
              )}
            </div>

            <div>
              <section className="emp-panel">
                <div className="emp-panel__head"><h3>Thông tin liên hệ</h3></div>
                {data.contactVisible ? (
                  <dl className="emp-detail-list">
                    <div><dt>Email</dt><dd>{data.email || "—"}</dd></div>
                    <div><dt>Số điện thoại</dt><dd>{data.phone || "Chưa cập nhật"}</dd></div>
                    <div><dt>Địa chỉ</dt><dd>{data.address || "Chưa cập nhật"}</dd></div>
                  </dl>
                ) : (
                  <p className="emp-muted" style={{ margin: 0, lineHeight: 1.65 }}>
                    Thông tin liên hệ đang được ẩn vì gói hiện tại chưa có
                    quyền <strong>liên hệ trực tiếp</strong>. Nâng cấp gói
                    Pro/Premium để xem email và số điện thoại.
                  </p>
                )}
              </section>

              {data.similar.length > 0 && (
                <section className="emp-panel">
                  <div className="emp-panel__head">
                    <h3><IconUsers size={18} /> Ứng viên tương tự</h3>
                  </div>
                  <p className="emp-muted" style={{ margin: "0 0 10px", fontSize: 13 }}>
                    Có chung kỹ năng với ứng viên này:
                  </p>
                  {data.similar.map((s) => (
                    <div className="emp-list-row" key={s.id}>
                      {s.avatar
                        ? <img src={s.avatar} alt="" className="emp-avatar-img" />
                        : <span className="emp-avatar">{initialsOf(s.fullName)}</span>}
                      <div className="emp-list-row__main">
                        <strong>{s.fullName}</strong>
                        <span>{s.skills.slice(0, 3).join(", ")}</span>
                      </div>
                      <Link to={`/employer/candidates/${s.id}`} className="emp-link">Xem</Link>
                    </div>
                  ))}
                </section>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
