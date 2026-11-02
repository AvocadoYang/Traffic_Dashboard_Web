import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";
import { getToken } from "@/utils/session";

/** 成就系統 (後端 /api/achievements, 規則在 mission-control/src/services/Achievements/rules.ts) */

export type Tier = "bronze" | "silver" | "gold";

export type Achievement = {
  code: string;
  tier: Tier;
  icon: string;
  scope: "fleet" | "user";
  target: number;
  /** 現在的數字; 算不出來是 null */
  value: number | null;
  /** 解鎖時間 (ISO); 還沒是 null */
  unlockedAt: string | null;
};

export type AchievementsData = {
  account: string;
  /** false: 資料庫還沒有成就的表 */
  enabled: boolean;
  fleet: Achievement[];
  user: Achievement[];
  /** 最近大家解鎖的 (account 空字串是車隊) */
  recent: { code: string; account: string; unlockedAt: string }[];
};

export type DayReport = {
  date: string;
  completed: number;
  canceled: number;
  cargoMoved: number;
  distanceKm: number;
  alarms: number;
  topVehicle: { amrId: string; completed: number } | null;
};

export const ACHIEVEMENTS_KEY = ["achievements"] as const;

export const useAchievements = () =>
  useQuery({
    queryKey: ACHIEVEMENTS_KEY,
    queryFn: async () => (await client.get<AchievementsData>("api/achievements")).data,
    enabled: !!getToken(),
    refetchInterval: 60_000,
    retry: false,
  });

export const useDailyReport = () =>
  useQuery({
    queryKey: ["achievements-report"],
    queryFn: async () => (await client.get<{ today: DayReport; yesterday: DayReport }>("api/achievements/report")).data,
    enabled: !!getToken(),
    refetchInterval: 5 * 60_000,
    retry: false,
  });

export type Feature = "drive_view" | "fleet_replay" | "fleet_heatmap";

const reported = new Set<Feature>();

/** 用到某個新功能了: 通知後端記一次 (「觀察家」成就), 同一次開啟畫面只通知一次, 失敗不用理它 */
export const reportFeatureUse = (feature: Feature) => {
  if (reported.has(feature) || !getToken()) return;
  reported.add(feature);
  client.post("api/achievements/feature-use", { feature }).catch(() => reported.delete(feature));
};
