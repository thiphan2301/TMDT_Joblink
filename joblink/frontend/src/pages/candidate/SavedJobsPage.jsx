import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import JobCard from "../../components/JobCard";
import { getJobs } from "../../services/jobService";
import useSavedJobs from "../../hooks/useSavedJobs";
import "../../style/ShellPages.css";

// Trang Việc làm đã lưu trong khung gốc, dựng theo ảnh thiết kế gốc
// của nhóm (2026-10-21). Danh sách lưu nằm ở trình duyệt
// (useSavedJobs, cùng khóa với trang Khám phá); thông tin việc làm
// lấy thật từ API việc làm.
export default function SavedJobsPage() {
  const navigate = useNavigate();
  const { savedIds, toggleSave, saveError } = useSavedJobs();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getJobs();
        if (!cancelled) setJobs(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const savedJobs = jobs.filter((job) => savedIds.includes(job.id));

  return (
    <div className="dp-page">
      <div className="dp-head">
        <div>
          <h1>Việc làm đã lưu</h1>
          <p className="dp-sub">
            {savedJobs.length} cơ hội bạn yêu thích. Sẵn sàng cho bước tiếp
            theo?
          </p>
        </div>
        <Link className="dp-btn dp-btn--light" to="/discover">
          Khám phá thêm →
        </Link>
      </div>

      {saveError && <div className="dp-notice">{saveError}</div>}
      {failed && (
        <div className="dp-notice">
          Chưa tải được danh sách việc làm. Hãy chắc chắn backend đang chạy
          rồi tải lại trang.
        </div>
      )}

      {loading ? (
        <p className="dp-empty">Đang tải…</p>
      ) : savedJobs.length === 0 ? (
        <div className="dp-panel dp-empty-panel">
          <p className="dp-empty">
            Bạn chưa lưu việc làm nào. Nhấn “Lưu” ở một tin tuyển dụng để nó
            xuất hiện tại đây.
          </p>
          <Link className="dp-btn" to="/discover">
            Khám phá việc làm
          </Link>
        </div>
      ) : (
        <div className="sj-grid">
          {savedJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              saved
              onSave={toggleSave}
              onView={(item) => navigate(`/jobs/${item.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
