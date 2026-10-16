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
import ProfilePage from "./pages/candidate/ProfilePage";

// Admin Components (khu vực quản trị /admin)
import AdminLayout from "./components/admin/AdminLayout.jsx";
import AdminOverview from "./pages/admin/AdminOverview.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminJobs from "./pages/admin/AdminJobs.jsx";
import AdminJobEdit from "./pages/admin/AdminJobEdit.jsx";
import AdminReports from "./pages/admin/AdminReports.jsx";
import AdminPackages from "./pages/admin/AdminPackages.jsx";

// Services
import { getCurrentUser, logout } from "./services/authService";

// Trang ứng với URL: giữ đúng tiêu đề Header và mục sáng trên Sidebar
// khi tải lại trang hoặc mở link trực tiếp.
const ROUTE_PAGES = {
    "/discover": { id: "discover", label: "Khám phá việc làm" },
    "/profile": { id: "profile", label: "Hồ sơ của tôi" },
};

export default function App() {
    // --- STATE ĐĂNG NHẬP ---
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    // Người dùng đang đăng nhập (id, email, role, fullName, avatar) lấy từ backend
    const [currentUser, setCurrentUser] = useState(null);
    const [, setAuthLoading] = useState(true);

    // --- STATE ỨNG DỤNG CHÍNH ---
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedPage, setSelectedPage] = useState({
        id: "discover",
        label: "Khám phá việc làm",
    });

    const navigate = useNavigate();
    const location = useLocation();
    const currentPage = ROUTE_PAGES[location.pathname] || selectedPage;

    // Scroll to top khi đổi route
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname]);

    // Khôi phục phiên đăng nhập (cookie session) khi tải lại trang
    useEffect(() => {
        let cancelled = false;
            async function restoreSession() {
            try {
                const user = await getCurrentUser();

                if (!cancelled) {
                    setCurrentUser(user);
                    setIsAuthenticated(Boolean(user));
                }
            } catch (error) {
                if (!cancelled) {
                    setCurrentUser(null);
                    setIsAuthenticated(false);
                    console.error("Không kiểm tra được phiên đăng nhập:", error);
                }
            } finally {
                if (!cancelled) {
                    setAuthLoading(false);
                }
            }
        }

        restoreSession();

        return () => {
            cancelled = true;
        };
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
        if (!user?.id || !user?.role) {
            throw new Error("Chưa nhận được thông tin đăng nhập hợp lệ.");
        }

        setCurrentUser(user);
        setIsAuthenticated(true);

        const returnTo = location.state?.returnTo;

        // Chỉ nhận đường dẫn chi tiết việc làm trong ứng dụng.
        const destination =
            typeof returnTo === "string" &&
            /^\/jobs\/\d+$/.test(returnTo) ? returnTo : "/discover";

        navigate(destination, { replace: true });
    }
    // xử lý hết hạn phiên
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
    // Khu vực admin có Header/Sidebar riêng (trong AdminLayout) nên cũng ẩn
    // Header và Sidebar ứng viên, giống trang auth.
    const isAdminPage = location.pathname === '/admin' || location.pathname.startsWith('/admin/');

    return (
        <>
            {/* Chỉ hiển thị Header & Sidebar khi KHÔNG PHẢI ở trang đăng nhập/đăng ký và KHÔNG ở khu vực admin */}
            {!isAuthPage && !isAdminPage && (
                <>
                    <Header
                        onOpenSidebar={() => setSidebarOpen(true)}
                        pageTitle={currentPage.label}
                        isAuthenticated={isAuthenticated} // Truyền state này xuống Header để Header biết hiển thị nút "Đăng nhập" hay "Avatar user"
                        userName={currentUser?.fullName || currentUser?.email}
                        userRole={currentUser?.role}
                        avatarUrl={currentUser?.avatar}
                        onLogout={handleLogout}
                    />

                    <SidebarCandidate
                        isOpen={sidebarOpen}
                        onClose={() => setSidebarOpen(false)}
                        activeItem={currentPage.id}
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
                        path="/profile"
                        element={
                            <ProfilePage
                                // Lưu xong thì cập nhật tên, ảnh trên Header
                                onProfileUpdated={(profile) =>
                                    setCurrentUser((user) =>
                                        user
                                            ? { ...user, fullName: profile.fullName, avatar: profile.avatar }
                                            : user
                                    )
                                }
                            />
                        }
                    />

                    {/* --- KHU VỰC ADMIN (không cần đăng nhập để xem thử: dữ liệu mẫu
                         tự hiện khi backend chưa trả dữ liệu; muốn chặn theo role thì
                         bọc thêm <Route element={<AdminRoute />}> ở ngoài, xem
                         components/admin/AdminRoute.jsx) --- */}
                    <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<AdminOverview />} />
                        <Route path="users" element={<AdminUsers />} />
                        <Route path="jobs" element={<AdminJobs />} />
                        <Route path="jobs/:id/edit" element={<AdminJobEdit />} />
                        <Route path="reports" element={<AdminReports />} />
                        <Route path="packages" element={<AdminPackages />} />
                    </Route>

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
