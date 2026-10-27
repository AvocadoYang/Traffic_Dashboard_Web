import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";

export type EStopCommand = "PAUSE_IMMEDIATELY" | "FINISH_CURRENT_ACTION_THEN_PAUSE" | "RESUME";

export interface EStopRecord {
  seq: number;
  time: string;
  amrId: string;
  command: EStopCommand;
  stopType: number;
  payloadId: string;
  source: {
    by: string;
    reason?: string;
    detail?: Record<string, unknown>;
  };
  caller: string[];
  context: {
    missionId: string | null;
    missionName: string | null;
    step: number | null;
    stepCount: number | null;
    taskType: string | null;
    taskLocationId: number | string | null;
    taskLevel: number | null;
    machineState: unknown;
    carrierCount: number;
    wasPaused: boolean;
    isEStopFlag: boolean;
    maintenanceLevel: number | null;
    mockCar: boolean;
  } | null;
}

/**
 * emergency-stop 歷史 (新到舊)。沒給 date 時是後端記憶體裡最近的紀錄 (每 3 秒更新),
 * 給 date (YYYY-MM-DD) 時讀那天的檔案, 不需要輪詢。
 */
const useEStopHistory = (opts: { amrId?: string; date?: string; limit?: number }) => {
  const { amrId, date, limit = 200 } = opts;
  return useQuery({
    queryKey: ["estop-history", amrId ?? "", date ?? "", limit],
    queryFn: async () => {
      const { data } = await client.get<EStopRecord[]>("api/amr/emergency-stop-history", {
        params: { amrId, date, limit },
      });
      return data;
    },
    refetchInterval: date ? false : 3000,
  });
};

export default useEStopHistory;
