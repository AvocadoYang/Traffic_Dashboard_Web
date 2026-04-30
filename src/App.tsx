import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, BrowserRouter, Navigate, Outlet } from "react-router-dom";
import { Main, LogIn, Setting, Register, Simulate, Records } from "./pages";
import MonitorCenter from "./pages/SWMoniter/SWMoniter";
import MissionAnalysis from "./pages/MissionAnalysis/MissionAnalysis";
import CargoHistory from "./pages/CargoHistory/CargoHistory";
import AmrDetail from "./pages/AmrDetail/AmrDetail";
import AmrList from "./pages/AmrDetail/AmrList";
import AllSimulateResult from "./pages/SimulateResult/AllSimulateResult";
import MainLayout from "@/layouts/MainLayout";

// ======= Query Client =======
const client = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false },
  },
});

// ======= 登入驗證守衛 =======
const ProtectedRoute = () => {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
};

function App() {
  return (
    <QueryClientProvider client={client}>
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          {/* 不需要 Header、不需要驗證 */}
          <Route path="/login" element={<LogIn />} />

          {/* 需要登入驗證 + 有 Header */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Main />} />
              <Route path="/dashboard" element={<Register />} />
              <Route path="/setting" element={<Setting />} />
              <Route path="/simulate" element={<Simulate />} />
              <Route path="/mission-analysis" element={<MissionAnalysis />} />
              <Route path="/cargo-history" element={<CargoHistory />} />
              <Route path="/simulate-result" element={<AllSimulateResult />} />
              <Route path="/records" element={<Records />} />
              <Route path="/amr" element={<AmrList />} />
              <Route path="/amr/:amrId" element={<AmrDetail />} />
              <Route path="/test" element={<MonitorCenter />} />
              <Route path="*" element={<h1>Not Found</h1>} />
            </Route>
          </Route>

        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

