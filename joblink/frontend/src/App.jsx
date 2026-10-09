export default App
import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router";

// Auth Components
import Login from './login';
import Register from './register';

// Candidate Components
import HeaderCandidate from "./components/HeaderCandidate";
import DiscoverJobs from "./pages/candidate/DiscoverJobs";
import SidebarCandidate from "./components/SidebarCandidate";
import JobsPage from "./pages/candidate/JobsPage";
import JobDetailPage from "./pages/candidate/JobDetailPage";

function App() {
  // --- STATE ĐĂNG NHẬP (Auth State) ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authScreen, setAuthScreen] = useState('login'); // 'login' | 'register'

  // --- STATE ỨNG DỤNG CHÍNH (Main App State) ---
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState({
    id: "discover",
    label: "Khám phá việc làm",
  });

  const navigate = useNavigate();
  const routeLocation = useLocation();

  // Scroll to top khi đổi route
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [routeLocation.pathname]);

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

  // Hàm gọi khi đăng nhập thành công
  function handleLoginSuccess() {
    setIsAuthenticated(true);
    navigate("/discover");
  }

  // --- RENDER MÀN HÌNH ĐĂNG NHẬP / ĐĂNG KÝ (Khi chưa auth) ---
  if (!isAuthenticated) {
    return (
        <>
          {authScreen === 'login' ? (
              <Login
                  onNavigateToRegister={() => setAuthScreen('register')}
                  // Bạn cần truyền hàm này vào Login để gọi khi login thành công
                  onLoginSuccess={handleLoginSuccess}
              />
          ) : (
              <Register
                  onNavigateToLogin={() => setAuthScreen('login')}
              />
          )}
        </>
    );
  }

  // --- RENDER ỨNG DỤNG CHÍNH (Khi đã auth) ---
  return (
      <>
        <HeaderCandidate
            onOpenSidebar={() => setSidebarOpen(true)}
            pageTitle={selectedPage.label}
        />

        <SidebarCandidate
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            activeItem={selectedPage.id}
            onSelect={handleSelectPage}
        />
        <main style={{ flex: 1, minWidth: 0 }}>
          <Routes>
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
