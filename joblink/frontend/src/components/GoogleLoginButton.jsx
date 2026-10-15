import { useEffect, useRef } from "react";
import "../style/GoogleLoginButton.css";

const GOOGLE_SCRIPT_URL = "https://accounts.google.com/gsi/client";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

let scriptPromise = null;

// Tải thư viện Google Identity Services một lần cho cả ứng dụng.
function loadGoogleScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GOOGLE_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        script.remove();
        reject(new Error("Không tải được dịch vụ đăng nhập Google. Kiểm tra kết nối mạng."));
      };
      document.head.appendChild(script);
    });
  }

  return scriptPromise;
}

function GoogleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z" />
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
      <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.3-.7-.5-1.5-.5-2.3z" />
      <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 22.3 12 23z" />
    </svg>
  );
}

// Nút "Đăng nhập với Google" chính thức của Google.
// Sau khi người dùng chọn tài khoản, Google trả ID token qua onCredential.
// text: "signin_with" (Đăng nhập với Google) | "signup_with" (Đăng ký với Google)
// size: "large" | "medium"
export default function GoogleLoginButton({
  text = "signin_with",
  size = "large",
  onCredential,
  onError,
  fallbackClassName = "btn-social",
  iconClassName = "w-4 h-4",
}) {
  const containerRef = useRef(null);
  const handlersRef = useRef({ onCredential, onError });

  // Luôn gọi hàm xử lý mới nhất mà không phải khởi tạo lại nút Google.
  useEffect(() => {
    handlersRef.current = { onCredential, onError };
  });

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      return undefined;
    }

    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        const container = containerRef.current;

        if (cancelled || !container) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => handlersRef.current.onCredential?.(response.credential),
        });

        window.google.accounts.id.renderButton(container, {
          type: "standard",
          theme: "outline",
          size,
          text,
          shape: "rectangular",
          logo_alignment: "center",
          locale: "vi",
          // Google yêu cầu độ rộng 200–400px.
          width: Math.min(400, Math.max(200, container.offsetWidth)),
        });
      })
      .catch((error) => {
        if (!cancelled) {
          handlersRef.current.onError?.(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [text, size]);

  // Chưa cấu hình Client ID: giữ nút cũ và báo cách cấu hình khi bấm.
  if (!GOOGLE_CLIENT_ID) {
    return (
      <button
        type="button"
        className={fallbackClassName}
        onClick={() =>
          onError?.(
            "Chưa cấu hình đăng nhập Google: thêm VITE_GOOGLE_CLIENT_ID vào file joblink/frontend/.env.local rồi chạy lại npm run dev."
          )
        }
      >
        <GoogleIcon className={iconClassName} />
        <span>Google</span>
      </button>
    );
  }

  return <div ref={containerRef} className="google-login-button" />;
}
