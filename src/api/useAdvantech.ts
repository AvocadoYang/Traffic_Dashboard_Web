import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { io } from "@/sockets/socketConnect";

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

/**
 * 一台模組現在的 IO 和連線狀態 (MiR_BRIDGE 回報, 經 mission-control 轉來)。
 * connected = false 時 di / do 是最後一次讀到的值, 不可靠; error 是原因
 * (模組連不上, 或橋接服務本身沒在回報)。
 */
export type ModuleIoStatus = {
  id: string;
  connected: boolean;
  di: boolean[];
  do: boolean[];
  error: string;
};

export type IoStatusMap = Map<string, ModuleIoStatus>;

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

/**
 * 全部模組的 IO 和連線狀態: 先打一次 API 拿全部, 之後靠 useAdvantechIoSocket 收到的變化更新,
 * 不輪詢。好幾個元件一起用也只有一份 (同一個 query key)。
 */
export const useAdvantechIoStatus = () =>
  useQuery({
    queryKey: ADVANTECH_IO_KEY,
    queryFn: async (): Promise<IoStatusMap> => {
      const res = await client.get<ModuleIoStatus[]>(
        "api/setting/advantech-io-status",
      );
      return new Map(res.data.map((m) => [m.id, m]));
    },
    staleTime: Infinity,
  });

/**
 * 聽 socket 的 advantech-io-status (只送有變的那幾台) 併進 useAdvantechIoStatus 的資料。
 * 整頁掛一次就好 (Advantech 面板); socket 斷線重連後重抓一次全部, 免得漏掉中間的變化。
 */
export const useAdvantechIoSocket = () => {
  const queryClient = useQueryClient();
  useEffect(() => {
    const onStatus = (changed: ModuleIoStatus[]) => {
      queryClient.setQueryData<IoStatusMap>(ADVANTECH_IO_KEY, (prev) => {
        const next = new Map(prev ?? []);
        changed.forEach((s) => next.set(s.id, s));
        return next;
      });
    };
    const onReconnect = () =>
      void queryClient.invalidateQueries({ queryKey: ADVANTECH_IO_KEY });
    io.on("advantech-io-status", onStatus);
    io.on("connect", onReconnect);
    return () => {
      io.off("advantech-io-status", onStatus);
      io.off("connect", onReconnect);
    };
  }, [queryClient]);
};

/** 這幾台裡沒連線的; 還沒拿到狀態的也算沒連線 (不知道就不給按) */
export const offlineOf = (status: IoStatusMap | undefined, ids: string[]) =>
  ids
    .map(
      (id): ModuleIoStatus =>
        status?.get(id) ?? {
          id,
          connected: false,
          di: [],
          do: [],
          error: "",
        },
    )
    .filter((s) => !s.connected);
