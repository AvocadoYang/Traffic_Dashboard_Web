import type { HeatCell } from "@/api/useTrackArchive";

/**
 * 熱度圖的算法:
 *  - 車流: 停留的秒數 / 開進去的次數
 *  - 網路 / 定位品質: 網路延遲 (心跳來回)、WiFi 訊號、斷線、定位失準、換 AP 的地點
 */
export type HeatMetric =
  | "dwell"
  | "passes"
  | "latency"
  | "wifi"
  | "disconnect"
  | "localization"
  | "roam";

export const TRAFFIC_METRICS: HeatMetric[] = ["dwell", "passes"];
export const NETWORK_METRICS: HeatMetric[] = ["latency", "wifi", "disconnect", "localization", "roam"];

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

/** 延遲 / WiFi 用固定的刻度 (不同時段、不同案場比得起來): 延遲 0 ~ 300 ms, 訊號 -50 ~ -80 dBm */
export const LATENCY_HOT_MS = 300;
export const WIFI_GOOD_DBM = -50;
export const WIFI_BAD_DBM = -80;

/** 這格這個算法的值; 沒有資料 = null (不畫) */
export const heatValue = (c: HeatCell, metric: HeatMetric): number | null => {
  switch (metric) {
    case "dwell":
      return c.dwell;
    case "passes":
      return c.passes;
    case "latency":
      return c.latency ?? null;
    case "wifi":
      return c.wifi ?? null;
    default:
      return c[metric] ?? null;
  }
};

/** 熱點排序用: 越大越糟 (延遲看最大值; WiFi 看最弱的訊號, 越小越糟) */
export const badness = (c: HeatCell, metric: HeatMetric): number | null => {
  if (metric === "wifi") return c.wifiMin !== undefined ? -c.wifiMin : null;
  if (metric === "latency") return c.latencyMax ?? null;
  const v = heatValue(c, metric);
  return v && v > 0 ? v : null;
};

/** 有資料但很好的格子也要看得到 (淡藍), 才分得出「好」和「沒資料」 */
const FLOOR = 0.04;

/**
 * 每格的熱度 0~1 (0 = 不畫)。
 *  - 車流、事件次數: 取平方根拉開低的值, 最大值用第 95 百分位
 *    (少數特別熱的格子不會把其他都壓成一片藍)
 *  - 延遲、WiFi: 固定刻度
 * 回傳 level(cell) 與色階最大值 (圖例用)
 */
export const heatScale = (cells: HeatCell[], metric: HeatMetric) => {
  if (metric === "latency") {
    return {
      max: LATENCY_HOT_MS,
      level: (c: HeatCell) =>
        c.latency === undefined ? 0 : Math.max(FLOOR, Math.min(1, c.latency / LATENCY_HOT_MS)),
    };
  }
  if (metric === "wifi") {
    return {
      max: WIFI_BAD_DBM,
      level: (c: HeatCell) =>
        c.wifi === undefined
          ? 0
          : Math.max(FLOOR, Math.min(1, (WIFI_GOOD_DBM - c.wifi) / (WIFI_GOOD_DBM - WIFI_BAD_DBM))),
    };
  }
  // 車流: 跟以前一樣看有車經過的格子 (只有網路資料的格子不算); 事件: 只看有發生的格子
  const pool = TRAFFIC_METRICS.includes(metric)
    ? cells.filter((c) => c.dwell > 0 || c.passes > 0)
    : cells.filter((c) => (heatValue(c, metric) ?? 0) > 0);
  const values = pool.map((c) => heatValue(c, metric) ?? 0).sort((a, b) => a - b);
  const max = values.length ? Math.max(values[Math.floor((values.length - 1) * 0.95)], 1e-6) : 1;
  const level = (c: HeatCell) => {
    const v = heatValue(c, metric) ?? 0;
    return v <= 0 ? 0 : Math.min(1, Math.sqrt(v / max));
  };
  return { max, level };
};
