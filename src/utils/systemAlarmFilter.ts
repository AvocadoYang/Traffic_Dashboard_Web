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
