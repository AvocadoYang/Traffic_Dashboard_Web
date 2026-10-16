/**
 * 任務模擬 v2 的專案內容 (存在後端 sim_project.doc).
 *
 * 座標一律是公尺, y 軸朝上 (跟 CAD、現場地圖一樣); 畫到畫面上時才把 y 反過來.
 * 格式有變時把 SIM_DOC_VERSION 加一, 並在 migrate.ts 裡把舊格式升上來.
 */
export const SIM_DOC_VERSION = 2;

/** point: 一般點位 / station: 站點 (取放貨) / standby: 待命點 */
export type NodeKind = "point" | "station" | "standby";

/** pick: 取貨 / drop: 放貨 / both: 取放貨 */
export type StationType = "pick" | "drop" | "both";

export interface StationProps {
  type: StationType;
  /** 取貨秒數 (含進站對位) */
  pickSec: number;
  /** 放貨秒數 (含進站對位) */
  dropSec: number;
  /** 取貨站最多暫存幾板, 滿了產線就停下來等; null 代表不限 */
  bufferMax: number | null;
}

export interface SimNode {
  id: string;
  name: string;
  x: number;
  y: number;
  kind: NodeKind;
  /** kind 是 station 才有 */
  station?: StationProps;
}

/** two-way: 雙向 (一次只走一個方向) / one-way: 只能從 from 走到 to */
export type PathDirection = "two-way" | "one-way";

export interface SimPath {
  id: string;
  from: string;
  to: string;
  direction: PathDirection;
  /** 限速 (公尺/秒); null 代表照車速 */
  maxSpeed: number | null;
}

export interface SimGroup {
  id: string;
  name: string;
  /** 成員站點的 node id */
  nodeIds: string[];
}

/** 圖片底圖 (上傳的圖片、PDF 轉出來的圖、現場地圖) */
export interface ImageBackground {
  kind: "image";
  /** 後端 sim_project_file 的 file_key */
  fileId: string;
  fileName: string;
  source: "upload" | "pdf" | "site";
  /** PDF 的第幾頁 (source 是 pdf 才有) */
  pdfPage?: number;
  widthPx: number;
  heightPx: number;
  /** 圖片左下角的座標 (公尺), 跟現場地圖的 origin 同一個意思 */
  originX: number;
  originY: number;
  /** 一個像素是幾公尺 */
  metersPerPx: number;
  /** 0 ~ 1 */
  opacity: number;
  /** 鎖定時不能拖曳 */
  locked: boolean;
  /** 比例校正過沒有; 現場地圖帶解析度, 直接算校正過 */
  calibrated: boolean;
}

export type SimBackground = ImageBackground;

export interface EditorSettings {
  /** 格線間距 (公尺) */
  gridSize: number;
  /** 吸附到格線 */
  snap: boolean;
  /** 新畫的路線預設方向 */
  defaultDirection: PathDirection;
}

/** 車種; 車隊就是每種車的台數 */
export interface VehicleType {
  id: string;
  name: string;
  /** 幾台 */
  count: number;
  /** 車身長、寬 (公尺), 長度含貨叉和載的貨 */
  length: number;
  width: number;
  /** 空車、載貨的最高速度 (公尺/秒) */
  speedEmpty: number;
  speedLoaded: number;
  /** 加速度、減速度 (公尺/秒²) */
  accel: number;
  decel: number;
  /** 原地轉向的速度 (度/秒) */
  turnSpeed: number;
  /** 可以倒退著開: 要往回走時直接倒車, 不用原地轉 180 度 */
  canReverse: boolean;
}

/** 車跟車之間的規則, 所有車種共用 */
export interface TrafficSettings {
  /** 前後兩台車之間至少留多少 (公尺) */
  safetyGap: number;
  /** 行進方向轉超過幾度, 就要停下來原地轉 */
  turnThresholdDeg: number;
}

/** fixed: 固定間隔 / random: 平均每小時 X 板, 間隔隨機 (卜瓦松到達) */
export type DemandMode = "fixed" | "random";

/** 搬運需求表的一列 */
export interface DemandRow {
  id: string;
  /** 站點 (node id) 或群組 (group id); 空字串代表還沒選 */
  from: string;
  to: string;
  perHour: number;
  mode: DemandMode;
  /** 時段 "HH:MM" (照 RunSettings.startClock 對時間); 都是 null 代表整段 */
  start: string | null;
  end: string | null;
  /** 數字大的先派 */
  priority: number;
}

export interface RunSettings {
  /** 模擬幾小時 */
  durationH: number;
  /** 前面幾分鐘不算進統計 */
  warmupMin: number;
  /** 模擬從幾點開始 (HH:MM); 搬運需求的時段照這個對 */
  startClock: string;
  /** 亂數種子: 同一個種子, 結果就一樣 */
  seed: number;
}

export interface SimDoc {
  schemaVersion: typeof SIM_DOC_VERSION;
  background: SimBackground | null;
  nodes: SimNode[];
  paths: SimPath[];
  groups: SimGroup[];
  editor: EditorSettings;
  vehicleTypes: VehicleType[];
  traffic: TrafficSettings;
  demand: DemandRow[];
  run: RunSettings;
}

export interface Point {
  x: number;
  y: number;
}
