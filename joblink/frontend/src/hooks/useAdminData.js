import { useCallback, useEffect, useState } from "react";

// Hook dùng chung cho các trang admin: nạp dữ liệu qua loader (hàm trong
// adminService), quản lý trạng thái loading / error và cho phép reload
// sau khi thêm/sửa/xóa. Dữ liệu luôn lấy từ API (database) — loader lỗi
// thì error được set để trang báo lỗi, không có dữ liệu dự phòng.
export default function useAdminData(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await loader();
      setData(result);
    } catch (err) {
      setError(err.message || "Không tải được dữ liệu.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, setData, loading, error, reload };
}
