import { Link } from "react-router";
import {
  IconMail, IconPhone, IconPin, IconFacebook, IconTwitter,
  IconLinkedin, IconInstagram,
} from "../employer/EmployerIcons.jsx";
import "../../style/Public.css";

// Chân trang của các trang công khai theo thiết kế mới: các liên
// kết trỏ về đúng trang đang có trong ứng dụng, thông tin liên
// hệ lấy theo chân trang mẫu của bản thiết kế.
export default function PublicFooter() {
  return (
      <footer className="pub-footer">
        <div className="pub-footer__in">
          <div className="pub-footer__cols">
            <div>
              <div className="pub-footer__brand">ViecLamViet</div>
              <p>
                Nền tảng tuyển dụng hàng đầu kết nối nhân tài với các cơ
                hội nghề nghiệp tốt nhất tại Việt Nam và quốc tế.
              </p>
              <div className="pub-social" aria-hidden="true">
                <span><IconFacebook size={15} /></span>
                <span><IconTwitter size={15} /></span>
                <span><IconLinkedin size={15} /></span>
                <span><IconInstagram size={15} /></span>
              </div>
            </div>
            <div>
              <h4>Dành cho ứng viên</h4>
              <Link to="/jobs">Tìm kiếm việc làm</Link>
              <Link to="/profile">Hồ sơ của tôi</Link>
              <Link to="/tro-ly-ai">Trợ lý việc làm AI</Link>
              <Link to="/discover">Công ty uy tín</Link>
            </div>
            <div>
              <h4>Dành cho nhà tuyển dụng</h4>
              <Link to="/login">Đăng tuyển dụng</Link>
              <Link to="/login">Tìm kiếm ứng viên</Link>
              <Link to="/login">Bảng giá dịch vụ</Link>
            </div>
            <div>
              <h4>Liên hệ</h4>
              <p><IconMail size={14} /> contact@vieclamviet.vn</p>
              <p><IconPhone size={14} /> +84 28 1234 5678</p>
              <p>
                <IconPin size={14} /> Tầng 5, Tòa nhà Innovation, Công
                viên Phần mềm Quang Trung, TP.HCM
              </p>
            </div>
          </div>
          <div className="pub-footer__bottom">
            <span>© 2024 ViecLamViet. Tất cả quyền được bảo lưu.</span>
            <span className="pub-footer__links">
            <span>Điều khoản sử dụng</span>
            <span>Chính sách bảo mật</span>
          </span>
          </div>
        </div>
      </footer>
  );
}