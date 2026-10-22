import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";

/** 一台車的時間花在哪 (後端 operationReport.ts 的 TimeClass) */
export type TimeClass =
  | "transport"
  | "charge"
  | "giveWay"
  | "standby"
  | "manual"
  | "idle"
  | "offline"
  | "unrecorded";

export const TIME_CLASSES: TimeClass[] = [
  "transport",
  "charge",
  "giveWay",
  "standby",
  "manual",
  "idle",
  "offline",
  "unrecorded",
];

export type ReportScope = "all" | "real" | "simulated";

export interface ReportBucket {
  start: number;
  transportDone: number;
  avgWaitSec: number | null;
  avgRunSec: number | null;
}

export interface ReportVehicle {
  amrId: string;
  transportDone: number;
  transportCanceled: number;
  avgRunSec: number | null;
  distanceKm: number;
  giveWayCount: number;
  chargeCount: number;
  timeSec: Record<TimeClass, number>;
}

export interface ReportAlarm {
  kind: "alarm" | "warning" | "system";
  code: number;
  label: string;
  count: number;
  /** 有解除時間的那幾筆累計多久; 沒有解除時間的只有次數 */
  totalSec: number | null;
  vehicles: string[];
}

export interface OperationReport {
  from: number;
  to: number;
  bucket: "hour" | "day";
  summary: {
    transportDone: number;
    transportCanceled: number;
    perHour: number;
    avgWaitSec: number | null;
    p90WaitSec: number | null;
    avgRunSec: number | null;
    chargeCount: number;
    giveWayCount: number;
    standbyCount: number;
    manualCount: number;
    distanceKm: number;
    cancelReasons: { reason: number | null; count: number; label: string }[];
  };
  buckets: ReportBucket[];
  vehicles: ReportVehicle[];
  alarms: ReportAlarm[];
  missionNames: { name: string; count: number }[];
  /** false: 資料庫還沒有連線紀錄表, 閒置 / 離線都算在「沒有紀錄」 */
  onlineRecorded: boolean;
}

export interface ReportQuery {
  from: number;
  to: number;
  scope: ReportScope;
  amrIds: string[];
}

export const reportParams = (q: ReportQuery, lang?: string) => ({
  from: new Date(q.from).toISOString(),
  to: new Date(q.to).toISOString(),
  scope: q.scope,
  amrIds: q.amrIds.join(","),
  ...(lang ? { lang } : {}),
});

export const useReportOptions = () =>
  useQuery({
    queryKey: ["operation-report-options"],
    queryFn: async () => {
      const { data } = await client.get<{
        vehicles: { amrId: string; isSimulated: boolean }[];
        maxRangeDays: number;
      }>("api/report/options");
      return data;
    },
  });

const useOperationReport = (query: ReportQuery | null) =>
  useQuery({
    queryKey: ["operation-report", query],
    queryFn: async () => {
      const { data } = await client.get<OperationReport>("api/report/operation", {
        params: reportParams(query as ReportQuery),
      });
      return data;
    },
    enabled: !!query,
    // 任務多的時候一次查詢要撈不少資料, 不要每次切回視窗就重查
    refetchOnWindowFocus: false,
  });

export default useOperationReport;
