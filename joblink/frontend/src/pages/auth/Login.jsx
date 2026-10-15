import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
    ShieldCheck, CheckCircle2, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft
} from 'lucide-react';
import GoogleLoginButton from '../../components/GoogleLoginButton';
import { loginWithGoogle } from '../../services/authService';
import '../../style/login.css';

export default function Login({ onNavigateToRegister, onLoginSuccess }) {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const handleGoogleCredential = async (credential) => {
        if (googleLoading) return;
        setError('');
        setGoogleLoading(true);
        try {
            const user = await loginWithGoogle(credential);
            if (onLoginSuccess) onLoginSuccess(user);
            else navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Đăng nhập Google thất bại');
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {

            const response = await fetch('/api/auth/login', {
                credentials: 'include',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim(),
                    password
                })
            });

            const data = await response.json().catch(() => ({}));


            if (response.ok) {
                if (rememberMe) {
                    localStorage.setItem('token', data.token);
                    sessionStorage.removeItem('token');
                    sessionStorage.removeItem('user');
                    localStorage.setItem('user', JSON.stringify(data.user));
                } else {
                    sessionStorage.setItem('token', data.token);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    sessionStorage.setItem('user', JSON.stringify(data.user));
                }

                if (onLoginSuccess) {
                    onLoginSuccess(data.user);
                } else {
                    navigate('/dashboard');
                }
            } else {
                setError(data.message || 'Đăng nhập thất bại');
            }
        } catch (err) {
            setError('Lỗi kết nối đến server. Vui lòng thử lại sau.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="blob-bg-1"></div>
            <div className="blob-bg-2"></div>
            <div className="blob-bg-3"></div>

            <div className="auth-card">
                <div className="login-sidebar">
                    <div>
                        <button type="button" onClick={() => navigate('/discover')} className="flex items-center text-slate-500 hover:text-blue-600 transition-colors text-sm mb-8 font-medium group">
                            <ArrowLeft className="w-4 h-4 mr-1.5 transform group-hover:-translate-x-1 transition-transform" />
                            Quay lại trang chủ
                        </button>

                        <div className="flex items-center gap-3 mb-10">
                            <div className="bg-blue-600 rounded-xl p-2 flex items-center justify-center">
                                <ShieldCheck className="text-white w-6 h-6" />
                            </div>
                            <span className="font-bold text-xl text-slate-800">ViecLamViet</span>
                        </div>

                        <h1 className="text-3xl font-bold text-slate-800 leading-tight mb-4">
                            Chào mừng bạn quay trở<br />lại với <span className="text-blue-600">ViecLamViet</span>
                        </h1>
                        <p className="text-slate-500 text-sm mb-10 leading-relaxed max-w-md">
                            Đăng nhập để tiếp tục hành trình sự nghiệp, kết nối với những nhà tuyển dụng hàng đầu và quản lý hồ sơ chuyên nghiệp của bạn.
                        </p>

                        <div className="flex flex-col gap-6">
                            <div className="flex gap-4">
                                <div className="mt-1"><CheckCircle2 className="w-5 h-5 text-green-500" /></div>
                                <div>
                                    <h3 className="font-semibold text-slate-800 text-sm">Hơn 50,000+ việc làm mới</h3>
                                    <p className="text-slate-500 text-xs mt-1">Cập nhật mỗi ngày từ các doanh nghiệp uy tín.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="mt-1"><CheckCircle2 className="w-5 h-5 text-green-500" /></div>
                                <div>
                                    <h3 className="font-semibold text-slate-800 text-sm">Kết nối trực tiếp HR</h3>
                                    <p className="text-slate-500 text-xs mt-1">Phản hồi nhanh chóng từ nhà tuyển dụng.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 md:mt-0 pt-8">
                        <p className="text-slate-500 text-xs mb-2">Bạn chưa có tài khoản?</p>
                        <button type="button" onClick={onNavigateToRegister || (() => navigate('/register'))} className="inline-flex items-center text-blue-600 font-semibold text-sm hover:text-blue-700 transition-colors group">
                            Đăng ký tài khoản mới ngay
                            <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                <div className="login-form-wrapper">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Đăng nhập</h2>
                    <p className="text-slate-500 text-sm mb-8">Chào mừng bạn quay trở lại!</p>

                    {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}

                    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                </div>
                                <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field pl-10 w-full rounded-md border-slate-300 py-2" placeholder="name@company.com" required />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label htmlFor="password" className="block text-sm font-medium text-slate-700">Mật khẩu</label>
                                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700">Quên mật khẩu?</a>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input type={showPassword ? 'text' : 'password'} id="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field-pass pl-10 pr-10 w-full rounded-md border-slate-300 py-2" placeholder="••••••••" required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center mt-1">
                            <input id="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer" />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 cursor-pointer select-none">Ghi nhớ đăng nhập</label>
                        </div>

                        <button type="submit" className="btn-primary w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 transition" disabled={isLoading}>
                            {isLoading ? 'Đang xử lý...' : 'Đăng nhập ngay'}
                        </button>
                    </form>

                    <div className="mt-8 mb-6 flex items-center">
                        <div className="flex-grow border-t border-slate-200"></div>
                        <span className="mx-4 text-xs text-slate-400">HOẶC ĐĂNG NHẬP VỚI</span>
                        <div className="flex-grow border-t border-slate-200"></div>
                    </div>
                    <div className="flex justify-center">
                        <GoogleLoginButton
                            text="signin_with"
                            size="large"
                            fallbackClassName="btn-social"
                            iconClassName="w-4 h-4"
                            onCredential={handleGoogleCredential}
                            onError={setError}
                        />
                    </div>
                    {googleLoading && (
                        <p className="text-sm mt-3 text-center text-slate-500">Đang đăng nhập với Google...</p>
                    )}
                </div>
            </div>
        </div>
    );
}