import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import { Navigate, useLocation } from "react-router-dom";
import { SystemAlarmOverlay } from "./pages/Main/components/SystemAlarm";
import { UserConformOverlay } from "./pages/Main/components/UserConformTaskStep";
import AchievementToaster from "./components/Achievements/AchievementToaster";
import MainV2 from "./pages/MainV2/MainV2";
import UserSession from "./components/UserSession/UserSession";
import PasswordReminder from "./components/UserSession/PasswordReminder";
import PageGate from "./components/PermissionGate/PageGate";
import SiteChat from "./components/SiteChat/SiteChat";
import { ThemeVarsProvider, ThemedAppConfigProvider } from "./theme";
import Ignition from "./components/Ignition/Ignition";
import BackendDownGuard from "./components/BackendDown/BackendDownGuard";
import { setOnBackendRecover } from "./utils/backendStatus";
import { reconnectSocket } from "./sockets/socketConnect";
import { useTranslation } from "react-i18next";

// 首頁以外的頁面都按路由載入: 首頁不用先下載設定頁、模擬頁、報表等整包程式碼。
// (首頁 MainV2 維持一般 import, 登入後第一個畫面不用等額外的 chunk。)
const MonitorCenter = lazy(() => import("./pages/SWMoniter/SWMoniter"));
const Main = lazy(() => import("./pages/Main/Main"));
const LogIn = lazy(() => import("./pages/Login/LogIn"));
const Setting = lazy(() => import("./pages/Setting/Setting"));
const SettingV2 = lazy(() => import("./pages/SettingV2/SettingV2"));
const Register = lazy(() => import("./pages/Register/Register"));
const Records = lazy(() => import("./pages/Records/Record"));
const CargoHistory = lazy(() => import("./pages/CargoHistory/CargoHistory"));
const AmrDetail = lazy(() => import("./pages/AmrDetail/AmrDetail"));
const AmrList = lazy(() => import("./pages/AmrDetail/AmrList"));
const MissionDispatchBoard = lazy(
  () => import("./pages/MissionDispatchBoard/MissionDispatchBoard"),
);
const OperationReport = lazy(
  () => import("./pages/OperationReport/OperationReport"),
);
const FleetReplay = lazy(() => import("./pages/FleetReplay/FleetReplay"));
const Kiosk = lazy(() => import("./pages/Kiosk/Kiosk"));
const Achievements = lazy(() => import("./pages/Achievements/Achievements"));
const SimulateV2Gate = lazy(() => import("./pages/SimulateV2/SimulateV2Gate"));
const SettingV3 = lazy(() => import("./pages/SettingV3/SettingV3"));
const Profile = lazy(() => import("./pages/Profile/Profile"));

const client = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

// 後端從連不上恢復時: 重抓所有資料、確認 socket 有連回去
setOnBackendRecover(() => {
  void client.invalidateQueries();
  reconnectSocket();
});

function App() {
  const { t } = useTranslation();
  // const esc = useEcsTransaction();
  // const ecsResp = useEcsTransactionResp();
  // const bar = useBarcodeSignal();

  const ProtectedRoute = () => {
    const { pathname } = useLocation();
    const token = localStorage.getItem("token");

    if (!token) {
      return <Navigate to="/login" replace />;
    }

    return (
      <>
        <UserSession />
        <PasswordReminder />
        {/* 功能權限: 沒有這一頁的權限就不顯示 */}
        <PageGate />
        {/* 放在頁面後面: 跟頁面裡同一層的元件比, 聊天室要在上面 (見 CHAT_Z_INDEX) */}
        {/* 看板模式是給電視看的, 不放聊天室浮動按鈕 */}
        {pathname !== "/kiosk" && <SiteChat />}
        <AchievementToaster />
      </>
    );
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
            <Suspense fallback={null}>
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
                  <Route
                    path="/setting-v1"
                    element={<Setting></Setting>}
                  ></Route>
                  <Route path="/setting-v2" element={<SettingV2 />}></Route>
                  <Route path="/setting-v3" element={<SettingV3 />} />
                  {/* 舊的任務模擬頁拿掉了: 放模擬車改在首頁地圖的「模擬車輛」 */}
                  <Route
                    path="/simulate"
                    element={<Navigate to="/" replace />}
                  ></Route>
                  <Route path="/simulate-v2" element={<SimulateV2Gate />} />
                  <Route
                    path="/cargo-history"
                    element={<CargoHistory />}
                  ></Route>
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
                  <Route path="/fleet-replay" element={<FleetReplay />} />
                  <Route path="/kiosk" element={<Kiosk />} />
                  <Route path="/achievements" element={<Achievements />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="*" element={<h1>{t("utils.not_found")}</h1>} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
          {/* 登入成功後的點火轉場: 放在路由外面, 換頁時不會被卸載 */}
          <Ignition />
          {/* 後端連不上時蓋住整個畫面 (放最後, 蓋在所有東西上面) */}
          <BackendDownGuard />
        </QueryClientProvider>
      </ThemedAppConfigProvider>
    </ThemeVarsProvider>
  );
}

export default App;
