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
  /** 現場回放 (急停前後各台車的位置) 的 id; 解除暫停、舊紀錄沒有 */
  replayId?: string | null;
}

/** [相對急停的時間 (ms, 之前是負的), x, y, yaw (度)] */
export type IncidentSample = [number, number, number, number];

/** 急停的現場回放 (後端 EmergencyStopHistory/incidentReplay) */
export interface IncidentReplay {
  id: string;
  amrId: string;
  time: string;
  command: string;
  by: string;
  reason: string | null;
  beforeMs: number;
  afterMs: number;
  vehicles: {
    amrId: string;
    /** 實車 (SW15 實車的座標要另外轉); 後端查不到是 null */
    isReal: boolean | null;
    samples: IncidentSample[];
    /** 有沒有載貨, 只記變的時候: [相對時間, 0 / 1] */
    cargo: [number, number][];
  }[];
}

/**
 * 讀一次急停的現場回放。急停後 20 秒內還在錄 (後端回 202): pending 帶著還要多久, 到時候自己再問一次
 */
export const useIncidentReplay = (id: string | null) =>
  useQuery({
    queryKey: ["estop-replay", id],
    enabled: !!id,
    queryFn: async (): Promise<{ pending: number } | { replay: IncidentReplay }> => {
      const res = await client.get<IncidentReplay | { pendingMs: number }>("api/amr/emergency-stop-replay", { params: { id } });
      return res.status === 202 ? { pending: (res.data as { pendingMs: number }).pendingMs } : { replay: res.data as IncidentReplay };
    },
    refetchInterval: (data) => (data && "pending" in data ? Math.max(1000, data.pending + 500) : false),
  });

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
