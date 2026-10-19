/**
 * 結果頁的顏色. 車的狀態用驗證過的分類色盤 (跟營運報表同一組, 色弱也分得出相鄰的兩色),
 * 深色主題用同一組色相調過的版本; 閒置用灰色 (不重要的時間). 圖表、回放的車、圖例都用這一組,
 * 同一個狀態在哪裡都是同一個顏色.
 *
 * 塞車熱點是大小 (等了多久): 單一色相的藍色由淺到深.
 */
import { CATEGORICAL_PALETTE } from "@/pages/MissionDispatchBoard/chartPalette";
import { TIME_BUCKETS, TimeBucket } from "../engine/types";

const DARK_CATEGORICAL = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300"];

/** 堆疊長條、圖例的順序 (固定) */
export const STATE_ORDER: TimeBucket[] = ["empty", "loaded", "pick", "drop", "traffic", "queue", "idle"];

export function stateColors(dark: boolean): Record<TimeBucket, string> {
  const c = dark ? DARK_CATEGORICAL : CATEGORICAL_PALETTE;
  return {
    empty: c[0],
    loaded: c[1],
    pick: c[2],
    drop: c[3],
    traffic: c[4],
    queue: c[5],
    idle: dark ? "#6b6a65" : "#c3c2b7",
  };
}

/** 軌跡裡的狀態 (低 4 bit) -> 名稱 */
export const bucketOf = (state: number): TimeBucket => TIME_BUCKETS[state & 0x0f] ?? "idle";
export const isLoaded = (state: number) => (state & 0x10) !== 0;

/** 藍色連續色階 (淺 -> 深) */
const BLUE_RAMP = ["#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b"];

/** 0 ~ 1 -> 色階上的顏色. 淺色底圖越多越深; 深色底圖反過來越多越亮 */
export function heatColor(f: number, darkCanvas: boolean): string {
  const ramp = darkCanvas ? [...BLUE_RAMP].reverse().slice(2).concat(["#9ec5f4", "#b7d3f6"]) : BLUE_RAMP;
  const i = Math.min(ramp.length - 1, Math.max(0, Math.round(f * (ramp.length - 1))));
  return ramp[i];
}

export const DEADLOCK_COLOR = "#d03b3b";
