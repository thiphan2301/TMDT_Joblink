import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import '../../style/passwordRecovery.css';

export default function PasswordRecovery({ reset = false }) {
    const location = useLocation();
    const token = new URLSearchParams(location.hash.slice(1)).get('token') || '';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [visible, setVisible] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    async function submit(event) {
        event.preventDefault();
        if (busy) return;
        setError(''); setMessage('');
        if (reset) {
            if (password !== confirm) { setError('Mật khẩu nhập lại chưa khớp.'); return; }
            if (password.length < 8 || new TextEncoder().encode(password).length > 72
                || !/[A-Z]/.test(password) || !/[0-9]/.test(password)
                || !/[^a-zA-Z0-9\s]/.test(password)) {
                setError('Mật khẩu cần ít nhất 8 ký tự, chữ hoa, số, ký tự đặc biệt và không quá 72 byte.');
                return;
            }
        }
        setBusy(true);
        try {
            const response = await fetch(`/api/auth/${reset ? 'reset-password' : 'forgot-password'}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reset ? { token, password } : { email: email.trim() }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || 'Yêu cầu chưa thành công. Vui lòng kiểm tra thông tin và thử lại.');
            setMessage(data.message);
            if (reset) {
                setDone(true); setPassword(''); setConfirm('');
                for (const storage of [localStorage, sessionStorage]) {
                    storage.removeItem('token'); storage.removeItem('user');
                }
                window.history.replaceState(null, '', '/reset-password');
            }
        } catch (err) {
            setError(err.message || 'Không kết nối được máy chủ.');
        } finally { setBusy(false); }
    }

    return <main className="recovery-page">
        <section className="recovery-card">
            <span className="recovery-brand">JobLink</span>
            <h1>{reset ? 'Đặt mật khẩu mới' : 'Quên mật khẩu?'}</h1>
            <p>{reset ? 'Chọn mật khẩu mới để đăng nhập lại tài khoản.' : 'Nhập email đã đăng ký. Chúng tôi sẽ gửi liên kết giúp bạn đặt lại mật khẩu.'}</p>
            {message && <div className="recovery-success" role="status">{message}</div>}
            {error && <div className="recovery-error" role="alert">{error}</div>}
            {reset && !token && !done ? <div className="recovery-error" role="alert">Thiếu liên kết đặt lại mật khẩu. Hãy mở liên kết trong email hoặc yêu cầu gửi lại.</div> : !done &&
                <form onSubmit={submit}>
                    {reset ? <>
                        <label htmlFor="new-password">Mật khẩu mới</label>
                        <input id="new-password" type={visible ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} maxLength={72} aria-describedby="password-help" />
                        <small id="password-help">Ít nhất 8 ký tự, gồm chữ hoa, số và ký tự đặc biệt.</small>
                        <label htmlFor="confirm-password">Nhập lại mật khẩu</label>
                        <input id="confirm-password" type={visible ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required maxLength={72} />
                        <label className="recovery-checkbox"><input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} /> Hiện mật khẩu</label>
                    </> : <>
                        <label htmlFor="recovery-email">Email đăng ký</label>
                        <input id="recovery-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={255} placeholder="ban@example.com" />
                    </>}
                    <button disabled={busy} type="submit">{busy ? 'Đang xử lý...' : reset ? 'Lưu mật khẩu mới' : 'Gửi liên kết đặt lại'}</button>
                </form>}
            {reset && !done && <Link to="/forgot-password">Yêu cầu liên kết mới</Link>}
            <Link to="/login">Quay lại đăng nhập</Link>
        </section>
    </main>;
}
