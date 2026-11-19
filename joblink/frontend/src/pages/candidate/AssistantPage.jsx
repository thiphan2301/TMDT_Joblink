import { useEffect, useRef, useState } from "react";
import { sendAssistantMessage } from "../../services/candidateService.js";
import { IconBot, IconSend } from "../../components/employer/EmployerIcons.jsx";

const INITIAL_MESSAGE = "Xin chào bạn, tôi có thể giúp gì cho bạn?";

export default function AssistantPage() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "ai", text: INITIAL_MESSAGE },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending, open]);

  async function ask(text) {
    const content = (text || "").trim();
    if (!content || sending) return;

    setDraft("");
    setMessages((previous) => [
      ...previous,
      { from: "me", text: content },
    ]);
    setSending(true);

    try {
      const result = await sendAssistantMessage(content);
      setMessages((previous) => [
        ...previous,
        { from: "ai", text: result.reply },
      ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          from: "ai",
          text: error.message || "Trợ lý đang bận, bạn thử lại sau ít phút nhé.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function resetChat() {
    setMessages([{ from: "ai", text: INITIAL_MESSAGE }]);
    setDraft("");
  }

  return (
    <div className="assistant-widget">
      {open && (
        <section
          className="assistant-widget__panel"
          aria-label="Khung chat Trợ lý AI"
        >
          <header className="assistant-widget__header">
            <div>
              <span className="assistant-widget__icon">
                <IconBot size={20} />
              </span>
              <div>
                <strong>Trợ lý AI</strong>
                <small>Ollama local</small>
              </div>
            </div>
            <div className="assistant-widget__header-actions">
              <button
                type="button"
                onClick={resetChat}
                className="assistant-widget__reset"
              >
                Làm mới
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="assistant-widget__close"
                aria-label="Đóng khung chat"
              >
                ×
              </button>
            </div>
          </header>

          <div className="assistant-widget__thread" aria-live="polite">
            {messages.map((message, index) => (
              <div
                key={`${message.from}-${index}`}
                className={`assistant-widget__message assistant-widget__message--${message.from}`}
              >
                {message.from === "ai" && (
                  <span className="assistant-widget__avatar">
                    <IconBot size={16} />
                  </span>
                )}
                <div className="assistant-widget__bubble">
                  {message.text}
                </div>
              </div>
            ))}

            {sending && (
              <div className="assistant-widget__message assistant-widget__message--ai">
                <span className="assistant-widget__avatar">
                  <IconBot size={16} />
                </span>
                <div className="assistant-widget__bubble assistant-widget__typing">
                  AI đang xử lý<span>...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            className="assistant-widget__composer"
            onSubmit={(event) => {
              event.preventDefault();
              ask(draft);
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Nhập câu hỏi..."
              maxLength={500}
              aria-label="Nội dung câu hỏi"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label="Gửi câu hỏi"
            >
              <IconSend size={17} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className={`assistant-widget__launcher${open ? " is-open" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? "Đóng Trợ lý AI" : "Mở Trợ lý AI"}
        aria-expanded={open}
      >
        {open ? "×" : <IconBot size={27} />}
      </button>
    </div>
  );
}
