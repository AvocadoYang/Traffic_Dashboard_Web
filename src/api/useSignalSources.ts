import { useQuery } from "@tanstack/react-query";
import client from "@/api/axiosClient";

/**
 * 設備訊號 (遠端 IO) 的通用格式, 跟後端 types/signal.ts 一樣:
 *  - advantech: 設定 > 周邊 > Advantech 的研華模組, module = 模組 id, channel = 0-3
 *  - remote_io: 訊號程式 (例如 yfy_signal) 送進來的模組, module = 模組名稱, channel = 第幾點 / 線圈位址
 */
export type SignalSource = "advantech" | "remote_io";
export type SignalRef = { source: SignalSource; module: string; channel: number };
export type SignalCondition = SignalRef & { expect: boolean };
export type SignalWriteAction = "ON" | "OFF" | "PULSE";
export type SignalWriteConfig = {
  target: SignalRef;
  action: SignalWriteAction;
  pulseMs: number;
};
export type SignalTimeoutAction = "alarm" | "cancel" | "continue";
export type SignalWaitConfig = {
  conditions: SignalCondition[];
  match: "all" | "any";
  holdSec: number;
  timeoutSec: number;
  onTimeout: SignalTimeoutAction;
};
export type PeripheralSignalConfig = {
  write?: SignalWriteConfig;
  wait?: SignalWaitConfig;
};

export type SignalPoint = {
  index: number;
  code: string;
  name: string;
  /** 現在的值; 模組沒連線 = null */
  value: boolean | null;
};
export type AdvantechSignalModule = {
  id: string;
  name: string;
  ip: string;
  group: string | null;
  connected: boolean;
  di: SignalPoint[];
  do: SignalPoint[];
};
export type RemoteSignalModule = {
  module: string;
  alive: boolean;
  states: boolean[];
};
export type SignalSources = {
  advantech: AdvantechSignalModule[];
  remote: RemoteSignalModule[];
};

export const SIGNAL_SOURCES_KEY = ["signal-sources"];

/** 設定畫面開著時每 2 秒重抓, 選訊號時看得到現在的值 */
export const useSignalSources = (enabled = true) =>
  useQuery({
    queryKey: SIGNAL_SOURCES_KEY,
    queryFn: async () => {
      const res = await client.get<SignalSources>("api/setting/signal-sources");
      return res.data;
    },
    enabled,
    refetchInterval: 2000,
  });

/** 從清單讀一個點現在的值; 沒有這個模組 / 點、模組斷線 = null */
export const readSignal = (
  sources: SignalSources | undefined,
  ref: Partial<SignalRef> | undefined,
  side: "di" | "do",
): boolean | null => {
  if (!sources || !ref?.module || ref.channel === undefined || ref.channel === null) {
    return null;
  }
  if (ref.source === "advantech") {
    const m = sources.advantech.find((x) => x.id === ref.module);
    if (!m || !m.connected) return null;
    return m[side][ref.channel]?.value ?? null;
  }
  const m = sources.remote.find((x) => x.module === ref.module);
  if (!m || !m.alive) return null;
  const v = m.states[ref.channel];
  return typeof v === "boolean" ? v : null;
};

/** 設定填完整了沒 (送出前的提示用; 真正的檢查在後端) */
export const isRefComplete = (ref: Partial<SignalRef> | undefined) =>
  !!ref?.source &&
  !!ref.module &&
  typeof ref.channel === "number" &&
  ref.channel >= 0;

export const defaultWriteConfig = (): SignalWriteConfig => ({
  target: { source: "advantech", module: "", channel: 0 },
  action: "ON",
  pulseMs: 500,
});

export const defaultWaitConfig = (): SignalWaitConfig => ({
  conditions: [{ source: "advantech", module: "", channel: 0, expect: true }],
  match: "all",
  holdSec: 0,
  timeoutSec: 0,
  onTimeout: "alarm",
});
