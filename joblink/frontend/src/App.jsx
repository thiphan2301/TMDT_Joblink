import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router"; // Đảm bảo dùng react-router-dom

// Auth Components
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/register.jsx';

// Candidate Components — GIAO DIỆN GỐC của nhóm (khung Header +
// SidebarCandidate), khôi phục 2026-10-21 theo yêu cầu của Sĩ:
// bỏ bộ giao diện "public" (PublicHeader/HomePage/...) và bỏ mục
// "Design System" khỏi thanh bên.
import Header from "./components/Header.jsx";
import DiscoverJobs from "./pages/candidate/DiscoverJobs";
import SidebarCandidate from "./components/SidebarCandidate";
import JobsPage from "./pages/candidate/JobsPage";
import JobDetailPage from "./pages/candidate/JobDetailPage";
import ProfilePage from "./pages/candidate/ProfilePage";
import DashboardPage from "./pages/candidate/DashboardPage.jsx";
import ApplicationsPage from "./pages/candidate/ApplicationsPage.jsx";
import SavedJobsPage from "./pages/candidate/SavedJobsPage.jsx";
import MessagesPage from "./pages/candidate/MessagesPage.jsx";
import AssistantPage from "./pages/candidate/AssistantPage.jsx";
import CandidateWalletPage from "./pages/candidate/CandidateWalletPage.jsx";
import CandidateEmptyPage from "./pages/candidate/CandidateEmptyPage.jsx";

// Employer Components (khu vực nhà tuyển dụng /employer)
import EmployerLayout from "./components/employer/EmployerLayout.jsx";
import EmployerDashboard from "./pages/employer/EmployerDashboard.jsx";
import EmployerJobs from "./pages/employer/EmployerJobs.jsx";
import EmployerJobEdit from "./pages/employer/EmployerJobEdit.jsx";
import EmployerApplications from "./pages/employer/EmployerApplications.jsx";
import EmployerCandidates from "./pages/employer/EmployerCandidates.jsx";
import EmployerCandidateDetail from "./pages/employer/EmployerCandidateDetail.jsx";
import EmployerCompany from "./pages/employer/EmployerCompany.jsx";
import EmployerReviews from "./pages/employer/EmployerReviews.jsx";
import EmployerPlan from "./pages/employer/EmployerPlan.jsx";
import EmployerWallet from "./pages/employer/EmployerWallet.jsx";
import ChatPage from "./pages/chat/ChatPage.jsx";

// Admin Components (khu vực quản trị /admin)
import AdminLayout from "./components/admin/AdminLayout.jsx";
import AdminOverview from "./pages/admin/AdminOverview.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminJobs from "./pages/admin/AdminJobs.jsx";
import AdminJobEdit from "./pages/admin/AdminJobEdit.jsx";
import AdminReports from "./pages/admin/AdminReports.jsx";
import AdminPackages from "./pages/admin/AdminPackages.jsx";

// CSS của các trang ứng viên (Ví Token, Trợ lý AI, Tin nhắn, trang
// trống) — trước đây do CandidateLayout nạp, nay App nạp trực tiếp
// vì khu ứng viên đã quay về khung gốc.
import "./style/Candidate.css";

// Services
import { getCurrentUser, logout } from "./services/authService";
import { getCandidateOverview, getCandidateWallet } from "./services/candidateService";
import { getConversations } from "./services/chatService";

// Trang ứng với URL: giữ đúng tiêu đề Header và mục sáng trên Sidebar
// khi tải lại trang hoặc mở link trực tiếp.
const ROUTE_PAGES = {
    "/discover": { id: "discover", label: "Khám phá việc làm" },
    "/jobs": { id: "discover", label: "Khám phá việc làm" },
    "/dashboard": { id: "overview", label: "Tổng quan" },
    "/applications": { id: "applications", label: "Việc đã ứng tuyển" },
    "/saved": { id: "saved", label: "Việc làm đã lưu" },
    "/profile": { id: "profile", label: "Hồ sơ của tôi" },
    "/tin-nhan": { id: "messages", label: "Tin nhắn" },
    "/history": { id: "history", label: "Lịch sử hoạt động" },
    "/vi-token": { id: "wallet", label: "Ví Token" },
    "/tro-ly-ai": { id: "assistant", label: "Trợ lý việc làm AI" },
};

