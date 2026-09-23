import { atom } from "jotai";

/** 全隱藏 = 面板佔滿;半開 = 面板與地圖各半;全開 = 地圖佔滿(面板收起) */
export type MapViewMode = "hidden" | "half" | "full";

const STORAGE_KEY = "settingV2MapViewMode";

const read = (): MapViewMode => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "hidden" || saved === "half" || saved === "full") return saved;
  } catch {
    // 無痕模式 / 停用 storage 時直接用預設值
  }
  return "half";
};

const baseAtom = atom<MapViewMode>(read());

export const mapViewModeAtom = atom(
  (get) => get(baseAtom),
  (_get, set, next: MapViewMode) => {
    set(baseAtom, next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 存不起來就算了,不影響操作
    }
  },
);
