import { useQuery } from "@tanstack/react-query";
import client from "@/api/axiosClient";

export type IoLabel = { code: string; name: string };
/** 每個 IO 的代號和名稱, 例如 DI0 = FALL 電梯故障; 固定 4 + 4 格 */
export type IoLabels = { di: IoLabel[]; do: IoLabel[] };

/** 研華 ADAM-4000 序列 IO 模組的連線資訊 (後端 advantechWish 表) */
export interface AdvantechRow {
  id: string;
  name: string;
  ip: string;
  /** 屬於哪個群組; null = 獨立的模組 */
  groupId: string | null;
  /** 在群組裡排第幾, 決定 IO 接續編號 */
  groupOrder: number;
  ioLabels: IoLabels | null;
  createdAt: string;
  updatedAt: string;
}

export type IoAction = "PULSE" | "ON" | "OFF";
/** 按鈕的一步: 點某台模組的某個輸出 (脈衝 / 開 / 關), 或等一下 */
export type ButtonStep =
  | { action: IoAction; moduleId: string; channel: number; ms?: number }
  | { action: "WAIT"; ms: number };

/** 使用者自訂的按鈕 (後端 advantechButton 表), 按下去照 steps 依序跑 */
export interface AdvantechButtonRow {
  id: string;
  groupId: string;
  name: string;
  note: string;
  sortOrder: number;
  steps: ButtonStep[];
}

/** 好幾台模組合成的一個設備 (後端 advantechGroup 表); modules 已照 groupOrder 排好 */
export interface AdvantechGroupRow {
  id: string;
  name: string;
  note: string;
  modules: AdvantechRow[];
  buttons: AdvantechButtonRow[];
  createdAt: string;
  updatedAt: string;
}

export const ADVANTECH_KEY = ["all-advantech"];
export const ADVANTECH_GROUP_KEY = ["all-advantech-group"];
export const ADVANTECH_IO_KEY = ["advantech-io-status"];

/** 一台模組現在的 IO; 連不上時 ok = false */
export type ModuleIoStatus =
  | { id: string; ok: true; di: boolean[]; do: boolean[] }
  | { id: string; ok: false; error: string };

export const useAdvantech = () =>
  useQuery({
    queryKey: ADVANTECH_KEY,
    queryFn: async () => {
      const res = await client.get<AdvantechRow[]>("api/setting/all-advantech");
      return res.data;
    },
  });

export const useAdvantechGroups = () =>
  useQuery({
    queryKey: ADVANTECH_GROUP_KEY,
    queryFn: async () => {
      const res = await client.get<AdvantechGroupRow[]>(
        "api/setting/all-advantech-group",
      );
      return res.data;
    },
  });

/** 每秒讀一次全部模組的 IO; 好幾個元件一起用也只會打一支 (同一個 query key) */
export const useAdvantechIoStatus = () =>
  useQuery({
    queryKey: ADVANTECH_IO_KEY,
    queryFn: async () => {
      const res = await client.get<ModuleIoStatus[]>(
        "api/setting/advantech-io-status",
      );
      return new Map(res.data.map((m) => [m.id, m]));
    },
    refetchInterval: 1000,
  });
