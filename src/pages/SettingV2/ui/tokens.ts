import { colorKeys, cssVar, type PaletteColors } from "@/theme";

// 設定頁 v2 的配色。
//
// 這裡每個值都是 CSS 變數的參照(例如 `var(--c-bg)`),真正的顏色定義在
// src/theme/palettes.ts。好處是 styled-components 的樣板字串只會被算一次,
// 但因為算出來的是變數名稱而不是色碼,使用者換主題時只要換 <html> 上的變數值,
// 畫面就整個跟著換,不需要重新掛載任何元件。
//
// 所以:要調色請去 palettes.ts,不要在這裡或各面板寫死 hex。
export const c = Object.fromEntries(
  colorKeys.map((key) => [key, cssVar(key)]),
) as Record<keyof PaletteColors, string>;

export const font = {
  mono: `"Roboto Mono", ui-monospace, monospace`,
  xs: "11px",
  sm: "12px",
  md: "13px",
  lg: "15px",
} as const;

export const space = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
} as const;

/** 小螢幕斷點:清單在這個寬度以下改用卡片式呈現,不要橫向捲動的大表格 */
export const NARROW = "(max-width: 900px)";
export const mqNarrow = `@media ${NARROW}`;
