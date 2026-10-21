import { useCallback, useEffect, useState } from "react";

// Hook dùng chung cho các trang nhà tuyển dụng: nạp dữ liệu qua loader
// (hàm trong employerService / chatService), quản lý loading / error
// và cho phép reload sau khi thêm/sửa/xóa.
export default function useEmployerData(loader, deps = []) {
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
