
import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
    ShieldCheck,
    CheckCircle2,
    Mail,
    Lock,
    Eye,
    EyeOff,
    User,
    Building2,
    ArrowRight,
    ArrowLeft
} from 'lucide-react';

import '../../style/register.css';

const API_URL = 'http://localhost:8080/api/auth/register';

export default function Register({ onNavigateToLogin }) {
    const navigate = useNavigate();

    const [role, setRole] = useState('candidate');

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreed, setAgreed] = useState(false);

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Kiểm tra độ mạnh của mật khẩu
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    const passwordIsValid =
        hasMinLength &&
        hasUppercase &&
        hasNumber &&
        hasSpecial;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const normalizedEmail = email.trim();

        if (!normalizedEmail) {
            setError('Vui lòng nhập email.');
            return;
        }

        if (!passwordIsValid) {
            setError(
                'Mật khẩu phải có ít nhất 8 ký tự, một chữ hoa, một chữ số và một ký tự đặc biệt.'
            );
            return;
        }

        if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không trùng khớp!');
            return;
        }

        if (!agreed) {
            setError('Vui lòng đồng ý với điều khoản sử dụng.');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: normalizedEmail,
                    password: password,
                    role: role
                })
            });

            // Tránh lỗi nếu server trả response không có JSON
            const data = await response.json().catch(() => ({}));

            if (response.ok) {
                alert(
                    data.message ||
                    'Đăng ký thành công! Vui lòng đăng nhập.'
                );

                if (onNavigateToLogin) {
                    onNavigateToLogin();
                } else {
                    navigate('/login');
                }
            } else {
                setError(
                    data.message ||
                    data.detail ||
                    'Đăng ký thất bại. Vui lòng thử lại.'
                );
            }
        } catch (err) {
            console.error('Lỗi đăng ký:', err);

            setError(
                'Không thể kết nối đến server. ' +
                'Hãy kiểm tra Spring Boot và kết nối mạng.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="blob-bg-1"></div>
            <div className="blob-bg-2"></div>

            <div className="auth-card">
                {/* Sidebar */}
                <div className="register-sidebar">
                    <div>
                        <button
                            type="button"
                            onClick={() => navigate('/discover')}
                            className="flex items-center text-slate-300 hover:text-white transition-colors text-xs md:text-sm mb-6 md:mb-8 font-medium group"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1.5 transform group-hover:-translate-x-1 transition-transform" />
                            Quay lại trang chủ
                        </button>

                        <div className="flex items-center gap-3 mb-8">
                            <div className="bg-blue-600 rounded-xl p-2 flex items-center justify-center">
                                <ShieldCheck className="text-white w-6 h-6" />
                            </div>

                            <span className="font-bold text-xl tracking-tight text-white">
                                ViecLamViet
                            </span>
                        </div>

                        <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-4 text-white">
                            Chào mừng bạn đến với mạng lưới nhân tài số 1 Việt Nam
                        </h1>

                        <div className="flex flex-col gap-4 text-xs md:text-sm text-white">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>
                                    Tìm việc làm nhanh chóng, hiệu quả
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>
                                    Kết nối trực tiếp với nhà tuyển dụng
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form đăng ký */}
                <div className="register-form-wrapper">
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">
                        Đăng ký tài khoản
                    </h2>

                    <p className="text-slate-500 text-xs mb-6">
                        Khởi đầu hành trình sự nghiệp mới cùng ViecLamViet
                    </p>

                    {error && (
                        <div
                            role="alert"
                            className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm"
                        >
                            {error}
                        </div>
                    )}

                    <form
                        className="flex flex-col gap-4"
                        onSubmit={handleSubmit}
                    >
                        {/* Vai trò */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-2">
                                Bạn đăng ký với tư cách là:
                            </label>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    aria-pressed={role === 'candidate'}
                                    onClick={() => setRole('candidate')}
                                    className={`border rounded-lg p-3 text-left transition ${
                                        role === 'candidate'
                                            ? 'border-blue-600 bg-blue-50'
                                            : 'border-slate-200'
                                    }`}
                                >
                                    <div
                                        className={`p-2 inline-block rounded-full mb-1 ${
                                            role === 'candidate'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-slate-100 text-slate-500'
                                        }`}
                                    >
                                        <User className="w-4 h-4" />
                                    </div>

                                    <span className="block font-bold text-xs text-slate-800">
                                        Ứng viên
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    aria-pressed={role === 'employer'}
                                    onClick={() => setRole('employer')}
                                    className={`border rounded-lg p-3 text-left transition ${
                                        role === 'employer'
                                            ? 'border-blue-600 bg-blue-50'
                                            : 'border-slate-200'
                                    }`}
                                >
                                    <div
                                        className={`p-2 inline-block rounded-full mb-1 ${
                                            role === 'employer'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-slate-100 text-slate-500'
                                        }`}
                                    >
                                        <Building2 className="w-4 h-4" />
                                    </div>

                                    <span className="block font-bold text-xs text-slate-800">
                                        Nhà tuyển dụng
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label
                                htmlFor="register-email"
                                className="block text-xs font-medium text-slate-700 mb-1"
                            >
                                Email <span className="text-red-500">*</span>
                            </label>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-4 w-4 text-slate-400" />
                                </div>

                                <input
                                    type="email"
                                    id="register-email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-9 py-2 border border-slate-300 rounded-md text-sm"
                                    placeholder="example@email.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Mật khẩu */}
                        <div>
                            <label
                                htmlFor="register-password"
                                className="block text-xs font-medium text-slate-700 mb-1"
                            >
                                Mật khẩu <span className="text-red-500">*</span>
                            </label>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-slate-400" />
                                </div>

                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="register-password"
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-md text-sm"
                                    placeholder="Nhập mật khẩu"
                                    required
                                />

                                <button
                                    type="button"
                                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword
                                        ? <EyeOff className="h-4 w-4" />
                                        : <Eye className="h-4 w-4" />
                                    }
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-1 mt-2 text-[10px]">
                                <span className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    <CheckCircle2 className="w-3 h-3" />
                                    Ít nhất 8 ký tự
                                </span>

                                <span className={`flex items-center gap-1 ${hasUppercase ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    <CheckCircle2 className="w-3 h-3" />
                                    Chữ hoa
                                </span>

                                <span className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    <CheckCircle2 className="w-3 h-3" />
                                    Chữ số
                                </span>

                                <span className={`flex items-center gap-1 ${hasSpecial ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    <CheckCircle2 className="w-3 h-3" />
                                    Ký tự đặc biệt
                                </span>
                            </div>
                        </div>

                        {/* Xác nhận mật khẩu */}
                        <div>
                            <label
                                htmlFor="confirm-password"
                                className="block text-xs font-medium text-slate-700 mb-1"
                            >
                                Xác nhận mật khẩu <span className="text-red-500">*</span>
                            </label>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-slate-400" />
                                </div>

                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    id="confirm-password"
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-md text-sm"
                                    placeholder="Nhập lại mật khẩu"
                                    required
                                />

                                <button
                                    type="button"
                                    aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    {showConfirmPassword
                                        ? <EyeOff className="h-4 w-4" />
                                        : <Eye className="h-4 w-4" />
                                    }
                                </button>
                            </div>
                        </div>

                        {/* Điều khoản */}
                        <div className="flex items-start mt-1">
                            <input
                                id="terms"
                                type="checkbox"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                className="h-3.5 w-3.5 rounded mt-0.5"
                                required
                            />

                            <label
                                htmlFor="terms"
                                className="ml-2 block text-[11px] text-slate-600 leading-tight"
                            >
                                Tôi đã đọc và đồng ý với điều khoản sử dụng.
                            </label>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 text-white py-2 rounded-md font-medium text-sm hover:bg-blue-700 transition flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                'Đang xử lý...'
                            ) : (
                                <span>
                                    Đăng ký tài khoản{' '}
                                    <ArrowRight className="w-3.5 h-3.5 inline" />
                                </span>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-xs text-slate-500 mt-4">
                        Bạn đã có tài khoản?{' '}
                        <button
                            type="button"
                            onClick={
                                onNavigateToLogin ||
                                (() => navigate('/login'))
                            }
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
