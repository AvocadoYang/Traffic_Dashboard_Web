/**
 * 畫布地圖的視角。座標系統沿用舊地圖: 底圖像素 (左上角為原點, y 向下),
 * 所以設備圖層那些 DOM 元件 (貨架、輸送帶…) 不用改就能疊在同一個位置。
 *
 * 螢幕 = 底圖像素 * scale + (x, y)
 */
export type MapView = { scale: number; x: number; y: number };

/** 跟舊地圖的滾輪縮放 (Setting/hooks/useWheelZoom) 同一組範圍和手感 */
export const MIN_SCALE = 0.05;
export const MAX_SCALE = 8;
const ZOOM_SENSITIVITY = 0.0003;
const MAX_DELTA = 200;

export const clampScale = (s: number) =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

export const wheelFactor = ({ deltaY, deltaMode }: WheelEvent) => {
  const pixels = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? 100 : 1);
  return Math.exp(
    -Math.max(-MAX_DELTA, Math.min(MAX_DELTA, pixels)) * ZOOM_SENSITIVITY,
  );
};

/** 以螢幕上 (sx, sy) 為中心縮放到 nextScale, 那一點底下的地圖位置不動 */
export const zoomTo = (
  view: MapView,
  sx: number,
  sy: number,
  nextScale: number,
): MapView => {
  const scale = clampScale(nextScale);
  const px = (sx - view.x) / view.scale;
  const py = (sy - view.y) / view.scale;
  return { scale, x: sx - px * scale, y: sy - py * scale };
};

/**
 * 初始視角, 規則跟舊地圖 (hooks/useCenterMap) 一樣:
 * 後端有設定 scrollX / scrollY 就照那個捲動位置, 都是 0 就把底圖中心放到畫面中央。
 */
export const initialView = (
  map: { scale: number; scrollX: number; scrollY: number; mapWidth: number; mapHeight: number },
  width: number,
  height: number,
): MapView => {
  const scale = clampScale(map.scale);
  if (map.scrollX || map.scrollY) {
    // 舊地圖底圖比畫面小時會置中 (margin: auto), 捲動位置也被瀏覽器限制在範圍內
    const w = map.mapWidth * scale;
    const h = map.mapHeight * scale;
    const x = w <= width ? (width - w) / 2 : -Math.min(Math.max(map.scrollX, 0), w - width);
    const y = h <= height ? (height - h) / 2 : -Math.min(Math.max(map.scrollY, 0), h - height);
    return { scale, x, y };
  }
  return {
    scale,
    x: width / 2 - (map.mapWidth * scale) / 2,
    y: height / 2 - (map.mapHeight * scale) / 2,
  };
};

/** 畫面範圍換成底圖像素, 畫的時候拿來跳過看不到的東西 */
export const visibleRect = (view: MapView, width: number, height: number, margin = 0) => ({
  minX: (-view.x - margin) / view.scale,
  minY: (-view.y - margin) / view.scale,
  maxX: (width - view.x + margin) / view.scale,
  maxY: (height - view.y + margin) / view.scale,
});
