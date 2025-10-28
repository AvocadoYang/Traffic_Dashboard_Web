import MonitorCenter from "./pages/SWMoniter/SWMoniter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, HashRouter, BrowserRouter } from "react-router-dom";
import { Main, LogIn, Setting, Register, Simulate } from "./pages";
import MissionAnalysis from "./pages/MissionAnalysis/MissionAnalysis";
import CargoHistory from "./pages/CargoHistory/CargoHistory";
import AmrDetail from "./pages/AmrDetail/AmrDetail";
import AmrList from "./pages/AmrDetail/AmrList";
import AllSimulateResult from "./pages/SimulateResult/AllSimulateResult";
import { useEcsTransaction } from "./sockets/useEcsTransaction";
import { notification } from "antd";
import { useEffect } from "react";
import { useEcsTransactionResp } from "./sockets/useEcsTransactionResp";
import { useBarcodeSignal } from "./sockets/useBarcodeSignal";

const client = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});
type NotificationType = "success" | "info" | "warning" | "error";

function App() {
  const esc = useEcsTransaction();
  const ecsResp = useEcsTransactionResp();
  const bar = useBarcodeSignal();
  const [api, contextHolder] = notification.useNotification();

  const openNotificationWithIconEcsReq = (
    type: NotificationType,
    msg: string
  ) => {
    api[type]({
      message: "ECS Requests",
      description: msg,
    });
  };

  const openNotificationWithIconResp = (
    type: NotificationType,
    msg: string
  ) => {
    api[type]({
      showProgress: true,
      pauseOnHover: true,
      message: "ECS Response",
      description: msg,
    });
  };

  const openNotificationWithIconBarcodeReq = (
    type: NotificationType,
    msg: string
  ) => {
    api[type]({
      message: "BARCODE READ",
      description: msg,
    });
  };

  useEffect(() => {
    if (ecsResp !== "") {
      openNotificationWithIconResp("error", ecsResp);
    }
  }, [ecsResp]);

  useEffect(() => {
    if (esc !== "") {
      openNotificationWithIconEcsReq("info", esc);
    }
  }, [esc]);

  useEffect(() => {
    if (bar !== "") {
      openNotificationWithIconBarcodeReq("info", `${bar}`);
    }
  }, [bar]);

  // const ipcHandle = (): void => window.electron.ipc.send('ping')
  return (
    <QueryClientProvider client={client}>
      {contextHolder}
      <BrowserRouter>
        <Routes>
          {/* <Route path="/" element={<LogIn />}></Route> */}
          <Route path="/dashboard" element={<Register />}></Route>
          <Route path="/setting" element={<Setting></Setting>}></Route>
          <Route path="/simulate" element={<Simulate />}></Route>
          <Route path="/mission-analysis" element={<MissionAnalysis />}></Route>
          <Route path="/cargo-history" element={<CargoHistory />}></Route>
          <Route
            path="/simulate-result"
            element={<AllSimulateResult />}
          ></Route>
          <Route path="/" element={<Main />}></Route>
          <Route path="/test" element={<MonitorCenter></MonitorCenter>}></Route>
          <Route path="/amr" element={<AmrList />} />
          <Route path="/amr/:amrId" element={<AmrDetail />} />
          <Route path="*" element={<h1>Not Found</h1>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
