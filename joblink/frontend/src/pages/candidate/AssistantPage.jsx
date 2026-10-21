import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  getAssistantProfile, sendAssistantMessage,
} from "../../services/candidateService.js";
import { formatSalaryRange } from "../../components/employer/employerFormat.js";
import {
  IconBot, IconSend, IconBriefcase, IconFile, IconChart, IconPin,
} from "../../components/employer/EmployerIcons.jsx";

// Trang Trợ lý tìm việc AI theo thiết kế mới. Trợ lý ở backend là
// trợ lý tra cứu trên dữ liệu thật của hệ thống (tin đang mở, lương
// trung bình, hồ sơ và lịch phỏng vấn của chính ứng viên) nên câu
// trả lời kèm thẻ việc làm bấm được sang trang chi tiết tin.
const QUICK_CHIPS = [
  { label: "Tìm việc phù hợp", prompt: "__find__" },
  { label: "Phân tích CV", prompt: "CV của tôi cần cải thiện điểm nào?" },
  { label: "Xu hướng thị trường", prompt: "Mức lương trung bình hiện nay là bao nhiêu?" },
  { label: "Luyện phỏng vấn", prompt: "Tôi có lịch phỏng vấn sắp tới không?" },
];

export default function AssistantPage() {
  const [profile, setProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getAssistantProfile();
        if (!cancelled) setProfile(data);
      } catch {
        if (!cancelled) setProfile(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const firstName = profile?.fullName || "bạn";
  const topSkill = profile?.skills?.[0]?.name || "";
  const maxYears = profile?.skills?.reduce(
    (max, s) => Math.max(max, s.yearsExp || 0), 0) || 0;

  const suggestions = [
    {
      text: topSkill
        ? `Dựa vào kỹ năng ${topSkill} của tôi, hãy tìm việc phù hợp đang mở.`
        : "Hãy tìm cho tôi những việc làm mới nhất đang mở.",
      send: topSkill ? `Tìm việc ${topSkill}` : "Tìm việc mới nhất",
    },
    {
      text: "CV của tôi cần cải thiện điểm nào để ứng tuyển tốt hơn?",
      send: "CV của tôi cần cải thiện điểm nào?",
    },
    {
      text: "Mức lương trung bình của Frontend Developer là bao nhiêu?",
      send: "Mức lương trung bình của Frontend Developer là bao nhiêu?",
    },
    {
      text: "Tôi có lịch phỏng vấn sắp tới không? Cho tôi gợi ý chuẩn bị.",
      send: "Tôi có lịch phỏng vấn sắp tới không?",
    },
  ];

  async function ask(text) {
    const content = (text || "").trim();
    if (!content || sending) return;
    setDraft("");
    setMessages((prev) => [...prev, { from: "me", text: content }]);
    setSending(true);
    try {
      const result = await sendAssistantMessage(content);
      setMessages((prev) => [...prev, {
        from: "ai", text: result.reply, jobs: result.jobs || [],
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        from: "ai",
        text: err.message || "Trợ lý đang bận, bạn thử lại sau ít phút nhé.",
        jobs: [],
      }]);
    } finally {
      setSending(false);
    }
  }

  function handleChip(prompt) {
    if (prompt === "__find__") {
      ask(topSkill ? `Tìm việc ${topSkill}` : "Tìm việc mới nhất");
    } else {
      ask(prompt);
    }
  }

  function resetChat() {
    setMessages([]);
    setDraft("");
  }

  const started = messages.length > 0;

  return (
    <div className="canda-layout">
      <div className="canda-main">
        <header className="canda-head">
          <div>
            <h1><IconBot size={24} /> Trợ lý tìm việc AI</h1>
            <p>Hỏi bất cứ điều gì về công việc, CV hoặc xu hướng thị trường.</p>
          </div>
          <button type="button" className="canda-btn" onClick={resetChat}>
            Làm mới
          </button>
        </header>

        {!started && (
          <>
            <div className="canda-hero">
              <span className="canda-hero__orb"><IconBot size={54} /></span>
            </div>
            <div className="canda-suggest">
              {suggestions.map((s) => (
                <button key={s.send} type="button" onClick={() => ask(s.send)}>
                  {s.text}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="canda-thread">
          <div className="canda-msg canda-msg--ai">
            <span className="canda-msg__avatar"><IconBot size={17} /></span>
            <div className="canda-bubble">
              <p>
                Xin chào {firstName}! Tôi là Trợ lý AI của ViecLamViet. Tôi có
                thể giúp bạn tìm việc làm phù hợp, phân tích CV hoặc tư vấn lộ
                trình sự nghiệp. Hôm nay tôi có thể giúp gì cho bạn?
              </p>
            </div>
          </div>

          {messages.map((m, i) => (
            <div
              key={i}
              className={`canda-msg${m.from === "me" ? " canda-msg--me" : " canda-msg--ai"}`}
            >
              {m.from === "ai" && (
                <span className="canda-msg__avatar"><IconBot size={17} /></span>
              )}
              <div className="canda-bubble">
                <p>{m.text}</p>
                {m.jobs?.length > 0 && (
                  <div className="canda-jobs">
                    {m.jobs.map((job) => (
                      <Link key={job.id} to={`/jobs/${job.id}`} className="canda-job">
                        <strong>{job.title}</strong>
                        <span>{job.companyName}</span>
                        <span>
                          {formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryUnit)}
                          {job.location ? ` · ${job.location}` : ""}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="canda-msg canda-msg--ai">
              <span className="canda-msg__avatar"><IconBot size={17} /></span>
              <div className="canda-bubble"><p>Đang tra cứu dữ liệu...</p></div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="canda-chips">
          {QUICK_CHIPS.map((chip) => (
            <button key={chip.label} type="button" onClick={() => handleChip(chip.prompt)}>
              {chip.label}
            </button>
          ))}
        </div>

        <form
          className="canda-composer"
          onSubmit={(e) => { e.preventDefault(); ask(draft); }}
        >
          <IconBot size={20} />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Nhập nội dung cần trợ giúp (Ví dụ: Tìm việc Frontend tại Hà Nội)..."
            maxLength={500}
          />
          <button type="submit" className="canda-send" disabled={sending || !draft.trim()}>
            <IconSend size={16} /> Gửi
          </button>
        </form>
        <p className="canda-foot">
          TRỢ LÝ TRA CỨU TRÊN DỮ LIỆU THẬT CỦA VIECLAMVIET · VIỆC LÀM VÀ SỐ LIỆU LUÔN LẤY TỪ HỆ THỐNG
        </p>
      </div>

      <aside className="canda-side">
        <section className="canda-panel">
          <div className="canda-panel__head">
            <h3>Hồ sơ AI sử dụng</h3>
            <span className="canda-live">LIVE</span>
          </div>
          <p className="canda-panel__sub">
            AI tối ưu câu trả lời dựa trên dữ liệu hiện tại của bạn.
          </p>
          <dl className="canda-facts">
            <div>
              <dt>Địa điểm:</dt>
              <dd>{profile?.address || "Chưa cập nhật"}</dd>
            </div>
            <div>
              <dt>Kinh nghiệm cao nhất:</dt>
              <dd>{maxYears > 0 ? `${maxYears} năm` : "Chưa có kỹ năng"}</dd>
            </div>
            <div>
              <dt>Độ hoàn thiện hồ sơ:</dt>
              <dd>{profile ? `${profile.completeness}%` : "—"}</dd>
            </div>
            <div>
              <dt>CV hiện có:</dt>
              <dd>{profile ? `${profile.cvCount} CV` : "—"}</dd>
            </div>
          </dl>
          <div className="canda-skills">
            <span className="canda-skills__label">KỸ NĂNG CHÍNH</span>
            <div>
              {(profile?.skills || []).slice(0, 6).map((s) => (
                <span key={s.name} className="canda-skill">{s.name}</span>
              ))}
              {(!profile?.skills || profile.skills.length === 0) && (
                <span className="canda-muted">Chưa cập nhật kỹ năng</span>
              )}
            </div>
          </div>
          <div className="canda-goal">
            <span className="canda-skills__label">GIỚI THIỆU BẢN THÂN</span>
            <p>{profile?.summary || "Chưa có phần giới thiệu. Hãy bổ sung ở Hồ sơ của tôi."}</p>
          </div>
          <Link to="/profile" className="canda-update">+ Cập nhật thông tin AI</Link>
        </section>

        <h3 className="canda-benefits-title">Lợi ích của Trợ lý AI</h3>
        <div className="canda-benefit">
          <span><IconBriefcase size={18} /></span>
          <div>
            <strong>Tìm việc thông minh</strong>
            <p>Tự động đối chiếu kỹ năng của bạn với hàng nghìn việc làm.</p>
          </div>
        </div>
        <div className="canda-benefit">
          <span><IconFile size={18} /></span>
          <div>
            <strong>Phân tích hồ sơ</strong>
            <p>Chỉ ra đúng mục còn thiếu trong hồ sơ và CV của bạn.</p>
          </div>
        </div>
        <div className="canda-benefit">
          <span><IconChart size={18} /></span>
          <div>
            <strong>Phân tích lương</strong>
            <p>So sánh mức lương thực tế từ các tin đang mở trên hệ thống.</p>
          </div>
        </div>

        <div className="canda-tip">
          <strong><IconPin size={15} /> Mẹo nhỏ cho bạn</strong>
          <p>
            Hãy thử yêu cầu: “Tìm việc {topSkill || "Java"} tại TP. Hồ Chí Minh”
            để nhận danh sách việc làm thật kèm mức lương chi tiết.
          </p>
        </div>
      </aside>
    </div>
  );
}
