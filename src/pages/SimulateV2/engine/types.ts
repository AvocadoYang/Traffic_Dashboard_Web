/**
 * 模擬引擎的輸入和輸出. 引擎是純 TypeScript, 不 import React 或畫面的東西,
 * 在 Web Worker 裡跑 (worker.ts), 測試直接在 node 裡跑.
 */
import type { SimDoc } from "../model/types";

/** 引擎只看得到這些 (底圖、編輯器設定跟模擬無關) */
export type SimInput = Pick<SimDoc, "nodes" | "paths" | "groups" | "vehicleTypes" | "traffic" | "demand" | "run">;

export interface SimOptions {
  /** 要不要記錄回放用的軌跡 (預設要) */
  trace?: boolean;
  /** 軌跡每隔幾秒記一次; 不給就依模擬時長自動決定 */
  traceDt?: number;
  /** 每算完這麼多秒 (模擬時間) 回報一次進度 */
  progressEverySec?: number;
  onProgress?: (simSec: number, totalSec: number) => void;
}

/**
 * 車的時間分配, 順序固定 (結果、圖表、回放的顏色都照這個):
 * 閒置 (含回待命點) / 空車行駛 / 載貨行駛 / 取貨 / 放貨 / 塞車等待 / 站點排隊
 */
export const TIME_BUCKETS = ["idle", "empty", "loaded", "pick", "drop", "traffic", "queue"] as const;
export type TimeBucket = (typeof TIME_BUCKETS)[number];

export interface Kpi {
  /** 統計時段內放貨完成的板數 / 小時數 */
  throughputPerHour: number;
  /** 統計時段內需求表設定的每小時板數 (時段外的不算) */
  demandPerHour: number;
  /** 這一次實際產生的每小時板數 (隨機到達會跟設定差一點; 產線停等時會變少) */
  createdPerHour: number;
  /** 產線停等少產生的每小時板數 (停了多久 x 那一列的速率) */
  lostPerHour: number;
  /** 需求達成率 = 每小時搬運量 / (實際產生 + 產線停等少產生的); 沒有需求時 null */
  achievement: number | null;
  /** 從需求產生到車開始取貨 (秒); 統計時段內產生、而且已經開始取貨的才算 */
  waitAvg: number | null;
  waitP95: number | null;
  waitMax: number | null;
  /** 從需求產生到放貨完成 (秒) */
  taskAvg: number | null;
  taskP95: number | null;
  /** 有任務的時間 / 統計時間, 所有車平均 (0 ~ 1) */
  utilization: number;
  lineStopCount: number;
  lineStopSec: number;
  /** 統計時段內產生 / 完成的板數 */
  created: number;
  completed: number;
  /** 模擬結束時: 還沒派到車或還沒取貨的、取了還沒放的 */
  backlog: number;
  inTransit: number;
}

export interface VehicleStats {
  name: string;
  typeName: string;
  /** 統計時段內各種狀態的秒數, 順序同 TIME_BUCKETS */
  time: number[];
  tasks: number;
  /** 統計時段內走了幾公尺 */
  distance: number;
}

export interface StationStats {
  nodeId: string;
  name: string;
  picks: number;
  drops: number;
  /** 平均 / 最多幾台車在排隊等這個站 */
  avgQueue: number;
  maxQueue: number;
  /** 有車在取放貨的時間比例 (0 ~ 1) */
  occupancy: number;
  /** 產線停等 (這個站當取貨來源、暫存滿了) */
  lineStops: number;
  lineStopSec: number;
}

export interface Hotspot {
  kind: "path" | "node" | "corridor";
  /** path: 路線 id / node: 點位 id / corridor: 窄道上所有路線的 id */
  ids: string[];
  /** 顯示用: 兩端點位名稱或點位名稱 */
  label: string;
  /** 統計時段內車在這裡等的總秒數 */
  sec: number;
  x: number;
  y: number;
}

export interface LoadRecord {
  id: number;
  /** 需求表第幾列 (從 0 開始) */
  row: number;
  created: number;
  /** 沒發生就是 -1 */
  assigned: number;
  pickStart: number;
  pickDone: number;
  dropStart: number;
  dropDone: number;
  vehicle: string | null;
  /** 實際取貨 / 放貨的站點 id */
  from: string | null;
  to: string | null;
}

export interface DeadlockInfo {
  t: number;
  vehicles: string[];
  points: { x: number; y: number }[];
}

export interface SimNote {
  /** no_standby_free: 閒置車擋路但沒有空的待命點可以讓 / reroute: 為了解開互卡改走別條路 / stuck: 等太久 */
  code: "no_standby_free" | "reroute" | "stuck";
  t: number;
  vehicle: string;
  x: number;
  y: number;
}

export interface Trace {
  /** 每隔幾秒一筆 */
  dt: number;
  /** 幾筆 */
  count: number;
  vehicles: { name: string; length: number; width: number }[];
  /** [筆][車][x, y, 車頭方向 (弧度)] */
  pose: Float32Array;
  /** [筆][車]: 低 4 bit 是 TIME_BUCKETS 的索引, 0x10 = 載著貨 */
  state: Uint8Array;
}

export interface SimResult {
  /** 預定的模擬秒數 */
  durationSec: number;
  /** 實際算到幾秒 (死結會提早停) */
  endSec: number;
  warmupSec: number;
  startClock: string;
  /** 算了多久 (毫秒, 實際時間) */
  wallMs: number;
  kpi: Kpi;
  vehicles: VehicleStats[];
  stations: StationStats[];
  hotspots: Hotspot[];
  /** 塞車熱點 (統計時段內等待秒數), 給地圖上色 */
  heat: { paths: Record<string, number>; nodes: Record<string, number> };
  /** 每個小時 (從模擬開始算) 產生 / 完成幾板 */
  hourly: { created: number; done: number }[];
  /** 需求表每一列: 統計時段內產生 / 完成幾板、產線停等幾次幾秒 */
  rows: { created: number; done: number; lineStops: number; lineStopSec: number }[];
  loads: LoadRecord[];
  deadlock: DeadlockInfo | null;
  notes: SimNote[];
  trace: Trace | null;
}
