import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";

/**
 * 區域搬運規則: 從來源群組搬到目的群組, 由觸發條件決定什麼時候搬。
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

export type TransferRule = {
  id: string;
  name: string;
  isEnable: boolean;
  sourceGroupId: string;
  destGroupId: string;
  priority: number;
  triggerType: TransferTriggerType;
  freeSlots: { startAt: number; stopAt: number } | null;
  schedule: ScheduleConfig | null;
  /** null = 搬到來源沒貨或目的放滿 */
  trips: number | null;
  maxConcurrent: number;
};

export type TransferConfig = {
  waitingEnabled: boolean;
  hasMir: boolean;
  schemaReady: boolean;
  priorities: { label: string; value: number }[];
  groups: { id: string; name: string }[];
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
  state: TransferRuleState;
  detail: string;
  missionIds: string[];
  job: {
    total: number | null;
    dispatched: number;
    startedAt: string;
    by: "MANUAL" | "SCHEDULE";
  } | null;
  source: GroupStock | null;
  dest: GroupStock | null;
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
      return data;
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
      return data.rules;
    },
    refetchInterval: 3000,
  });
