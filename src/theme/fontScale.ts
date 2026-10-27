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
