import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";

/** 最低版本: commitAt = commit 時間 (unix 秒), 舊版 amr-core 沒有 */
export type MinVersion = { version: string; commitAt: number | null } | null;

export interface VehicleVersionRow {
  amrId: string;
  isSimulated: boolean;
  /** amr-core 的 git commit 編號; 還沒回報過是 null */
  version: string | null;
  commitAt: number | null;
  /** 這次後端啟動後最後一次收到心跳 (毫秒) */
  lastSeenAt: number | null;
  /** 這個版本第一次被看到 (毫秒) */
  since: number | null;
  belowMin: boolean;
}

export interface VehicleVersions {
  min: MinVersion;
  cars: VehicleVersionRow[];
  knownVersions: { version: string; commitAt: number | null }[];
}

export interface VehicleVersionChange {
  id: number;
  amrId: string;
  version: string;
  commitAt: number | null;
  previousVersion: string | null;
  previousCommitAt: number | null;
  seenAt: number;
}

export const VEHICLE_VERSIONS_KEY = ["vehicle-versions"];

export const useVehicleVersions = () =>
  useQuery({
    queryKey: VEHICLE_VERSIONS_KEY,
    queryFn: async () => (await client.get<VehicleVersions>("api/setting/vehicle-versions")).data,
    refetchInterval: 10_000,
  });

export const useVehicleVersionHistory = (amrId?: string) =>
  useQuery({
    queryKey: ["vehicle-version-history", amrId ?? ""],
    queryFn: async () =>
      (
        await client.get<VehicleVersionChange[]>("api/setting/vehicle-version-history", {
          params: { ...(amrId ? { amrId } : {}), limit: amrId ? 20 : 100 },
        })
      ).data,
    refetchInterval: 30_000,
  });

/** commit 時間 (unix 秒) -> 「2026-11-18 10:22」 */
export const commitTime = (sec: number | null) =>
  sec === null
    ? null
    : new Date(sec * 1000).toLocaleString([], {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
