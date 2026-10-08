import { useState } from 'react';
import {
    ShieldCheck,
    CheckCircle2,
    Mail,
    Lock,
    Eye,
    EyeOff,
    User,
    Building2,
    ArrowRight
} from 'lucide-react';
import './css/register.css';

export default function Register({ onNavigateToLogin }) {
    const [role, setRole] = useState('candidate');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreed, setAgreed] = useState(false);

    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert('Mật khẩu xác nhận không trùng khớp!');
            return;
        }
        console.log('Đăng ký:', { role, email, password, agreed });
    };

    return (
        <div className="auth-container">
            {/* Background hiệu ứng */}
            <div className="blob-bg-1"></div>
            <div className="blob-bg-2"></div>

            {/* Container chính */}
            <div className="auth-card">

                {/* Cột trái: Thông tin (Nền xanh đậm) */}
                <div className="register-sidebar">
                    <div>
                        {/* Logo */}
                        <div className="flex items-center gap-3 mb-8">
                            <div className="bg-blue-600 rounded-xl p-2 flex items-center justify-center">
                                <ShieldCheck className="text-white w-6 h-6" />
                            </div>
                            <span className="font-bold text-xl tracking-tight">ViecLamViet</span>
                        </div>

                        {/* Tiêu đề & Mô tả */}
                        <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-4">
                            Chào mừng bạn đến với mạng lưới nhân tài số 1 Việt Nam
                        </h1>
                        <p className="text-slate-300 text-xs md:text-sm mb-8 leading-relaxed">
                            Kết nối với hàng ngàn cơ hội nghề nghiệp từ các công ty hàng đầu. Xây dựng hồ sơ chuyên nghiệp và bứt phá sự nghiệp ngay hôm nay.
                        </p>

                        {/* Danh sách tính năng */}
                        <div className="flex flex-col gap-4 text-xs md:text-sm">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Tìm việc làm nhanh chóng, hiệu quả</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Xây dựng hồ sơ năng lực chuyên nghiệp</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Nhận gợi ý việc làm phù hợp mỗi ngày</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Kết nối trực tiếp với nhà tuyển dụng</span>
                            </div>
                        </div>
                    </div>

                    {/* Testimonial Box */}
                    <div className="mt-8 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                        <p className="text-xs text-slate-300 italic mb-3">
                            "ViecLamViet đã giúp tôi tìm được công việc kỹ sư phần mềm tại một tập đoàn đa quốc gia chỉ trong 2 tuần. Quy trình rất chuyên nghiệp và nhanh chóng."
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-xs text-white">
                                T.N
                            </div>
                            <div>
                                <h4 className="text-xs font-bold">Trần Nam</h4>
                                <p className="text-[10px] text-slate-400">Senior Frontend Developer</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cột phải: Form đăng ký */}
                <div className="register-form-wrapper">
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">Đăng ký tài khoản</h2>
                    <p className="text-slate-500 text-xs mb-6">Khởi đầu hành trình sự nghiệp mới cùng ViecLamViet</p>

                    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                        {/* Chọn Vai Trò */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-2">
                                Bạn đăng ký với tư cách là:
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRole('candidate')}
                                    className={`role-card-btn ${role === 'candidate' ? 'role-card-active' : 'role-card-inactive'}`}
                                >
                                    <div className={`p-2 rounded-full mb-1 ${role === 'candidate' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        <User className="w-4 h-4" />
                                    </div>
                                    <span className="font-bold text-xs">Ứng viên</span>
                                    <span className="text-[10px] text-slate-400 mt-0.5">Tôi đang tìm kiếm cơ hội việc làm</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setRole('employer')}
                                    className={`role-card-btn ${role === 'employer' ? 'role-card-active' : 'role-card-inactive'}`}
                                >
                                    <div className={`p-2 rounded-full mb-1 ${role === 'employer' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        <Building2 className="w-4 h-4" />
                                    </div>
                                    <span className="font-bold text-xs">Nhà tuyển dụng</span>
                                    <span className="text-[10px] text-slate-400 mt-0.5">Tôi muốn tìm kiếm nhân tài</span>
                                </button>
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-xs font-medium text-slate-700 mb-1">
                                Email <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-4 w-4 text-slate-400" />
                                </div>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="register-input-field"
                                    placeholder="example@email.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Mật khẩu */}
                        <div>
                            <label htmlFor="password" className="block text-xs font-medium text-slate-700 mb-1">
                                Mật khẩu <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-slate-400" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="register-input-pass"
                                    placeholder="Nhập mật khẩu"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>

                            {/* Chỉ báo độ bảo mật */}
                            <div className="mt-2 text-[10px] text-slate-500">
                                <div className="flex justify-between mb-1">
                                    <span>Độ bảo mật: <strong className="text-slate-700">{password ? 'Đã nhập' : 'Chưa nhập'}</strong></span>
                                </div>
                                <div className="grid grid-cols-2 gap-1 mt-1 text-[10px]">
                  <span className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3 h-3" /> Trên 8 ký tự
                  </span>
                                    <span className={`flex items-center gap-1 ${hasUppercase ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3 h-3" /> Chữ hoa
                  </span>
                                    <span className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3 h-3" /> Số
                  </span>
                                    <span className={`flex items-center gap-1 ${hasSpecial ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3 h-3" /> Ký tự đặc biệt
                  </span>
                                </div>
                            </div>
                        </div>

                        {/* Xác nhận mật khẩu */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-xs font-medium text-slate-700 mb-1">
                                Xác nhận mật khẩu <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-slate-400" />
                                </div>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    id="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="register-input-pass"
                                    placeholder="Nhập lại mật khẩu"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Điều khoản sử dụng */}
                        <div className="flex items-start mt-1">
                            <input
                                id="terms"
                                type="checkbox"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer mt-0.5"
                                required
                            />
                            <label htmlFor="terms" className="ml-2 block text-[11px] text-slate-600 leading-tight">
                                Tôi đã đọc và đồng ý với <a href="#" className="text-blue-600 font-medium hover:underline">Điều khoản sử dụng</a> và <a href="#" className="text-blue-600 font-medium hover:underline">Chính sách bảo mật</a> của ViecLamViet.
                            </label>
                        </div>

                        {/* Nút Đăng ký */}
                        <button type="submit" className="btn-register-submit">
                            <span>Đăng ký tài khoản</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </form>

                    {/* Đường phân cách */}
                    <div className="mt-4 mb-4 flex items-center">
                        <div className="flex-grow border-t border-slate-200"></div>
                        <span className="mx-3 text-[10px] font-medium text-slate-400 tracking-wider">
              HOẶC ĐĂNG KÝ BẰNG
            </span>
                        <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    {/* Nút Mạng xã hội */}
                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" className="btn-register-social">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z" />
                                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
                                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.3-.7-.5-1.5-.5-2.3z" />
                                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 22.3 12 23z" />
                            </svg>
                            <span>Google</span>
                        </button>
                        <button type="button" className="btn-register-social">
                            <svg className="w-3.5 h-3.5 fill-blue-600" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            <span>Facebook</span>
                        </button>
                    </div>

                    {/* Chuyển qua Đăng nhập */}
                    <p className="text-center text-xs text-slate-500 mt-4">
                        Bạn đã có tài khoản?{' '}
                        <button
                            type="button"
                            onClick={onNavigateToLogin}
                            className="text-blue-600 font-bold hover:underline"
                        >
                            Đăng nhập ngay
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}