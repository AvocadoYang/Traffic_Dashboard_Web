import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";
import { ReportQuery, reportParams } from "./useOperationReport";

/** 任務種類 (後端 operationReport.ts 的 MissionClass) */
export type MissionClass = "transport" | "charge" | "giveWay" | "standby" | "manual";

export const MISSION_CLASSES: MissionClass[] = [
  "transport",
  "charge",
  "giveWay",
  "standby",
  "manual",
];

export interface BatteryRates {
  /** 期間內掉了多少電 (%) */
  consumed: number;
  /** 期間內充了多少電 (%) */
  charged: number;
  distanceKm: number;
  pctPerKm: number | null;
  chargePerHour: number | null;
  drainPerHour: number | null;
  chargingMin: number;
  chargeSessions: number;
  missions: number;
}

export interface BatteryPoint {
  t: number;
  battery: number | null;
  charging: boolean;
  distanceKm: number;
  missionId: string | null;
}

export interface BatteryBucket {
  start: number;
  consumed: number;
  charged: number;
  distanceKm: number;
  missions: number;
}

export interface BatteryMissionRow {
  id: string;
  name: string;
  cls: MissionClass;
  from: number;
  to: number;
  distanceKm: number;
  batteryStart: number | null;
  batteryEnd: number | null;
  used: number | null;
}

export interface BatteryVehicle extends BatteryRates {
  amrId: string;
  startBattery: number | null;
  endBattery: number | null;
  minBattery: number | null;
  maxBattery: number | null;
  reportsCharging: boolean;
  series: BatteryPoint[];
  buckets: BatteryBucket[];
  missionList: BatteryMissionRow[];
}

export interface BatteryReport {
  from: number;
  to: number;
  stepMin: number;
  bucket: "hour" | "day";
  summary: BatteryRates;
  buckets: BatteryBucket[];
  vehicles: BatteryVehicle[];
  /** false: 資料庫還沒有 amr_battery_log 表 */
  recorded: boolean;
}

const useBatteryReport = (query: ReportQuery | null) =>
  useQuery({
    queryKey: ["battery-report", query],
    queryFn: async () => {
      const { data } = await client.get<BatteryReport>("api/report/battery", {
        params: reportParams(query as ReportQuery),
      });
      return data;
    },
    enabled: !!query,
    refetchOnWindowFocus: false,
  });

export default useBatteryReport;
