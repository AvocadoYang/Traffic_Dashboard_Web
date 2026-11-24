import type { StateTone } from "@/api/useAdvantech";

/**
 * 自訂狀態的顏色。跟 palettes.ts 的狀態色一樣刻意不跟主題走 (紅就是異常、綠就是正常),
 * 淡底用 color-mix 疊透明, 深色主題上才不會變成一塊發亮的色塊。
 */
const SOLID: Record<StateTone, string> = {
  green: "#2e9e4f",
  blue: "#2f6fdb",
  amber: "#d48806",
  red: "#d4380d",
  purple: "#7c4ddb",
  gray: "#8c8c8c",
};

export const toneSolid = (tone: StateTone | undefined) =>
  SOLID[tone ?? "gray"] ?? SOLID.gray;

/** 淡底: 狀態卡、清單上被選中的那一列 */
export const toneSoft = (tone: StateTone | undefined, percent = 14) =>
  `color-mix(in srgb, ${toneSolid(tone)} ${percent}%, transparent)`;
