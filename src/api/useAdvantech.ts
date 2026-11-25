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

export type IoSide = "di" | "do";

/** 狀態的一個條件: 某台模組的某個輸入 (di) / 輸出 (do) 是 ON 或 OFF */
export type StateCondition = {
  moduleId: string;
  side: IoSide;
  channel: number;
  on: boolean;
};

export const STATE_TONES = [
  "green",
  "blue",
  "amber",
  "red",
  "purple",
  "gray",
] as const;
export type StateTone = (typeof STATE_TONES)[number];

/**
 * 群組的訊號意義 (後端 advantechGroupState 表): conditions 裡的訊號全部 ON 時, 設備就是 name 這個狀態,
 * 例如 DO0 + DO1 = 專屬模式啟動、DI0 = 電梯故障。同時可以有好幾個成立; sortOrder 只決定顯示順序。
 */
export interface AdvantechStateRow {
  id: string;
  groupId: string;
  name: string;
  note: string;
  tone: StateTone;
  sortOrder: number;
  conditions: StateCondition[];
}

/** 好幾台模組合成的一個設備 (後端 advantechGroup 表); modules 已照 groupOrder 排好 */
export interface AdvantechGroupRow {
  id: string;
  name: string;
  note: string;
  modules: AdvantechRow[];
  buttons: AdvantechButtonRow[];
  /** 舊後端沒有這個欄位 */
  states?: AdvantechStateRow[];
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

/** 一台 ADAM-4000 4 IN 4 OUT */
const CHANNELS = 4;

/**
 * 群組裡的訊號照模組順序接續編號: 第 1 台是 DI0–3 / DO0–3, 第 2 台是 DI4–7 / DO4–7…
 * (模組本身還是各自的 0–3, 送給後端的也是 moduleId + channel)
 */
export type GroupSignal = {
  moduleId: string;
  moduleName: string;
  side: IoSide;
  /** 模組自己的 0–3 */
  channel: number;
  /** 群組裡的編號 */
  index: number;
  label?: IoLabel;
};

export const groupSignalName = (side: IoSide, index: number) =>
  `${side === "do" ? "DO" : "DI"}${index}`;

export const groupSignals = (
  group: Pick<AdvantechGroupRow, "modules">,
  side: IoSide,
): GroupSignal[] =>
  group.modules.flatMap((m, order) =>
    Array.from({ length: CHANNELS }, (_, channel) => ({
      moduleId: m.id,
      moduleName: m.name,
      side,
      channel,
      index: order * CHANNELS + channel,
      label: m.ioLabels?.[side][channel],
    })),
  );

/** 條件對到群組裡的哪個訊號; 模組已經移出群組 = undefined */
export const findGroupSignal = (
  group: Pick<AdvantechGroupRow, "modules">,
  cond: Pick<StateCondition, "moduleId" | "side" | "channel">,
) =>
  groupSignals(group, cond.side).find(
    (s) => s.moduleId === cond.moduleId && s.channel === cond.channel,
  );

/** 「DO0 + DO1」 */
export const describeConditions = (
  group: Pick<AdvantechGroupRow, "modules">,
  conds: StateCondition[],
  missing = "?",
) =>
  conds
    .map((cond) => {
      const sig = findGroupSignal(group, cond);
      const name = sig ? groupSignalName(sig.side, sig.index) : missing;
      return cond.on ? name : `${name} OFF`;
    })
    .join(" + ");

/** 訊號現在是不是 ON; 沒連線 / 沒讀到 = null */
export const signalValue = (
  status: IoStatusMap | undefined,
  moduleId: string,
  side: IoSide,
  channel: number,
): boolean | null => {
  const io = status?.get(moduleId);
  if (!io?.connected) return null;
  return io[side][channel] ?? false;
};

/** 這個條件現在符不符合; 沒連線就不符合 */
export const conditionMet = (
  cond: StateCondition,
  status: IoStatusMap | undefined,
) => signalValue(status, cond.moduleId, cond.side, cond.channel) === cond.on;

export type GroupStatusResult =
  /** 還沒拿到 IO 狀態 */
  | { kind: "loading" }
  /** 有模組沒連線, 讀到的值不可靠, 不判斷 */
  | { kind: "offline"; offline: ModuleIoStatus[] }
  /** active: 現在成立的訊號意義 (可能好幾個, 也可能一個都沒有), 照 sortOrder */
  | { kind: "ok"; active: AdvantechStateRow[] };

/**
 * 群組現在有哪些訊號意義成立: 選的訊號全部符合才算。
 * 訊號的模組被移出群組的話那一筆就不會成立 (設定頁會標出來); 沒選任何訊號的也不算。
 */
export const evaluateGroup = (
  group: AdvantechGroupRow,
  status: IoStatusMap | undefined,
): GroupStatusResult => {
  if (!status) return { kind: "loading" };
  const offline = offlineOf(
    status,
    group.modules.map((m) => m.id),
  );
  if (offline.length) return { kind: "offline", offline };
  const inGroup = new Set(group.modules.map((m) => m.id));
  const active = (group.states ?? []).filter(
    (s) =>
      s.conditions.length > 0 &&
      s.conditions.every(
        (cond) => inGroup.has(cond.moduleId) && conditionMet(cond, status),
      ),
  );
  return { kind: "ok", active };
};
