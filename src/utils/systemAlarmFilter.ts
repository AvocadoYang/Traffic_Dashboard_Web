import { atom } from "jotai";
import { AlarmType } from "@/sockets/useSystemAlarm";

const STORAGE_KEY = "systemAlarmTypeFilter";

export const ALARM_TYPES: AlarmType[] = ["error", "warn", "success", "info"];

export const ALARM_ACCENT: Record<AlarmType, string> = {
  error: "#ff4d4f",
  warn: "#faad14",
  success: "#52c41a",
  info: "#1890ff",
};

const ALL_ENABLED: Record<AlarmType, boolean> = {
  error: true,
  warn: true,
  success: true,
  info: true,
};

const readStored = (): Record<AlarmType, boolean> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return ALL_ENABLED;
    return {
      ...ALL_ENABLED,
      ...(JSON.parse(raw) as Partial<Record<AlarmType, boolean>>),
    };
  } catch {
    return ALL_ENABLED;
  }
};

const storedFilter = atom(readStored());

// 設定頁一改,Main 的告警浮層立刻跟著變,同時寫回 localStorage 讓設定留到下次開頁。
export const systemAlarmTypeFilter = atom(
  (get) => get(storedFilter),
  (get, set, type: AlarmType, enabled: boolean) => {
    const next = { ...get(storedFilter), [type]: enabled };
    set(storedFilter, next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },
);

// 告警浮層的位置。整個案場共用,存在後端;這裡的 localStorage 只是讓重新整理時
// 先用上次的位置畫,不用等 socket 送來才從正下方跳過去。
export const ALARM_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;

export type AlarmPosition = (typeof ALARM_POSITIONS)[number];

export const DEFAULT_ALARM_POSITION: AlarmPosition = "bottom-center";

const POSITION_STORAGE_KEY = "systemAlarmPosition";

export const isAlarmPosition = (value: unknown): value is AlarmPosition =>
  ALARM_POSITIONS.includes(value as AlarmPosition);

const readStoredPosition = (): AlarmPosition => {
  try {
    const raw = localStorage.getItem(POSITION_STORAGE_KEY);
    return isAlarmPosition(raw) ? raw : DEFAULT_ALARM_POSITION;
  } catch {
    return DEFAULT_ALARM_POSITION;
  }
};

const storedPosition = atom(readStoredPosition());

export const systemAlarmPosition = atom(
  (get) => get(storedPosition),
  (_get, set, position: AlarmPosition) => {
    set(storedPosition, position);
    try {
      localStorage.setItem(POSITION_STORAGE_KEY, position);
    } catch {
      // 存不進去只是下次開頁會先閃一下預設位置
    }
  },
);

// 設定頁選了位置就加一,浮層看到數字變了會在新位置跳一張範例卡。
export const systemAlarmPreviewTick = atom(0);
