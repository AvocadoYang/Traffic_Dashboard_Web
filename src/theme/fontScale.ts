import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

/**
 * 字體大小 (個人偏好): 1 = 原本大小。套在 <html> 的 --font-scale 上,
 * responsive.css 的 --font-xs..lg 和 antd 的 fontSize 都乘這個值。
 * 也存一份在 localStorage, 重新整理時不用等後端回來才變大。
 */
export const FONT_SCALE_MIN = 0.85;
export const FONT_SCALE_MAX = 1.5;
export const FONT_SCALE_STEPS = [0.9, 1, 1.15, 1.3] as const;

const clampScale = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 1;
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, n));
};

const storage = {
  getItem: (key: string, initial: number) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? clampScale(raw) : initial;
    } catch {
      return initial;
    }
  },
  setItem: (key: string, value: number) => {
    try {
      localStorage.setItem(key, String(clampScale(value)));
    } catch {
      /* 存不進去就只在這次有效 */
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* 同上 */
    }
  },
};

export const fontScaleAtom = atomWithStorage<number>("fleet-ui-font-scale", 1, storage, { getOnInit: true });

/** 乘上字體大小後的 px, 取整數 */
export const scaledPx = (px: number, scale: number) => Math.round(px * clampScale(scale));

// ------------------------------------------------------------------ 瀏覽器縮放補償
//
// 現場人員 (FAE) 常用 Ctrl - 把瀏覽器縮到 67% 左右, 好讓桌面版版面塞得進小螢幕。
// 縮小之後 12px 的字實際只剩約 8px, 看不清楚。偵測到縮小 (devicePixelRatio < 1) 時, 把字體大小自動放大一點補回來:
// - 補償只存在「這台電腦」(localStorage), 不寫進帳號 (換電腦、換螢幕就不該跟著走)
// - 跟使用者自己選的字體大小相乘, 最後仍夾在 FONT_SCALE_MAX 以內
// - 只在縮小的時候補償: 放大 (dpr > 1) 通常是系統顯示縮放 (Windows 125% / 150%), 不是使用者想看小字
// 限制: 螢幕本身是 125% 時縮到 80% 剛好 dpr = 1, 偵測不到 (瀏覽器沒有直接回報縮放比例的方法)。

/** 補償的目標: 讓字的實際大小大約維持在原本的 85% (dpr 0.67 → 放大 1.25 倍) */
const ZOOM_COMP_TARGET = 0.85;

/** 依 devicePixelRatio 算補償倍率, 以 0.05 為單位 (縮放過程中不要每個像素都重排) */
export const zoomCompOf = (dpr: number) => {
  if (!Number.isFinite(dpr) || dpr <= 0 || dpr >= ZOOM_COMP_TARGET) return 1;
  const raw = Math.min(FONT_SCALE_MAX, ZOOM_COMP_TARGET / dpr);
  return Math.max(1, Math.round(raw * 20) / 20);
};

const boolStorage = {
  getItem: (key: string, initial: boolean) => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : raw === "true";
    } catch {
      return initial;
    }
  },
  setItem: (key: string, value: boolean) => {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      /* 存不進去就只在這次有效 */
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* 同上 */
    }
  },
};

/** 縮小瀏覽器時自動放大字體 (這台電腦的設定, 預設開) */
export const autoZoomFontAtom = atomWithStorage<boolean>("fleet-ui-auto-zoom-font", true, boolStorage, {
  getOnInit: true,
});

/** 目前的 devicePixelRatio (縮放時由 ThemeVarsProvider 更新) */
export const pixelRatioAtom = atom(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);

/** 目前的自動補償倍率 (1 = 沒有補償) */
export const zoomCompAtom = atom((get) => (get(autoZoomFontAtom) ? zoomCompOf(get(pixelRatioAtom)) : 1));

/** 實際套用在畫面上的字體倍率 = 使用者設的 × 縮放補償 */
export const effectiveFontScaleAtom = atom((get) => clampScale(get(fontScaleAtom) * get(zoomCompAtom)));
