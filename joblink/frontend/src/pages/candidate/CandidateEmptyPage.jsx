// Trang trống cho các mục ở thanh bên trái chưa có thiết kế được
// yêu cầu trong đợt này — theo yêu cầu của chủ dự án: phần chưa có
// giao diện thì để trống, không tự vẽ thêm nội dung.
export default function CandidateEmptyPage() {
  return <div className="cand-empty" aria-hidden="true" />;
}
