import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router"; // Đảm bảo dùng react-router-dom

// Auth Components
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/register.jsx';

// Candidate Components
import Header from "./components/Header.jsx";
import DiscoverJobs from "./pages/candidate/DiscoverJobs";
import SidebarCandidate from "./components/SidebarCandidate";
import JobsPage from "./pages/candidate/JobsPage";
import JobDetailPage from "./pages/candidate/JobDetailPage";

// Services
import { getCurrentUser, logout } from "./services/authService";

export default function App() {
    // --- STATE ĐĂNG NHẬP ---
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    // Người dùng đang đăng nhập (id, email, role, fullName, avatar) lấy từ backend
    const [currentUser, setCurrentUser] = useState(null);

    // --- STATE ỨNG DỤNG CHÍNH ---
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedPage, setSelectedPage] = useState({
        id: "discover",
        label: "Khám phá việc làm",
    });

    const navigate = useNavigate();
    const location = useLocation();

    // Scroll to top khi đổi route
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname]);

    // Khôi phục phiên đăng nhập (cookie session) khi tải lại trang
    useEffect(() => {
        getCurrentUser()
            .then((user) => {
                if (user) {
                    setCurrentUser(user);
                    setIsAuthenticated(true);
                }
            })
            .catch(() => {
                // Backend chưa chạy: coi như chưa đăng nhập
            });
    }, []);

    // --- HANDLERS ---
    function handleSelectPage(item) {
        setSelectedPage(item);
        setSidebarOpen(false);

        if (item.id === "discover") {
            navigate("/discover");
        } else {
            navigate(`/${item.id}`);
        }
    }

    // Hàm gọi khi đăng nhập thành công (user: thông tin backend trả về, nếu có)
    function handleLoginSuccess(user) {
        if (user) {
            setCurrentUser(user);
        }
        setIsAuthenticated(true);
        navigate("/discover"); // Đăng nhập xong đẩy về trang chủ
    }

    async function handleLogout() {
        try {
            await logout();
        } catch {
            // Vẫn đăng xuất ở giao diện kể cả khi không gọi được backend
        }
        setCurrentUser(null);
        setIsAuthenticated(false);
        navigate("/login");
    }

    // --- KIỂM TRA ROUTE HIỆN TẠI ---
    // Nếu đang ở trang login hoặc register thì không hiển thị Header và Sidebar
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

    return (
        <>
            {/* Chỉ hiển thị Header & Sidebar khi KHÔNG PHẢI ở trang đăng nhập/đăng ký */}
            {!isAuthPage && (
                <>
                    <Header
                        onOpenSidebar={() => setSidebarOpen(true)}
                        pageTitle={selectedPage.label}
                        isAuthenticated={isAuthenticated} // Truyền state này xuống Header để Header biết hiển thị nút "Đăng nhập" hay "Avatar user"
                        userName={currentUser?.fullName || currentUser?.email}
                        userRole={currentUser?.role}
                        avatarUrl={currentUser?.avatar}
                        onLogout={handleLogout}
                    />

                    <SidebarCandidate
                        isOpen={sidebarOpen}
                        onClose={() => setSidebarOpen(false)}
                        activeItem={selectedPage.id}
                        onSelect={handleSelectPage}
                    />
                </>
            )}

            <main style={{ flex: 1, minWidth: 0 }}>
                <Routes>
                    {/* --- CÁC ROUTE XÁC THỰC (AUTH) --- */}
                    <Route
                        path="/login"
                        element={
                            <Login
                                onNavigateToRegister={() => navigate('/register')}
                                onLoginSuccess={handleLoginSuccess}
                            />
                        }
                    />
                    <Route
                        path="/register"
                        element={
                            <Register
                                onNavigateToLogin={() => navigate('/login')}
                                onLoginSuccess={handleLoginSuccess}
                            />
                        }
                    />

                    {/* --- CÁC ROUTE MAIN (Cho phép xem trước khi đăng nhập) --- */}
                    <Route path="/" element={<Navigate to="/discover" replace />} />
                    <Route path="/discover" element={<DiscoverJobs />} />
                    <Route path="/jobs" element={<JobsPage />} />
                    <Route path="/jobs/:id" element={<JobDetailPage />} />

                    <Route
                        path="*"
                        element={
                            <div style={{ padding: 32 }}>
                                Trang này đang được xây dựng.
                            </div>
                        }
                    />
                </Routes>
            </main>
        </>
    );
}