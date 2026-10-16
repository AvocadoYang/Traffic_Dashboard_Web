import { Bounds, boundsOf } from "../model/geometry";
import { Point, SimDoc } from "../model/types";
import { View } from "../state/editorAtoms";

/** 一公尺最少 / 最多幾個像素 */
export const MIN_SCALE = 0.2;
export const MAX_SCALE = 4000;

/** 螢幕 (畫布左上角為原點, y 向下) -> 地圖 (公尺, y 向上) */
export const toWorld = (view: View, sx: number, sy: number): Point => ({
  x: (sx - view.x) / view.scale,
  y: (view.y - sy) / view.scale,
});

export const toScreen = (view: View, p: Point): Point => ({
  x: view.x + p.x * view.scale,
  y: view.y - p.y * view.scale,
});

/** 以螢幕上 (sx, sy) 這一點為中心縮放, 那一點底下的地圖位置不動 */
export function zoomAt(view: View, sx: number, sy: number, factor: number): View {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale * factor));
  const w = toWorld(view, sx, sy);
  return { scale, x: sx - w.x * scale, y: sy + w.y * scale };
}

export function backgroundBounds(doc: SimDoc): Bounds | null {
  const bg = doc.background;
  if (!bg) return null;
  return {
    minX: bg.originX,
    minY: bg.originY,
    maxX: bg.originX + bg.widthPx * bg.metersPerPx,
    maxY: bg.originY + bg.heightPx * bg.metersPerPx,
  };
}

/** DXF 底圖主要範圍 (零星畫在很遠的線不算) 在地圖上的位置 */
export function cadBounds(doc: SimDoc): Bounds | null {
  const cad = doc.cad;
  if (!cad) return null;
  const e = cad.extent;
  if (!(e.maxX > e.minX || e.maxY > e.minY)) return null;
  const m = cad.metersPerUnit;
  return { minX: cad.originX + e.minX * m, minY: cad.originY + e.minY * m, maxX: cad.originX + e.maxX * m, maxY: cad.originY + e.maxY * m };
}

const union = (a: Bounds | null, b: Bounds | null): Bounds | null =>
  !a
    ? b
    : !b
      ? a
      : { minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY) };

/** 點位、底圖、DXF 全部看得到的範圍; 什麼都沒有時回 null */
export function contentBounds(doc: SimDoc): Bounds | null {
  return union(union(boundsOf(doc.nodes), backgroundBounds(doc)), cadBounds(doc));
}

export function fitView(bounds: Bounds | null, width: number, height: number, padding = 40): View {
  if (!bounds || width <= 0 || height <= 0) {
    // 空專案: 原點放在左下附近, 一公尺 20 像素
    return { scale: 20, x: padding * 2, y: Math.max(height - padding * 2, padding) };
  }
  const w = Math.max(bounds.maxX - bounds.minX, 1);
  const h = Math.max(bounds.maxY - bounds.minY, 1);
  const scale = Math.min(
    MAX_SCALE,
    Math.max(MIN_SCALE, Math.min((width - padding * 2) / w, (height - padding * 2) / h)),
  );
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  return { scale, x: width / 2 - cx * scale, y: height / 2 + cy * scale };
}
