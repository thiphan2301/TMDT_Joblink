import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router"; // Đảm bảo dùng react-router-dom

// Auth Components
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/register.jsx';

// Candidate Components
import ProfilePage from "./pages/candidate/ProfilePage";
import ApplicationsPage from "./pages/candidate/ApplicationsPage";

// Các trang công khai theo thiết kế mới nhất (trang chủ Khám phá,
// danh sách việc làm, chi tiết việc làm, trang công ty) kèm thanh
// trên cùng và chân trang mới — thay cho Header/Sidebar cũ và ba
// trang DiscoverJobs/JobsPage/JobDetailPage trước đây.
import PublicHeader from "./components/candidate/PublicHeader.jsx";
import PublicFooter from "./components/candidate/PublicFooter.jsx";
import HomePage from "./pages/candidate/HomePage.jsx";
import JobsListPage from "./pages/candidate/JobsListPage.jsx";
import JobDetailView from "./pages/candidate/JobDetailView.jsx";
import CompanyPage from "./pages/candidate/CompanyPage.jsx";

// Khu vực ứng viên theo thiết kế mới (thanh bên trái cố định):
// Tổng quan, Tin nhắn realtime, Trợ lý AI, Ví Token; mục chưa có
// thiết kế được yêu cầu thì để trống (CandidateEmptyPage).
import CandidateLayout from "./components/candidate/CandidateLayout.jsx";
import CandidateDashboard from "./pages/candidate/CandidateDashboard.jsx";
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

// Services
import { getCurrentUser, logout } from "./services/authService";

// Trang ứng với URL: giữ đúng tiêu đề Header và mục sáng trên Sidebar
// khi tải lại trang hoặc mở link trực tiếp.
const ROUTE_PAGES = {
    "/discover": { id: "discover", label: "Khám phá việc làm" },
    "/profile": { id: "profile", label: "Hồ sơ của tôi" },
    "/applications": { id: "applications", label: "Việc đã ứng tuyển" },
};

export default function App() {
    // --- STATE ĐĂNG NHẬP ---
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    // Người dùng đang đăng nhập (id, email, role, fullName, avatar) lấy từ backend
    const [currentUser, setCurrentUser] = useState(null);
    const [, setAuthLoading] = useState(true);

    const navigate = useNavigate();
    const location = useLocation();

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

        // Chỉ nhận đường dẫn chi tiết việc làm trong ứng dụng;
        // còn lại ứng viên vào thẳng trang Tổng quan theo thiết kế
        // mới (khu vực có thanh bên trái) thay vì trang Khám phá cũ.
        const returnTo = location.state?.returnTo;
        const destination =
            typeof returnTo === "string" &&
            /^\/jobs\/\d+$/.test(returnTo) ? returnTo : "/dashboard";

        navigate(destination, { replace: true });
    }

    // --- KIỂM TRA ROUTE HIỆN TẠI ---
    // Nếu đang ở trang login hoặc register thì không hiển thị Header và Sidebar
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
    // Khu vực admin có Header/Sidebar riêng (trong AdminLayout) nên cũng ẩn
    // Header và Sidebar ứng viên, giống trang auth.
    const isAdminPage = location.pathname === '/admin' || location.pathname.startsWith('/admin/');
    // Khu vực nhà tuyển dụng cũng có khung riêng (EmployerLayout).
    const isEmployerPage = location.pathname === '/employer' || location.pathname.startsWith('/employer/');
    // Khu vực ứng viên theo thiết kế mới có khung riêng (thanh trên
    // cùng + thanh bên trái trong CandidateLayout) nên cũng ẩn
    // Header và Sidebar cũ, giống khu vực admin/nhà tuyển dụng.
    const CANDIDATE_AREA = ['/dashboard', '/profile', '/cv', '/viec-lam-phu-hop',
        '/viec-lam-da-luu', '/viec-lam-da-ung-tuyen', '/tin-nhan', '/messages',
        '/tro-ly-ai', '/vi-token', '/cai-dat'];
    const isCandidateArea = CANDIDATE_AREA.some((p) =>
        location.pathname === p || location.pathname.startsWith(p + '/'));

    // Trang công khai theo thiết kế mới dùng thanh trên cùng +
    // chân trang riêng (PublicHeader/PublicFooter).
    const showPublicChrome = !isAuthPage && !isAdminPage && !isEmployerPage && !isCandidateArea;

    return (
        <>
            {showPublicChrome && <PublicHeader />}

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
                    <Route path="/discover" element={<HomePage />} />
                    <Route path="/jobs" element={<JobsListPage />} />
                    <Route path="/jobs/:id" element={<JobDetailView />} />
                    <Route path="/cong-ty/:id" element={<CompanyPage />} />

                    {/* --- KHU VỰC ỨNG VIÊN (thanh bên trái theo thiết kế
                         mới). Hồ sơ dùng lại ProfilePage hiện có; các mục
                         chưa có thiết kế được yêu cầu thì để trống --- */}
                    <Route element={<CandidateLayout />}>
                        <Route path="/dashboard" element={<CandidateDashboard />} />
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
                        <Route path="/cv" element={<CandidateEmptyPage />} />
                        <Route path="/viec-lam-phu-hop" element={<CandidateEmptyPage />} />
                        <Route path="/viec-lam-da-luu" element={<CandidateEmptyPage />} />
                        <Route path="/viec-lam-da-ung-tuyen" element={<CandidateEmptyPage />} />
                        <Route path="/tin-nhan" element={<MessagesPage />} />
                        <Route path="/messages" element={<Navigate to="/tin-nhan" replace />} />
                        <Route path="/tro-ly-ai" element={<AssistantPage />} />
                        <Route path="/vi-token" element={<CandidateWalletPage />} />
                        <Route path="/cai-dat" element={<CandidateEmptyPage />} />
                    </Route>

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

                    {/* Việc đã ứng tuyển: userId để đánh dấu cập nhật mới theo từng tài khoản */}
                    <Route
                        path="/applications"
                        element={<ApplicationsPage userId={currentUser?.id} />}
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

            {showPublicChrome && <PublicFooter />}
        </>
    );
}