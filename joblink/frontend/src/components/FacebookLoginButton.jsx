import { useEffect, useRef, useState } from "react";
import "../style/FacebookLoginButton.css";

const FACEBOOK_SDK_URL = "https://connect.facebook.net/vi_VN/sdk.js";
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;
// Phiên bản Graph API cho SDK; Meta ngừng hỗ trợ bản cũ thì đổi qua VITE_FACEBOOK_API_VERSION.
const FACEBOOK_API_VERSION = import.meta.env.VITE_FACEBOOK_API_VERSION || "v26.0";

let sdkPromise = null;

// Tải và khởi tạo Facebook SDK một lần cho cả ứng dụng.
function loadFacebookSdk() {
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      window.fbAsyncInit = () => {
        window.FB.init({
          appId: FACEBOOK_APP_ID,
          cookie: false,
          xfbml: false,
          version: FACEBOOK_API_VERSION,
        });
        resolve();
      };

      const script = document.createElement("script");
      script.src = FACEBOOK_SDK_URL;
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.onerror = () => {
        sdkPromise = null;
        script.remove();
        reject(new Error(
          "Không tải được dịch vụ đăng nhập Facebook. Kiểm tra kết nối mạng hoặc tắt trình chặn quảng cáo (Brave Shields, AdBlock) cho trang này."
        ));
      };
      document.body.appendChild(script);
    });
  }

  return sdkPromise;
}

function FacebookIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"
      />
    </svg>
  );
}

// Nút "Đăng nhập với Facebook".
// Người dùng đồng ý trong cửa sổ Facebook -> trả access token qua onAccessToken,
// frontend gửi token này lên backend để kiểm tra (không tự tin dữ liệu ở trình duyệt).
export default function FacebookLoginButton({
  label = "Đăng nhập với Facebook",
  onAccessToken,
  onError,
  disabled = false,
}) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const handlersRef = useRef({ onAccessToken, onError });

  // Luôn gọi hàm xử lý mới nhất của trang cha.
  useEffect(() => {
    handlersRef.current = { onAccessToken, onError };
  });

  // Tải SDK sẵn khi vào trang: FB.login phải chạy ngay trong lúc bấm
  // nếu không trình duyệt sẽ chặn cửa sổ đăng nhập.
  useEffect(() => {
    if (!FACEBOOK_APP_ID) {
      return undefined;
    }

    let cancelled = false;

    loadFacebookSdk()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((error) => {
        // Chỉ báo lỗi khi người dùng bấm nút, không làm phiền người đăng nhập bằng email.
        if (!cancelled) setLoadError(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleClick() {
    const { onError: reportError } = handlersRef.current;

    if (!FACEBOOK_APP_ID) {
      reportError?.(
        "Chưa cấu hình đăng nhập Facebook: thêm VITE_FACEBOOK_APP_ID vào file joblink/frontend/.env.local rồi chạy lại npm run dev."
      );
      return;
    }

    if (loadError) {
      reportError?.(loadError);
      return;
    }

    // Facebook SDK không nhận callback là async function.
    window.FB.login(
      function (response) {
        const accessToken = response.authResponse?.accessToken;

        if (accessToken) {
          handlersRef.current.onAccessToken?.(accessToken);
        } else {
          handlersRef.current.onError?.("Bạn chưa hoàn tất đăng nhập Facebook.");
        }
      },
      // rerequest: hỏi lại quyền email nếu lần trước người dùng đã bỏ chọn.
      { scope: "public_profile,email", auth_type: "rerequest" }
    );
  }

  const loading = Boolean(FACEBOOK_APP_ID) && !ready && !loadError;

  return (
    <button
      type="button"
      className="facebook-login-button"
      onClick={handleClick}
      disabled={disabled || loading}
    >
      <FacebookIcon className="facebook-login-button__icon" />
      <span>{loading ? "Đang tải Facebook..." : label}</span>
    </button>
  );
}
