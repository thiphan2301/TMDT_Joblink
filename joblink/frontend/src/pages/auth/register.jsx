
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

const API_URL = '/api/auth';

export default function Register({ onNavigateToLogin }) {

    const navigate = useNavigate();

    const [role, setRole] = useState('candidate');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreed, setAgreed] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

    const [otpStep, setOtpStep] = useState(false);
    const [otp, setOtp] = useState('');
    const [pendingEmail, setPendingEmail] = useState('');

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);

    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    const passwordIsValid =
        hasMinLength &&
        hasUppercase &&
        hasNumber &&
        hasSpecial;

    const goToLogin = () => {
        if (onNavigateToLogin) {
            onNavigateToLogin();
        } else {
            navigate('/login');
        }
    };

    const requestApi = async (endpoint, body) => {
        const response = await fetch(
            `${API_URL}${endpoint}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.message ||
                data.detail ||
                data.error ||
                `Yêu cầu thất bại (${response.status})`
            );
        }

        return data;
    };

    // GỬI YÊU CẦU ĐĂNG KÝ
    const handleSubmit = async (e) => {
        e.preventDefault();

        setError('');
        setSuccess('');

        const normalizedEmail =
            email.trim().toLowerCase();

        if (!normalizedEmail) {
            setError('Vui lòng nhập email.');
            return;
        }

        if (!passwordIsValid) {
            setError(
                'Mật khẩu cần ít nhất 8 ký tự, 1 chữ hoa, '
                + '1 chữ số và 1 ký tự đặc biệt.'
            );
            return;
        }

        if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không trùng khớp.');
            return;
        }

        if (!agreed) {
            setError('Vui lòng đồng ý điều khoản sử dụng.');
            return;
        }

        setIsLoading(true);

        try {
            const data = await requestApi('/register', {
                email: normalizedEmail,
                password,
                role
            });

            setPendingEmail(normalizedEmail);
            setOtp('');
            setOtpStep(true);

            setSuccess(
                data.message ||
                'Mã OTP đã được gửi đến Gmail của bạn.'
            );

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // XÁC THỰC OTP
    const handleVerifyOtp = async (e) => {
        e.preventDefault();

        setError('');
        setSuccess('');

        if (!/^\d{6}$/.test(otp)) {
            setError('OTP phải có đúng 6 chữ số.');
            return;
        }

        setIsLoading(true);

        try {
            const data = await requestApi(
                '/verify-otp',
                {
                    email: pendingEmail,
                    otp
                }
            );

            alert(
                data.message ||
                'Xác thực thành công! Vui lòng đăng nhập.'
            );

            setPassword('');
            setConfirmPassword('');
            setOtp('');

            goToLogin();

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // GỬI LẠI OTP
    const handleResendOtp = async () => {
        setError('');
        setSuccess('');
        setIsResending(true);

        try {
            const data = await requestApi(
                '/resend-otp',
                {
                    email: pendingEmail
                }
            );

            setOtp('');
            setSuccess(
                data.message ||
                'Mã OTP mới đã được gửi đến Gmail.'
            );

        } catch (err) {
            setError(err.message);
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="blob-bg-1" />
            <div className="blob-bg-2" />

            <div className="auth-card">

                {/* SIDEBAR */}
                <div className="register-sidebar">
                    <div>
                        <button
                            type="button"
                            onClick={() => navigate('/discover')}
                            className="flex items-center text-white mb-8 text-sm"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Quay lại trang chủ
                        </button>

                        <div className="flex items-center gap-3 mb-8">
                            <div className="bg-blue-600 rounded-xl p-2">
                                <ShieldCheck className="text-white w-6 h-6" />
                            </div>

                            <span className="font-bold text-xl text-white">
                                ViecLamViet
                            </span>
                        </div>

                        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
                            Chào mừng bạn đến với mạng lưới nhân tài Việt Nam
                        </h1>

                        <div className="flex flex-col gap-4 text-sm text-white">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                Tìm việc nhanh chóng, hiệu quả
                            </div>

                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                Kết nối với nhà tuyển dụng
                            </div>
                        </div>
                    </div>
                </div>

                {/* FORM */}
                <div className="register-form-wrapper">

                    <h2 className="text-2xl font-bold text-slate-800 mb-1">
                        {otpStep
                            ? 'Xác thực Gmail'
                            : 'Đăng ký tài khoản'}
                    </h2>

                    <p className="text-slate-500 text-xs mb-6">
                        {otpStep
                            ? `Nhập mã OTP đã gửi đến ${pendingEmail}`
                            : 'Khởi đầu hành trình cùng ViecLamViet'}
                    </p>

                    {success && (
                        <div
                            role="status"
                            className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-md text-sm"
                        >
                            {success}
                        </div>
                    )}

                    {error && (
                        <div
                            role="alert"
                            className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm"
                        >
                            {error}
                        </div>
                    )}

                    {otpStep ? (

                        /* FORM OTP */
                        <form
                            onSubmit={handleVerifyOtp}
                            className="flex flex-col gap-4"
                        >
                            <div className="text-center py-4">
                                <Mail className="w-12 h-12 text-blue-600 mx-auto mb-3" />

                                <p className="text-sm text-slate-600">
                                    Mã xác thực gồm 6 số.
                                    Có hiệu lực trong 5 phút.
                                </p>
                            </div>

                            <label
                                htmlFor="register-otp"
                                className="text-xs font-semibold text-slate-700"
                            >
                                Mã OTP
                            </label>

                            <input
                                id="register-otp"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                value={otp}
                                maxLength={6}
                                pattern="[0-9]{6}"
                                onChange={(e) =>
                                    setOtp(
                                        e.target.value.replace(/\D/g, '')
                                    )
                                }
                                placeholder="000000"
                                className="w-full border border-slate-300 rounded-md p-3 text-center text-xl tracking-widest"
                                required
                            />

                            <button
                                type="submit"
                                disabled={isLoading || isResending || otp.length !== 6}
                                className="w-full bg-blue-600 text-white py-3 rounded-md font-semibold disabled:opacity-50"
                            >
                                {isLoading
                                    ? 'Đang xác thực...'
                                    : 'Xác thực và tạo tài khoản'}
                            </button>

                            <button
                                type="button"
                                onClick={handleResendOtp}
                                disabled={isLoading || isResending}
                                className="text-sm text-blue-600 font-semibold disabled:opacity-50"
                            >
                                {isResending
                                    ? 'Đang gửi...'
                                    : 'Gửi lại mã OTP'}
                            </button>

                            <button
                                type="button"
                                disabled={isLoading || isResending}
                                onClick={() => {
                                    setOtpStep(false);
                                    setOtp('');
                                    setError('');
                                    setSuccess('');
                                }}
                                className="text-sm text-slate-500"
                            >
                                Quay lại chỉnh sửa thông tin
                            </button>
                        </form>

                    ) : (

                        /* FORM ĐĂNG KÝ */
                        <form
                            onSubmit={handleSubmit}
                            className="flex flex-col gap-4"
                        >

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-2">
                                    Bạn đăng ký với tư cách là:
                                </label>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setRole('candidate')}
                                        aria-pressed={role === 'candidate'}
                                        className={`border rounded-lg p-3 text-left ${
                                            role === 'candidate'
                                                ? 'border-blue-600 bg-blue-50'
                                                : 'border-slate-200'
                                        }`}
                                    >
                                        <User className="w-5 h-5 mb-2 text-blue-600" />
                                        <span className="text-xs font-bold">
                                            Ứng viên
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setRole('employer')}
                                        aria-pressed={role === 'employer'}
                                        className={`border rounded-lg p-3 text-left ${
                                            role === 'employer'
                                                ? 'border-blue-600 bg-blue-50'
                                                : 'border-slate-200'
                                        }`}
                                    >
                                        <Building2 className="w-5 h-5 mb-2 text-blue-600" />
                                        <span className="text-xs font-bold">
                                            Nhà tuyển dụng
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="register-email"
                                    className="block text-xs font-medium mb-1"
                                >
                                    Gmail / Email *
                                </label>

                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />

                                    <input
                                        id="register-email"
                                        type="email"
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
                                        placeholder="example@gmail.com"
                                        className="w-full pl-9 py-2 border border-slate-300 rounded-md text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="register-password"
                                    className="block text-xs font-medium mb-1"
                                >
                                    Mật khẩu *
                                </label>

                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />

                                    <input
                                        id="register-password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        autoComplete="new-password"
                                        placeholder="Nhập mật khẩu"
                                        className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-md text-sm"
                                        required
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                        aria-label="Hiện hoặc ẩn mật khẩu"
                                        className="absolute right-3 top-2 text-slate-400"
                                    >
                                        {showPassword
                                            ? <EyeOff className="w-4 h-4" />
                                            : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
                                    <span className={hasMinLength ? 'text-emerald-600' : 'text-slate-400'}>
                                        {hasMinLength ? '✓' : '○'} Ít nhất 8 ký tự
                                    </span>

                                    <span className={hasUppercase ? 'text-emerald-600' : 'text-slate-400'}>
                                        {hasUppercase ? '✓' : '○'} Chữ hoa
                                    </span>

                                    <span className={hasNumber ? 'text-emerald-600' : 'text-slate-400'}>
                                        {hasNumber ? '✓' : '○'} Chữ số
                                    </span>

                                    <span className={hasSpecial ? 'text-emerald-600' : 'text-slate-400'}>
                                        {hasSpecial ? '✓' : '○'} Ký tự đặc biệt
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="confirm-password"
                                    className="block text-xs font-medium mb-1"
                                >
                                    Xác nhận mật khẩu *
                                </label>

                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />

                                    <input
                                        id="confirm-password"
                                        type={
                                            showConfirmPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={(e) =>
                                            setConfirmPassword(e.target.value)
                                        }
                                        placeholder="Nhập lại mật khẩu"
                                        className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-md text-sm"
                                        required
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowConfirmPassword(
                                                !showConfirmPassword
                                            )
                                        }
                                        aria-label="Hiện hoặc ẩn mật khẩu xác nhận"
                                        className="absolute right-3 top-2 text-slate-400"
                                    >
                                        {showConfirmPassword
                                            ? <EyeOff className="w-4 h-4" />
                                            : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <label className="flex items-start gap-2 text-xs text-slate-600">
                                <input
                                    type="checkbox"
                                    checked={agreed}
                                    onChange={(e) =>
                                        setAgreed(e.target.checked)
                                    }
                                    required
                                />
                                Tôi đã đọc và đồng ý với điều khoản sử dụng.
                            </label>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-blue-600 text-white py-3 rounded-md font-semibold flex justify-center items-center gap-2 disabled:opacity-50"
                            >
                                {isLoading
                                    ? 'Đang gửi mã...'
                                    : 'Đăng ký và nhận OTP'}

                                {!isLoading && (
                                    <ArrowRight className="w-4 h-4" />
                                )}
                            </button>
                        </form>
                    )}

                    <p className="text-center text-xs text-slate-500 mt-4">
                        Bạn đã có tài khoản?{' '}

                        <button
                            type="button"
                            onClick={goToLogin}
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
