import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";

export type MaintenanceTargetKind = "ALL" | "ROBOT_TYPE" | "ROBOTS";
export type MaintenanceStatus = "ok" | "soon" | "due";

export interface MaintenanceItem {
  id: string;
  name: string;
  enabled: boolean;
  targetKind: MaintenanceTargetKind;
  targetIds: string[];
  intervalKm: number | null;
  intervalHours: number | null;
  intervalDays: number | null;
  /** 用到週期的幾 % 提醒 */
  remindPercent: number;
  note: string;
}

export interface MaintenanceProgress {
  kind: "km" | "hours" | "days";
  used: number;
  interval: number;
  ratio: number;
}

export interface MaintenanceItemStatus {
  itemId: string;
  name: string;
  status: MaintenanceStatus;
  ratio: number;
  progress: MaintenanceProgress[];
  since: number;
  lastDoneAt: number | null;
}

export interface CarMaintenance {
  amrId: string;
  isSimulated: boolean;
  status: MaintenanceStatus;
  items: MaintenanceItemStatus[];
  hold: { reason: string; since: string; by: { account?: string; clientName?: string } | null } | null;
}

export interface MaintenanceRecord {
  id: string;
  itemId: string;
  itemName: string;
  amrId: string;
  doneAt: string;
  doneBy: { account?: string; clientName?: string; ip?: string } | null;
  note: string;
}

export const MAINTENANCE_STATUS_KEY = ["maintenance-status"];

/** 全部車 (amrId 不給) 或一台車的保養狀態 */
export const useCarMaintenance = (amrId?: string) =>
  useQuery({
    queryKey: [...MAINTENANCE_STATUS_KEY, amrId ?? "all"],
    queryFn: async () => {
      const { data } = await client.get<{ recorded: boolean; cars: CarMaintenance[] }>(
        "api/maintenance/status",
        { params: amrId ? { amrId } : {} },
      );
      return data;
    },
    refetchInterval: 30_000,
  });

export const useMaintenanceRecords = (amrId?: string) =>
  useQuery({
    queryKey: ["maintenance-records", amrId ?? "all"],
    queryFn: async () => {
      const { data } = await client.get<{ records: MaintenanceRecord[] }>("api/maintenance/records", {
        params: amrId ? { amrId, limit: 20 } : { limit: 50 },
      });
      return data.records;
    },
    enabled: !!amrId,
  });