// Mục trên SidebarCandidate -> đường dẫn thật
const PAGE_ROUTES = {
    discover: "/discover",
    overview: "/dashboard",
    applications: "/applications",
    saved: "/saved",
    messages: "/tin-nhan",
    profile: "/profile",
    history: "/history",
    wallet: "/vi-token",
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
    // Số thật cho thanh bên ứng viên: số đơn đã ứng tuyển (huy hiệu),
    // số tin chưa đọc (huy hiệu) và số dư Ví Token (thẻ cuối thanh bên)
    const [sidebarStats, setSidebarStats] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();
    const currentPage =
        ROUTE_PAGES[location.pathname] ||
        (location.pathname.startsWith("/jobs/")
            ? ROUTE_PAGES["/jobs"]
            : selectedPage);

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

    // Nạp số thật cho thanh bên khi đã đăng nhập bằng tài khoản ứng
    // viên; chạy lại mỗi lần đổi trang để huy hiệu tin chưa đọc và
    // số đơn luôn mới. Lỗi từng API thì phần đó để 0/ẩn.
    const candidateId = currentUser?.role === "candidate" ? currentUser.id : null;
    useEffect(() => {
        if (!candidateId) return;
        let cancelled = false;
        (async () => {
            const [overview, conversations, wallet] = await Promise.allSettled([
                getCandidateOverview(),
                getConversations(),
                getCandidateWallet(),
            ]);
            if (cancelled) return;
            setSidebarStats({
                forId: candidateId,
                applications:
                    overview.status === "fulfilled" ? overview.value.appliedCount : 0,
                messages:
                    conversations.status === "fulfilled"
                        ? conversations.value.reduce((sum, row) => sum + (row.unread || 0), 0)
                        : 0,
                balance: wallet.status === "fulfilled" ? wallet.value.balance : null,
            });
        })();
        return () => {
            cancelled = true;
        };
    }, [candidateId, location.pathname]);

    // Chỉ dùng số của đúng tài khoản đang đăng nhập (đổi tài khoản
    // hoặc đăng xuất thì số cũ tự vô hiệu)
    const stats =
        sidebarStats && sidebarStats.forId === candidateId ? sidebarStats : null;

    // --- HANDLERS ---
    function handleSelectPage(item) {
        setSelectedPage(item);
        setSidebarOpen(false);
        navigate(PAGE_ROUTES[item.id] || `/${item.id}`);
    }

    // Hàm gọi khi đăng nhập thành công (user: thông tin backend trả về, nếu có)
    function handleLoginSuccess(user) {
        if (!user?.id || !user?.role) {
            throw new Error("Chưa nhận được thông tin đăng nhập hợp lệ.");
        }

        setCurrentUser(user);
        setIsAuthenticated(true);

        // Tài khoản quản trị viên thì vào thẳng khu vực admin,
        // không áp dụng returnTo
        if (user.role === "admin") {
            navigate("/admin", { replace: true });
            return;
        }

        // Nhà tuyển dụng vào thẳng khu vực của mình
        if (user.role === "employer") {
            navigate("/employer", { replace: true });
            return;
        }

        // Chỉ nhận đường dẫn chi tiết việc làm trong ứng dụng.
        // Ứng viên đăng nhập xong vào trang Tổng quan của không gian
        // làm việc (theo thiết kế gốc).
        const returnTo = location.state?.returnTo;
        const destination =
            typeof returnTo === "string" &&
            /^\/jobs\/\d+$/.test(returnTo) ? returnTo : "/dashboard";

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
    // Khu vực nhà tuyển dụng cũng có khung riêng (EmployerLayout).
    const isEmployerPage = location.pathname === '/employer' || location.pathname.startsWith('/employer/');

    return (
        <>
            {/* Khung gốc (Header + SidebarCandidate) bọc mọi trang ứng
                viên/công khai; chỉ ẩn ở trang đăng nhập/đăng ký và các
                khu vực có khung riêng (admin, nhà tuyển dụng) */}
            {!isAuthPage && !isAdminPage && !isEmployerPage && (
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
                        badges={
                            stats
                                ? {
                                    applications: stats.applications,
                                    messages: stats.messages,
                                }
                                : undefined
                        }
                        walletBalance={stats ? stats.balance : null}
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

                    {/* --- KHÔNG GIAN ỨNG VIÊN (trong khung gốc) --- */}
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/applications" element={<ApplicationsPage />} />
                    <Route path="/saved" element={<SavedJobsPage />} />
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
                    {/* Lịch sử hoạt động chưa có thiết kế được yêu cầu -> để trống */}
                    <Route path="/history" element={<CandidateEmptyPage />} />
                    <Route path="/tin-nhan" element={<MessagesPage />} />
                    <Route path="/messages" element={<Navigate to="/tin-nhan" replace />} />
                    <Route path="/tro-ly-ai" element={<AssistantPage />} />
                    <Route path="/vi-token" element={<CandidateWalletPage />} />

                    {/* Đường dẫn cũ từ đợt giao diện trước -> chuyển về
                        đúng trang trong giao diện gốc */}
                    <Route path="/viec-lam-da-ung-tuyen" element={<Navigate to="/applications" replace />} />
                    <Route path="/viec-lam-da-luu" element={<Navigate to="/saved" replace />} />
                    <Route path="/viec-lam-phu-hop" element={<Navigate to="/discover" replace />} />
                    <Route path="/cv" element={<Navigate to="/profile" replace />} />

                    {/* --- KHU VỰC NHÀ TUYỂN DỤNG (backend kiểm tra role
                         employer ở từng API /api/employer/**) --- */}
                    <Route path="/employer" element={<EmployerLayout />}>
                        <Route index element={<EmployerDashboard />} />
                        <Route path="jobs" element={<EmployerJobs />} />
                        <Route path="jobs/new" element={<EmployerJobEdit />} />
                        <Route path="jobs/:id/edit" element={<EmployerJobEdit />} />
                        <Route path="applications" element={<EmployerApplications />} />
                        <Route path="candidates" element={<EmployerCandidates />} />
                        <Route path="candidates/:id" element={<EmployerCandidateDetail />} />
                        <Route path="chat" element={<ChatPage />} />
                        <Route path="company" element={<EmployerCompany />} />
                        <Route path="reviews" element={<EmployerReviews />} />
                        <Route path="plan" element={<EmployerPlan />} />
                        <Route path="wallet" element={<EmployerWallet />} />
                    </Route>

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