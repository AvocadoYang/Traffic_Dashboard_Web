/**
 * 畫布上沒有 DOM 元素可以吃滑鼠事件, 游標指著什麼要自己算距離。
 * 輸入的 (sx, sy) 是畫布上的螢幕座標。
 */
import type { MapScene, ScenePoint } from "./scene";
import type { AmrHit } from "./draw";
import { pointRadius, roadLineWidth } from "./draw";
import type { MapView } from "./view";

/** 游標附近多遠 (公尺) 的點位 / 路線算「附近」, 同舊地圖的提示 */
export const NEARBY_RADIUS_M = 2;

const toMap = (view: MapView, sx: number, sy: number) => ({
  x: (sx - view.x) / view.scale,
  y: (sy - view.y) / view.scale,
});

/** 點到線段的距離 (同一個座標系) */
export const segmentDistance = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2)) : 0;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
};

/** 游標指著的車 (疊在一起時取最後畫的, 也就是最上面那台) */
export const amrAt = (hits: AmrHit[], view: MapView, sx: number, sy: number): AmrHit | null => {
  const m = toMap(view, sx, sy);
  // 車很小, 邊緣多給 3 螢幕像素
  const pad = 3 / view.scale;
  for (let i = hits.length - 1; i >= 0; i -= 1) {
    const h = hits[i];
    const dx = m.x - h.x;
    const dy = m.y - h.y;
    const cos = Math.cos(-h.angle);
    const sin = Math.sin(-h.angle);
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    if (lx >= h.left - pad && lx <= h.right + pad && ly >= h.top - pad && ly <= h.bottom + pad) return h;
  }
  return null;
};

/** 暫停標誌 (畫在堆高機車身中間, 半徑 15 地圖像素) */
export const pauseSignAt = (hit: AmrHit, view: MapView, sx: number, sy: number) => {
  if (!hit.isPause) return false;
  const m = toMap(view, sx, sy);
  const cx = hit.x + 10 * Math.sin(hit.angle);
  const cy = hit.y - 10 * Math.cos(hit.angle);
  return Math.hypot(m.x - cx, m.y - cy) <= 15;
};

/** 游標指著的點位 (取最近的) */
export const pointAt = (scene: MapScene, view: MapView, sx: number, sy: number): ScenePoint | null => {
  const dot = Math.max(pointRadius({ view }) + 3, 6);
  const mir = Math.max((22 / 2) * view.scale, 6);
  let best: ScenePoint | null = null;
  let bestD = Infinity;
  for (const p of scene.points) {
    const d = Math.hypot(view.x + p.x * view.scale - sx, view.y + p.y * view.scale - sy);
    if (d <= (p.mir ? mir : dot) && d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
};

/** 游標指著的路線 (取最近的) */
export const roadAt = (scene: MapScene, view: MapView, sx: number, sy: number): string | null => {
  const tol = Math.max(roadLineWidth({ view }) / 2 + 3, 4);
  let best: string | null = null;
  let bestD = Infinity;
  for (const r of scene.roads) {
    const d = segmentDistance(
      sx,
      sy,
      view.x + r.x1 * view.scale,
      view.y + r.y1 * view.scale,
      view.x + r.x2 * view.scale,
      view.y + r.y2 * view.scale,
    );
    if (d <= tol && d < bestD) {
      best = r.id;
      bestD = d;
    }
  }
  return best;
};

const byNumber = (a: string, b: string) => Number(a) - Number(b);

/** 游標附近 (公尺) 的點位, 依編號排序 */
export const nearbyPoints = (scene: MapScene, view: MapView, sx: number, sy: number) => {
  const m = toMap(view, sx, sy);
  const r = NEARBY_RADIUS_M / scene.resolution;
  return scene.points
    .filter((p) => Math.hypot(p.x - m.x, p.y - m.y) <= r)
    .map((p) => p.id)
    .sort(byNumber);
};

/** 游標附近 (公尺) 的路線 */
export const nearbyRoads = (scene: MapScene, view: MapView, sx: number, sy: number) => {
  const m = toMap(view, sx, sy);
  const r = NEARBY_RADIUS_M / scene.resolution;
  return scene.roads
    .filter((road) => segmentDistance(m.x, m.y, road.x1, road.y1, road.x2, road.y2) <= r)
    .map((road) => road.id)
    .sort();
};

export const screenToMap = toMap;
