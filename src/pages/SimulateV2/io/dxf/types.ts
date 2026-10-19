/**
 * DXF 讀完、展開成線之後的樣子 (Worker 傳回畫面). 座標是「圖面單位、以 base 為原點」,
 * 用 Float32 存 (CAD 圖常常畫在離原點很遠的地方, 先減掉 base 才不會掉精度).
 */

export interface CadBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface CadLayerInfo {
  name: string;
  /** AutoCAD 顏色號碼 */
  color: number;
  /** 檔案裡是關閉或凍結的圖層: 匯入時預設不顯示 */
  hiddenInFile: boolean;
  /** 這個圖層有幾條線、幾個文字 */
  lines: number;
  texts: number;
}

export interface CadText {
  layer: number;
  x: number;
  y: number;
  /** 字高 (圖面單位) */
  h: number;
  /** 弧度 */
  rot: number;
  text: string;
  /** 0 左 1 中 2 右 */
  ha: number;
  /** 0 基線 1 底 2 中 3 上 */
  va: number;
}

/** 吸附點的種類 */
export const SNAP_END = 0;
export const SNAP_CROSS = 1;
export const SNAP_CENTER = 2;

export interface CadSnapIndex {
  /** x, y 一組 */
  pts: Float32Array;
  kind: Uint8Array;
  /** 點在哪個圖層; 交點有兩個圖層 (兩條線各一) */
  layerA: Uint16Array;
  layerB: Uint16Array;
  /** 格子索引 (CSR): 第 k 格的點是 idx[start[k] .. start[k+1]) */
  cell: number;
  minX: number;
  minY: number;
  cols: number;
  rows: number;
  start: Uint32Array;
  idx: Uint32Array;
}

export interface CadStats {
  entities: number;
  polylines: number;
  vertices: number;
  texts: number;
  inserts: number;
  /** 沒畫的圖元類型和數量 */
  skipped: Record<string, number>;
  /** 外部參考的圖塊 (內容不在這個檔案裡) */
  xrefs: string[];
  /** 線太多, 後面的沒有讀進來 */
  truncated: boolean;
  intersections: number;
  /** 交點太多, 只算了一部分 */
  intersectionsTruncated: boolean;
  /** 離主要範圍很遠的頂點數 (零星的線, 不算進縮放範圍) */
  outliers: number;
}

export interface CadGeometry {
  /** 圖面座標的原點 (圖面單位) */
  base: { x: number; y: number };
  /** 全部的範圍 / 主要範圍 (以 base 為原點); 縮放到全部看得到用主要範圍 */
  bounds: CadBounds;
  mainBounds: CadBounds;
  layers: CadLayerInfo[];
  /** 所有線的頂點, x, y 一組 */
  coords: Float32Array;
  /** 第 i 條線的頂點是 coords 的第 polyStart[i] ~ polyStart[i+1]-1 組; 長度 = 線數 + 1 */
  polyStart: Uint32Array;
  polyLayer: Uint16Array;
  /** 每條線的範圍: minX, minY, maxX, maxY */
  polyBox: Float32Array;
  texts: CadText[];
  snap: CadSnapIndex;
  header: { insunits: number | null; acadver: string; codepage: string; encoding: string };
  stats: CadStats;
}

/** 要傳過 Worker 的 typed array */
export const cadTransfer = (g: CadGeometry): ArrayBuffer[] =>
  [g.coords, g.polyStart, g.polyLayer, g.polyBox, g.snap.pts, g.snap.kind, g.snap.layerA, g.snap.layerB, g.snap.start, g.snap.idx].map(
    (a) => a.buffer as ArrayBuffer,
  );

/** 每個圖層要不要畫 (1 = 隱藏) */
export function hiddenMaskOf(g: CadGeometry, hiddenLayers: string[]): Uint8Array {
  const hidden = new Set(hiddenLayers);
  return Uint8Array.from(g.layers, (l) => (hidden.has(l.name) ? 1 : 0));
}
