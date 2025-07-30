import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Routes, Route, HashRouter, BrowserRouter } from 'react-router-dom';
import { Main, LogIn, Setting, Register, Simulate } from './pages';
import MissionAnalysis from './pages/MissionAnalysis/MissionAnalysis';
import CargoHistory from './pages/CargoHistory/CargoHistory';
import AmrDetail from './pages/AmrDetail/AmrDetail';
import MonitorCenter from './pages/SWMoniter/SWMoniter';
import AmrList from './pages/AmrDetail/AmrList';

const client = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false
    }
  }
});

function App() {
  // const ipcHandle = (): void => window.electron.ipc.send('ping')
  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <Routes>
          {/* <Route path="/" element={<LogIn />}></Route> */}
          <Route path="/dashboard" element={<Register />}></Route>
          <Route path="/setting" element={<Setting></Setting>}></Route>
          <Route path="/simulate" element={<Simulate />}></Route>
          <Route path="/mission-analysis" element={<MissionAnalysis />}></Route>
          <Route path="/cargo-history" element={<CargoHistory />}></Route>
          <Route path="/" element={<Main />}></Route>
          <Route path='/test' element={<MonitorCenter></MonitorCenter>}></Route>
          <Route path="/amr" element={<AmrList />} />
          <Route path="/amr/:amrId" element={<AmrDetail />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
