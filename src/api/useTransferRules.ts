import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";

/**
 * 區域搬運規則: 從來源群組搬到目的群組 (可以有好幾個, 依序嘗試), 由觸發條件決定什麼時候搬。
 * MANUAL 手動 / SOURCE_HAS_CARGO 來源有貨就搬 / FREE_SLOTS 依空位數補貨 / SCHEDULE 定時
 */
export const TRANSFER_TRIGGERS = [
  "MANUAL",
  "SOURCE_HAS_CARGO",
  "FREE_SLOTS",
  "SCHEDULE",
] as const;
export type TransferTriggerType = (typeof TRANSFER_TRIGGERS)[number];

/** 手動 / 定時才有「一次搬幾趟」 */
export const TRIGGERS_WITH_TRIPS: TransferTriggerType[] = ["MANUAL", "SCHEDULE"];

export type ScheduleConfig =
  | { mode: "DAILY"; times: string[] }
  | { mode: "INTERVAL"; everyMinutes: number };

export type CargoCondition = { key: string; value: string };

export type TransferRule = {
  id: string;
  name: string;
  isEnable: boolean;
  sourceGroupId: string;
  /** 第一個目的群組 (= destGroupIds[0]) */
  destGroupId: string;
  /** 依序嘗試的目的群組, 前一個放不下才換下一個 */
  destGroupIds: string[];
  /** 只搬符合的貨, 全部符合才搬; 空的 = 什麼貨都搬 */
  cargoConditions: CargoCondition[];
  priority: number;
  triggerType: TransferTriggerType;
  freeSlots: { startAt: number; stopAt: number } | null;
  schedule: ScheduleConfig | null;
  /** null = 搬到來源沒貨或目的放滿 */
  trips: number | null;
  maxConcurrent: number;
  /** 自動觸發的星期 (1 = 星期一 ... 7 = 星期日) 與時段; 都沒設 = 每天整天。手動執行不看 */
  activeDays: number[];
  timeFrom: string | null;
  timeTo: string | null;
};

export type TransferConfig = {
  waitingEnabled: boolean;
  hasMir: boolean;
  schemaReady: boolean;
  priorities: { label: string; value: number }[];
  groups: { id: string; name: string }[];
  /** 自訂貨物格式裡的欄位名稱, 給貨物條件的輸入框提示 */
  cargoKeys: string[];
  rules: TransferRule[];
};

export type GroupStock = { cargo: number; pickable: number; free: number };

export type TransferRuleState = "DISABLED" | "IDLE" | "RUNNING" | "WAITING" | "BLOCKED";

export type TransferRuleRuntime = {
  ruleId: string;
  name: string;
  triggerType: TransferTriggerType;
  sourceGroup: string;
  destGroup: string;
  destGroups: string[];
  state: TransferRuleState;
  detail: string;
  missionIds: string[];
  job: {
    total: number | null;
    dispatched: number;
    startedAt: string;
    by: "MANUAL" | "SCHEDULE";
  } | null;
  /** 有貨物條件時只算符合條件、拿得到的貨 */
  source: GroupStock | null;
  /** 所有目的群組加起來 */
  dest: GroupStock | null;
  /** 每個目的群組還能放幾筆 */
  destFree: { group: string; free: number }[];
  /** 現在在不在自動觸發的時段裡 */
  inTimeWindow: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  updatedAt: string;
};

export const TRANSFER_CONFIG_KEY = ["transfer-config"];

export const useTransferConfig = () =>
  useQuery({
    queryKey: TRANSFER_CONFIG_KEY,
    queryFn: async () => {
      const { data } = await client.get<TransferConfig>("api/transfer/config");
      // 舊版後端沒有多個目的、貨物條件、時段
      return {
        ...data,
        cargoKeys: data.cargoKeys ?? [],
        rules: data.rules.map((r) => ({
          ...r,
          destGroupIds: r.destGroupIds?.length ? r.destGroupIds : [r.destGroupId],
          cargoConditions: r.cargoConditions ?? [],
          activeDays: r.activeDays ?? [],
          timeFrom: r.timeFrom ?? null,
          timeTo: r.timeTo ?? null,
        })),
      };
    },
  });

/** 每條規則目前的狀態; 幾秒刷新一次 */
export const useTransferRuntime = () =>
  useQuery({
    queryKey: ["transfer-runtime"],
    queryFn: async () => {
      const { data } = await client.get<{ rules: TransferRuleRuntime[] }>(
        "api/transfer/runtime",
      );
      return data.rules.map((r) => ({
        ...r,
        destGroups: r.destGroups ?? [r.destGroup],
        destFree: r.destFree ?? [],
        inTimeWindow: r.inTimeWindow ?? true,
      }));
    },
    refetchInterval: 3000,
  });
