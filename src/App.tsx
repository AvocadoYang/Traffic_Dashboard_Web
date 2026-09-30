import MonitorCenter from "./pages/SWMoniter/SWMoniter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import {
  Main,
  LogIn,
  Setting,
  SettingV2,
  Register,
  Simulate,
  Records,
} from "./pages";
import CargoHistory from "./pages/CargoHistory/CargoHistory";
import AmrDetail from "./pages/AmrDetail/AmrDetail";
import AmrList from "./pages/AmrDetail/AmrList";
import AllSimulateResult from "./pages/SimulateResult/AllSimulateResult";
import { Navigate, Outlet } from "react-router-dom";
import { SystemAlarmOverlay } from "./pages/Main/components/SystemAlarm";
import { UserConformOverlay } from "./pages/Main/components/UserConformTaskStep";
import MissionDispatchBoard from "./pages/MissionDispatchBoard/MissionDispatchBoard";
import { ThemeVarsProvider, ThemedAppConfigProvider } from "./theme";

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
    <ThemeVarsProvider>
      <ThemedAppConfigProvider>
        <QueryClientProvider client={client}>
          <SystemAlarmOverlay />
          <UserConformOverlay />
          <BrowserRouter
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <Routes>
              <Route path="/login" element={<LogIn />}></Route>

              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Register />}></Route>
                {/* 設定頁正式改用 v2。/setting 保留成轉址,舊書籤跟外部連結不會壞;
                舊版仍可從 /setting-v1 進去,真的少了什麼功能時還有得退。 */}
                <Route
                  path="/setting"
                  element={<Navigate to="/setting-v2" replace />}
                ></Route>
                <Route path="/setting-v1" element={<Setting></Setting>}></Route>
                <Route path="/setting-v2" element={<SettingV2 />}></Route>
                <Route path="/simulate" element={<Simulate />}></Route>
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
                <Route
                  path="/mission-dispatch"
                  element={<MissionDispatchBoard />}
                ></Route>
                <Route path="/amr" element={<AmrList />} />
                <Route path="/amr/:amrId" element={<AmrDetail />} />
                <Route path="*" element={<h1>Not Found</h1>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </QueryClientProvider>
      </ThemedAppConfigProvider>
    </ThemeVarsProvider>
  );
}

export default App;
