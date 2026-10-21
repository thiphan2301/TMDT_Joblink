import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import ChatPage from "../chat/ChatPage.jsx";
import { getConversationContext } from "../../services/chatService.js";
import {
  formatSalaryRange, APPLICATION_STATUS_LABELS,
} from "../../components/employer/employerFormat.js";
import {
  IconBriefcase, IconPin, IconCalendar, IconInfo, IconBot,
} from "../../components/employer/EmployerIcons.jsx";

// Trang Tin nhắn của ứng viên theo thiết kế mới: khung chat
// realtime dùng chung (danh sách + cuộc trò chuyện) và cột phải
// "Thông tin tuyển dụng" lấy từ API ngữ cảnh của chính cuộc trò
// chuyện đang mở (tin liên quan, trạng thái đơn, lịch phỏng vấn).
export default function MessagesPage() {
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get("c");
  const [context, setContext] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!conversationId) {
        setContext(null);
        return;
      }
      try {
        const data = await getConversationContext(conversationId);
        if (!cancelled) setContext(data);
      } catch {
        if (!cancelled) setContext(null);
      }
    })();
    return () => { cancelled = true; };
  }, [conversationId]);

  const interview = context?.nextInterviewAt ? new Date(context.nextInterviewAt) : null;
  const interviewIsLink = context?.nextInterviewLocation
    && /^https?:\/\//i.test(context.nextInterviewLocation);

  return (
    <div className="cand-msg">
      <div className="cand-msg__main">
        <ChatPage />
      </div>

      <aside className="cand-msg__side">
        <section className="cand-msg__panel">
          <h3><IconInfo size={17} /> Thông tin tuyển dụng</h3>
          {context?.jobId ? (
            <dl className="cand-msg__facts">
              <div>
                <dt><IconBriefcase size={15} /> VỊ TRÍ ỨNG TUYỂN</dt>
                <dd>
                  <Link to={`/jobs/${context.jobId}`}>{context.jobTitle}</Link>
                  <span>{context.companyName}</span>
                </dd>
              </div>
              <div>
                <dt>MỨC LƯƠNG</dt>
                <dd>{formatSalaryRange(context.salaryMin, context.salaryMax, context.salaryUnit)}</dd>
              </div>
              <div>
                <dt><IconPin size={15} /> ĐỊA ĐIỂM</dt>
                <dd>{context.location || "Chưa cập nhật"}</dd>
              </div>
              <div>
                <dt>TRẠNG THÁI HỒ SƠ</dt>
                <dd>
                  {context.applicationStatus
                    ? (
                      <span className="cand-msg__status">
                        {APPLICATION_STATUS_LABELS[context.applicationStatus]
                          || context.applicationStatus}
                      </span>
                    )
                    : "Bạn chưa ứng tuyển tin này"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="cand-msg__muted">
              Cuộc trò chuyện này chưa gắn với một tin tuyển dụng cụ thể.
              Chọn một cuộc trò chuyện để xem thông tin liên quan.
            </p>
          )}

          <h4 className="cand-msg__sub"><IconCalendar size={16} /> Lịch phỏng vấn sắp tới</h4>
          {interview ? (
            <div className="cand-msg__interview">
              <div className="cand-msg__date">
                <strong>{interview.getDate()}</strong>
                <span>THG {interview.getMonth() + 1}</span>
              </div>
              <div className="cand-msg__interview-main">
                <strong>Phỏng vấn {context.jobTitle}</strong>
                <span>
                  {String(interview.getHours()).padStart(2, "0")}:
                  {String(interview.getMinutes()).padStart(2, "0")} ·{" "}
                  {interview.getDate()}/{interview.getMonth() + 1}/{interview.getFullYear()}
                </span>
                {context.nextInterviewLocation && !interviewIsLink && (
                  <span>{context.nextInterviewLocation}</span>
                )}
                {context.nextInterviewNotes && (
                  <span>{context.nextInterviewNotes}</span>
                )}
              </div>
              {interviewIsLink && (
                <a
                  className="cand-msg__join"
                  href={context.nextInterviewLocation}
                  target="_blank"
                  rel="noreferrer"
                >
                  Tham gia cuộc họp
                </a>
              )}
            </div>
          ) : (
            <p className="cand-msg__muted">Chưa có lịch phỏng vấn nào được xếp cho tin này.</p>
          )}
        </section>

        <section className="cand-msg__coach">
          <h3><IconBot size={18} /> AI Career Coach</h3>
          <p>Bạn cần tư vấn về cách trả lời phỏng vấn tại {context?.companyName || "công ty này"}?</p>
          <Link to="/tro-ly-ai" className="cand-msg__coach-btn">Trò chuyện ngay</Link>
        </section>
      </aside>
    </div>
  );
}
