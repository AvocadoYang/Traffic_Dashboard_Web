/**
 * 任務模擬 v2 的專案內容 (存在後端 sim_project.doc).
 *
 * 座標一律是公尺, y 軸朝上 (跟 CAD、現場地圖一樣); 畫到畫面上時才把 y 反過來.
 * 格式有變時把 SIM_DOC_VERSION 加一, 並在 migrate.ts 裡把舊格式升上來.
 */
export const SIM_DOC_VERSION = 1;

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

export interface SimDoc {
  schemaVersion: typeof SIM_DOC_VERSION;
  background: SimBackground | null;
  nodes: SimNode[];
  paths: SimPath[];
  groups: SimGroup[];
  editor: EditorSettings;
}

export interface Point {
  x: number;
  y: number;
}
