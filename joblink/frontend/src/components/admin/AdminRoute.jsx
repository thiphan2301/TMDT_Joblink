import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router";
import { getCurrentUser } from "../../services/authService.js";

// Chặn route /admin ở FRONTEND theo vai trò — bổ sung cho phân quyền ở backend
// (AdminAccess): backend là nơi giữ dữ liệu thật, còn component này lo phần
// "ai được nhìn thấy giao diện admin".
//
// Cách dùng trong App.jsx:
//   <Route element={<AdminRoute />}>
//     <Route path="/admin" element={<AdminLayout />}> ... </Route>
//   </Route>
//
// Hành vi:
// - Đã đăng nhập + role = admin  -> cho vào bình thường.
// - Chưa đăng nhập / role khác   -> đá về /login.
// - Không kiểm tra được (backend chưa chạy) -> cũng đá về /login, vì toàn bộ
//   dữ liệu admin lấy từ database qua API, không có chế độ xem offline.
export default function AdminRoute() {
  const [state, setState] = useState("checking"); // checking | allowed | denied

  useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then((user) => {
        if (cancelled) return;
        setState(user && user.role === "admin" ? "allowed" : "denied");
      })
      .catch(() => {
        // Không gọi được /api/auth/me (backend tắt): không xác minh được quyền.
        if (!cancelled) setState("denied");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "checking") {
    return <p style={{ padding: 32, color: "#64748b" }}>Đang kiểm tra quyền truy cập...</p>;
  }
  if (state === "denied") {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
