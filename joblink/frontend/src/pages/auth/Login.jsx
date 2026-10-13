import { useState } from 'react';
import { useNavigate } from 'react-router'; // Thêm useNavigate
import {
    ShieldCheck,
    CheckCircle2,
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    ArrowLeft // Thêm icon ArrowLeft
} from 'lucide-react';
import GoogleLoginButton from '../../components/GoogleLoginButton';
import { loginWithGoogle } from '../../services/authService';
import '../../style/login.css';

export default function Login({ onNavigateToRegister, onLoginSuccess }) { // Nhận thêm prop onLoginSuccess
    const navigate = useNavigate(); // Khởi tạo điều hướng
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [googleLoading, setGoogleLoading] = useState(false);

    // Google trả ID token -> gửi lên backend kiểm tra và tạo phiên đăng nhập
    const handleGoogleCredential = async (credential) => {
        if (googleLoading) return;

        setError('');
        setGoogleLoading(true);

        try {
            const user = await loginWithGoogle(credential);
            if (onLoginSuccess) {
                onLoginSuccess(user);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Đăng nhập với:', { email, password, rememberMe });

        // Bạn có thể gọi onLoginSuccess() ở đây nếu validate thành công
        if (onLoginSuccess) {
            onLoginSuccess();
        }
    };

    return (
        <div className="auth-container">
            {/* Background hiệu ứng */}
            <div className="blob-bg-1"></div>
            <div className="blob-bg-2"></div>
            <div className="blob-bg-3"></div>

            {/* Container chính */}
            <div className="auth-card">

                {/* Cột trái: Thông tin */}
                <div className="login-sidebar">
                    <div>
                        {/* NÚT QUAY LẠI TRANG CHỦ */}
                        <button
                            type="button"
                            onClick={() => navigate('/discover')} // Quay lại trang chủ
                            className="flex items-center text-slate-500 hover:text-blue-600 transition-colors text-sm mb-8 font-medium group"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1.5 transform group-hover:-translate-x-1 transition-transform" />
                            Quay lại trang chủ
                        </button>

                        {/* Logo */}
                        <div className="flex items-center gap-3 mb-10">
                            <div className="bg-blue-600 rounded-xl p-2 flex items-center justify-center">
                                <ShieldCheck className="text-white w-6 h-6" />
                            </div>
                            <span className="font-bold text-xl text-slate-800">ViecLamViet</span>
                        </div>

                        {/* Tiêu đề & Mô tả */}
                        <h1 className="text-3xl font-bold text-slate-800 leading-tight mb-4">
                            Chào mừng bạn quay trở<br />lại với <span className="text-blue-600">ViecLamViet</span>
                        </h1>
                        <p className="text-slate-500 text-sm mb-10 leading-relaxed max-w-md">
                            Đăng nhập để tiếp tục hành trình sự nghiệp, kết nối với những nhà tuyển dụng hàng đầu và quản lý hồ sơ chuyên nghiệp của bạn.
                        </p>

                        {/* Danh sách tính năng */}
                        <div className="flex flex-col gap-6">
                            <div className="flex gap-4">
                                <div className="mt-1">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800 text-sm">Hơn 50,000+ việc làm mới</h3>
                                    <p className="text-slate-500 text-xs mt-1">Cập nhật mỗi ngày từ các doanh nghiệp uy tín.</p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="mt-1">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800 text-sm">Kết nối trực tiếp HR</h3>
                                    <p className="text-slate-500 text-xs mt-1">Phản hồi nhanh chóng từ nhà tuyển dụng.</p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="mt-1">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800 text-sm">Bảo mật thông tin</h3>
                                    <p className="text-slate-500 text-xs mt-1">Cam kết bảo vệ quyền riêng tư của ứng viên.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Link chuyển Đăng ký */}
                    <div className="mt-12 md:mt-0 pt-8">
                        <p className="text-slate-500 text-xs mb-2">Bạn chưa có tài khoản?</p>
                        <button
                            type="button"
                            onClick={onNavigateToRegister}
                            className="inline-flex items-center text-blue-600 font-semibold text-sm hover:text-blue-700 transition-colors group"
                        >
                            Đăng ký tài khoản mới ngay
                            <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Cột phải: Form đăng nhập (Giữ nguyên) */}
                <div className="login-form-wrapper">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Đăng nhập</h2>
                    <p className="text-slate-500 text-sm mb-8">Chào mừng bạn quay trở lại!</p>

                    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                                Email
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-field"
                                    placeholder="name@company.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Mật khẩu */}
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                                    Mật khẩu
                                </label>
                                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                                    Quên mật khẩu?
                                </a>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field-pass"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Ghi nhớ đăng nhập */}
                        <div className="flex items-center mt-1">
                            <input
                                id="remember-me"
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 cursor-pointer select-none">
                                Ghi nhớ đăng nhập
                            </label>
                        </div>

                        {/* Nút Đăng nhập */}
                        <button type="submit" className="btn-primary">
                            Đăng nhập ngay
                        </button>
                    </form>

                    {/* Đường phân cách */}
                    <div className="mt-8 mb-6 flex items-center">
                        <div className="flex-grow border-t border-slate-200"></div>
                        <span className="mx-4 text-xs font-medium text-slate-400 tracking-wider">
                            HOẶC ĐĂNG NHẬP VỚI
                        </span>
                        <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    {/* Nút Mạng xã hội */}
                    <div className="grid grid-cols-2 gap-4">
                        <GoogleLoginButton
                            text="signin_with"
                            size="large"
                            fallbackClassName="btn-social"
                            iconClassName="w-4 h-4"
                            onCredential={handleGoogleCredential}
                            onError={setError}
                        />
                        <button type="button" className="btn-social">
                            <svg className="w-4 h-4 fill-blue-600" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            <span>Facebook</span>
                        </button>
                    </div>

                    {/* Trạng thái đăng nhập Google */}
                    {googleLoading && (
                        <p className="auth-status">Đang đăng nhập với Google…</p>
                    )}
                    {error && (
                        <p className="auth-error" role="alert">{error}</p>
                    )}
                </div>
            </div>
        </div>
    );
}