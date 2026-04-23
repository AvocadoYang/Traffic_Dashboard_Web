import MonitorCenter from "./pages/SWMoniter/SWMoniter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import { Main, LogIn, Setting, Register, Simulate, Records } from "./pages";
import MissionAnalysis from "./pages/MissionAnalysis/MissionAnalysis";
import CargoHistory from "./pages/CargoHistory/CargoHistory";
import AmrDetail from "./pages/AmrDetail/AmrDetail";
import AmrList from "./pages/AmrDetail/AmrList";
import AllSimulateResult from "./pages/SimulateResult/AllSimulateResult";
import { Navigate, Outlet } from "react-router-dom";
import { SystemAlarmOverlay } from "./pages/Main/components/SystemAlarm";

const client = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  // const esc = useEcsTransaction();
  // const ecsResp = useEcsTransactionResp();
  // const bar = useBarcodeSignal();

  const ProtectedRoute = () => {
    const token = localStorage.getItem("token");

    if (!token) {
      return <Navigate to="/login" replace />;
    }

    return <Outlet />;
  };

  // const ipcHandle = (): void => window.electron.ipc.send('ping')
  return (
    <QueryClientProvider client={client}>
      <SystemAlarmOverlay />
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/login" element={<LogIn />}></Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Register />}></Route>
            <Route path="/setting" element={<Setting></Setting>}></Route>
            <Route path="/simulate" element={<Simulate />}></Route>
            <Route
              path="/mission-analysis"
              element={<MissionAnalysis />}
            ></Route>
            <Route path="/cargo-history" element={<CargoHistory />}></Route>
            <Route
              path="/simulate-result"
              element={<AllSimulateResult />}
            ></Route>
            <Route path="/" element={<Main />}></Route>
            <Route
              path="/test"
              element={<MonitorCenter></MonitorCenter>}
            ></Route>
            <Route path="/records" element={<Records />}></Route>
            <Route path="/amr" element={<AmrList />} />
            <Route path="/amr/:amrId" element={<AmrDetail />} />
            <Route path="*" element={<h1>Not Found</h1>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
