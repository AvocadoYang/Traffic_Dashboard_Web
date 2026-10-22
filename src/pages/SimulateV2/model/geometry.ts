import { Point } from "./types";

export const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

/** 點到線段最近的位置; t 是沿線段的比例 (0 = a, 1 = b) */
export function projectOnSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  const point = { x: a.x + t * dx, y: a.y + t * dy };
  return { t, point, distance: dist(p, point) };
}

/**
 * 兩條線段的交點 (不含端點附近 eps 公尺以內); 平行或沒交到回 null.
 * 回傳的 t / u 分別是交點在 ab、cd 上的比例.
 */
export function segmentIntersection(a: Point, b: Point, c: Point, d: Point, eps = 1e-6) {
  const rX = b.x - a.x;
  const rY = b.y - a.y;
  const sX = d.x - c.x;
  const sY = d.y - c.y;
  const denom = rX * sY - rY * sX;
  if (Math.abs(denom) < 1e-12) return null;
  const qpX = c.x - a.x;
  const qpY = c.y - a.y;
  const t = (qpX * sY - qpY * sX) / denom;
  const u = (qpX * rY - qpY * rX) / denom;
  const lenAB = Math.hypot(rX, rY);
  const lenCD = Math.hypot(sX, sY);
  const tEps = lenAB === 0 ? 1 : eps / lenAB;
  const uEps = lenCD === 0 ? 1 : eps / lenCD;
  if (t <= tEps || t >= 1 - tEps || u <= uEps || u >= 1 - uEps) return null;
  return { t, u, point: { x: a.x + t * rX, y: a.y + t * rY } };
}

export const snapToGrid = (p: Point, size: number): Point =>
  size > 0
    ? { x: Math.round(p.x / size) * size, y: Math.round(p.y / size) * size }
    : p;

/** 按住 Shift 畫線時把角度鎖在 45 度的倍數 */
export function constrainAngle(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return to;
  const step = Math.PI / 4;
  const angle = Math.round(Math.atan2(dy, dx) / step) * step;
  return { x: from.x + len * Math.cos(angle), y: from.y + len * Math.sin(angle) };
}

/** 去掉浮點數尾巴: 座標存到 0.1 公釐 */
export const roundCoord = (v: number) => Math.round(v * 10000) / 10000;

export const roundPoint = (p: Point): Point => ({ x: roundCoord(p.x), y: roundCoord(p.y) });

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function boundsOf(points: Point[]): Bounds | null {
  if (points.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

/** 長度的顯示: 1 公尺以下用公分 */
export const formatLength = (m: number) =>
  m < 1 ? `${(m * 100).toFixed(1)} cm` : `${m.toFixed(m < 10 ? 2 : 1)} m`;
