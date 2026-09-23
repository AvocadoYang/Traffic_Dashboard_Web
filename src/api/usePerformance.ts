import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";

export interface AmrBusy {
  amrId: string;
  busySec: number;
  /** 佔整個回看視窗的比例 */
  busyPercent: number;
  /** 只看車隊實際有在動的那段, 視窗大部分時間閒置時這個才有意義 */
  busyPercentWhileActive: number;
}

export interface PerformanceSnapshot {
  windowMin: number;
  /** 這份數字算的是哪一批車: 模擬中看模擬車, 否則看真車 */
  scope: "real" | "simulated" | "all";
  fleet: {
    pending: number;
    executing: number;
    dispatchedInWindow: number;
    /** 此刻仍在排隊、還沒等到車的張數 (已計入等待統計) */
    stillWaiting: number;
    avgWaitSec: number | null;
    p95WaitSec: number | null;
    maxWaitSec: number | null;
    avgRunSec: number | null;
    /** 等待 ÷ 執行。> 3 代表任務大半時間在排隊 */
    queueRatio: number | null;
    fleetBusyPercent: number;
    fleetBusyWhileActive: number;
    activeSec: number;
    /** 視窗之外還停在未完成狀態的任務, 多半是中途重啟留下的殘留 */
    staleMissions: number;
    amrs: AmrBusy[];
    verdict: { level: "ok" | "busy" | "saturated"; reason: string };
  };
  process: {
    eventLoopLag: { p50: number; p99: number; max: number };
    memory: { heapUsedMb: number; rssMb: number };
    uptimeSec: number;
    health: "ok" | "warn" | "critical";
  };
}

export const PERFORMANCE_KEY = ["performance"];

const usePerformance = (windowMin = 10, enabled = true) =>
  useQuery({
    queryKey: [...PERFORMANCE_KEY, windowMin],
    queryFn: async () => {
      const { data } = await client.get<PerformanceSnapshot>(
        `api/performance?windowMin=${windowMin}`
      );
      return data;
    },
    enabled,
    // 面板關著就不要一直打 —— 這支要跑幾個聚合查詢
    refetchInterval: enabled ? 3000 : false,
  });

export default usePerformance;
