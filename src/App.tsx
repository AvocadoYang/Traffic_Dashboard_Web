import MonitorCenter from "./pages/SWMoniter/SWMoniter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import {
  Main,
  LogIn,
  Setting,
  SettingV2,
  Register,
  Records,
} from "./pages";
import CargoHistory from "./pages/CargoHistory/CargoHistory";
import AmrDetail from "./pages/AmrDetail/AmrDetail";
import AmrList from "./pages/AmrDetail/AmrList";
import { Navigate, Outlet } from "react-router-dom";
import { SystemAlarmOverlay } from "./pages/Main/components/SystemAlarm";
import { UserConformOverlay } from "./pages/Main/components/UserConformTaskStep";
import MissionDispatchBoard from "./pages/MissionDispatchBoard/MissionDispatchBoard";
import OperationReport from "./pages/OperationReport/OperationReport";
import SimulateV2 from "./pages/SimulateV2/SimulateV2";
import MainV2 from "./pages/MainV2/MainV2";
import SettingV3 from "./pages/SettingV3/SettingV3";
import { ThemeVarsProvider, ThemedAppConfigProvider } from "./theme";
import { useTranslation } from "react-i18next";

const client = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const { t } = useTranslation();
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
                {/* 設定頁正式改用 v3 (畫布地圖版)。/setting 保留成轉址,舊書籤跟外部連結不會壞;
                舊版仍可從 /setting-v2、/setting-v1 進去,真的少了什麼功能時還有得退。 */}
                <Route
                  path="/setting"
                  element={<Navigate to="/setting-v3" replace />}
                ></Route>
                <Route path="/setting-v1" element={<Setting></Setting>}></Route>
                <Route path="/setting-v2" element={<SettingV2 />}></Route>
                <Route path="/setting-v3" element={<SettingV3 />} />
                {/* 舊的任務模擬頁拿掉了: 放模擬車改在首頁地圖的「模擬車輛」 */}
                <Route
                  path="/simulate"
                  element={<Navigate to="/" replace />}
                ></Route>
                <Route path="/simulate-v2" element={<SimulateV2 />} />
                <Route path="/cargo-history" element={<CargoHistory />}></Route>
                {/* 首頁正式改用畫布地圖版 (原 /main-v2); 舊首頁留在 /main-v1,
                /main-v2 轉回首頁, 舊書籤不會壞 */}
                <Route path="/" element={<MainV2 />} />
                <Route path="/main-v1" element={<Main />}></Route>
                <Route
                  path="/main-v2"
                  element={<Navigate to="/" replace />}
                ></Route>
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
                <Route path="/report" element={<OperationReport />} />
                <Route path="*" element={<h1>{t("utils.not_found")}</h1>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </QueryClientProvider>
      </ThemedAppConfigProvider>
    </ThemeVarsProvider>
  );
}

export default App;
