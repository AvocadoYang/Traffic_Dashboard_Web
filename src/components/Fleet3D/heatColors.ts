import type { HeatCell } from "@/api/useTrackArchive";

/** 熱度圖的兩種算法: 停留的秒數 / 開進去的次數 */
export type HeatMetric = "dwell" | "passes";

/** 色階: 冷 (藍) -> 青 -> 黃 -> 紅 */
const STOPS: [number, [number, number, number]][] = [
  [0, [49, 130, 189]],
  [0.35, [0, 190, 200]],
  [0.65, [250, 210, 60]],
  [1, [225, 45, 40]],
];

/** 0~1 對到顏色 [r, g, b] */
export const heatRgb = (v: number): [number, number, number] => {
  const x = Math.min(1, Math.max(0, v));
  for (let i = 1; i < STOPS.length; i++) {
    const [b, cb] = STOPS[i];
    const [a, ca] = STOPS[i - 1];
    if (x <= b) {
      const f = (x - a) / (b - a);
      return [0, 1, 2].map((k) => Math.round(ca[k] + (cb[k] - ca[k]) * f)) as [number, number, number];
    }
  }
  return STOPS[STOPS.length - 1][1];
};

/**
 * 每格的熱度 0~1: 取平方根拉開低的值, 最大值用第 95 百分位 (少數特別熱的格子不會把其他都壓成一片藍)。
 * 回傳 Map<"ix,iy", 0~1> 與色階最大值 (圖例用)
 */
export const heatScale = (cells: HeatCell[], metric: HeatMetric) => {
  const values = cells.map((c) => c[metric]).sort((a, b) => a - b);
  const max = values.length ? Math.max(values[Math.floor((values.length - 1) * 0.95)], 1e-6) : 1;
  const level = (c: HeatCell) => Math.min(1, Math.sqrt(c[metric] / max));
  return { max, level };
};
