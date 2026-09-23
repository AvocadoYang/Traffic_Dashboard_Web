// 設定頁 v2 的配色:灰 / 黑 / 白為主,紅色只保留給刪除這種破壞性動作。
// 所有新面板都從這裡取色,不要再各自寫死 hex,之後要調整配色只改這一份。
export const c = {
  /** 面板底色 */
  bg: "#ffffff",
  /** 區塊 / 表頭底色 */
  bgSubtle: "#fafafa",
  /** 更深一階的底色(hover、被選取) */
  bgMuted: "#f0f0f0",
  /** 被選取的強調底色 */
  bgSelected: "#e8e8e8",

  border: "#e4e4e4",
  borderStrong: "#c8c8c8",

  text: "#1c1c1c",
  textSecondary: "#5c5c5c",
  textMuted: "#949494",

  /** 強調色(選取、focus、主要按鈕)——刻意用黑,不用藍 */
  accent: "#1c1c1c",

  /** 只給刪除 / 破壞性動作 */
  danger: "#c0341d",
  dangerSoft: "#fbf0ed",
} as const;

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
