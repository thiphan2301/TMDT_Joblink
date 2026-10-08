import { useEffect, useState } from "react";
import HeaderCandidate from "./components/HeaderCandidate";
import DiscoverJobs from "./pages/candidate/DiscoverJobs";
import SidebarCandidate from "./components/SidebarCandidate";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router";
import JobsPage from "./pages/candidate/JobsPage";
import JobDetailPage from "./pages/candidate/JobDetailPage";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [selectedPage, setSelectedPage] = useState({
    id: "discover",
    label: "Khám phá việc làm",
  });

  function handleSelectPage(item) {
    setSelectedPage(item);
    setSidebarOpen(false);

    if (item.id === "discover") {
      navigate("/discover");
    } else {
      navigate(`/${item.id}`);
    }
  }

  const navigate = useNavigate();
  const routeLocation = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [routeLocation.pathname]);

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

export default App;