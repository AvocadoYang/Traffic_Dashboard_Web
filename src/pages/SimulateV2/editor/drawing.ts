/**
 * 畫布上的東西都在螢幕座標直接畫 (Konva 的 sceneFunc), 不建一大堆 Konva 物件:
 * 點位、路線動輒好幾百個, 平移縮放時整張重畫比較快, 點選也是自己算距離.
 */
import { formatLength } from "../model/geometry";
import { ImageBackground, Point, SimDoc, SimNode } from "../model/types";
import { View } from "../state/editorAtoms";
import { SNAP_CENTER, SNAP_CROSS } from "../io/dxf/types";
import { CanvasColors, STATION_COLORS } from "./hooks";
import { Target } from "./targeting";
import { toScreen, toWorld } from "./viewMath";

export interface Frame {
  view: View;
  width: number;
  height: number;
  colors: CanvasColors;
}

type Ctx = CanvasRenderingContext2D;

const inView = (f: Frame, p: Point, margin = 40) =>
  p.x >= -margin && p.y >= -margin && p.x <= f.width + margin && p.y <= f.height + margin;

function label(c: Ctx, f: Frame, text: string, x: number, y: number, font = "11px sans-serif") {
  c.font = font;
  c.lineJoin = "round";
  c.lineWidth = 3;
  c.strokeStyle = f.colors.paper;
  c.strokeText(text, x, y);
  c.fillStyle = f.colors.ink;
  c.fillText(text, x, y);
}

export function drawGrid(c: Ctx, f: Frame, gridSize: number) {
  const { view, width, height } = f;
  let step = gridSize > 0 ? gridSize : 1;
  // 格線太密就放大間距: 1 -> 5 -> 10 -> 50 ...
  for (let i = 0; step * view.scale < 10 && i < 20; i += 1) step *= i % 2 === 0 ? 5 : 2;
  const tl = toWorld(view, 0, 0);
  const br = toWorld(view, width, height);
  const lines = (major: boolean) => {
    c.beginPath();
    for (let k = Math.ceil(tl.x / step); k * step <= br.x; k += 1) {
      if ((k % 5 === 0) !== major) continue;
      const sx = Math.round(view.x + k * step * view.scale) + 0.5;
      c.moveTo(sx, 0);
      c.lineTo(sx, height);
    }
    for (let k = Math.ceil(br.y / step); k * step <= tl.y; k += 1) {
      if ((k % 5 === 0) !== major) continue;
      const sy = Math.round(view.y - k * step * view.scale) + 0.5;
      c.moveTo(0, sy);
      c.lineTo(width, sy);
    }
    c.stroke();
  };
  c.lineWidth = 1;
  c.strokeStyle = f.colors.muted;
  c.globalAlpha = 0.16;
  lines(false);
  c.globalAlpha = 0.32;
  lines(true);
  // 原點的兩條軸線
  c.globalAlpha = 0.5;
  c.strokeStyle = f.colors.accent;
  const o = toScreen(view, { x: 0, y: 0 });
  c.beginPath();
  c.moveTo(Math.round(o.x) + 0.5, 0);
  c.lineTo(Math.round(o.x) + 0.5, height);
  c.moveTo(0, Math.round(o.y) + 0.5);
  c.lineTo(width, Math.round(o.y) + 0.5);
  c.stroke();
  c.globalAlpha = 1;
}

export function drawBackground(
  c: Ctx,
  f: Frame,
  bg: ImageBackground,
  img: HTMLImageElement,
  offset: Point = { x: 0, y: 0 },
) {
  const { view } = f;
  const topLeft = toScreen(view, {
    x: bg.originX + offset.x,
    y: bg.originY + offset.y + bg.heightPx * bg.metersPerPx,
  });
  const w = bg.widthPx * bg.metersPerPx * view.scale;
  const h = bg.heightPx * bg.metersPerPx * view.scale;
  // 放大到一個像素好幾格時不要糊掉
  c.imageSmoothingEnabled = bg.metersPerPx * view.scale < 3;
  c.globalAlpha = bg.opacity;
  c.drawImage(img, topLeft.x, topLeft.y, w, h);
  c.globalAlpha = 1;
  c.imageSmoothingEnabled = true;
}

export function drawPaths(
  c: Ctx,
  f: Frame,
  doc: SimDoc,
  pos: (id: string) => Point | undefined,
  selected: Set<string>,
) {
  const { view, colors } = f;
  const arrows: { x: number; y: number; angle: number; selected: boolean }[] = [];
  const stroke = (isSelected: boolean, limited: boolean) => {
    c.beginPath();
    for (const p of doc.paths) {
      if (selected.has(p.id) !== isSelected || (p.maxSpeed !== null) !== limited) continue;
      const a0 = pos(p.from);
      const b0 = pos(p.to);
      if (!a0 || !b0) continue;
      const a = toScreen(view, a0);
      const b = toScreen(view, b0);
      if (!inView(f, a, 4000) && !inView(f, b, 4000)) continue;
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      if (p.direction === "one-way" && Math.hypot(b.x - a.x, b.y - a.y) > 24) {
        arrows.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, angle: Math.atan2(b.y - a.y, b.x - a.x), selected: isSelected });
      }
    }
    c.lineWidth = isSelected ? 4 : 2;
    c.strokeStyle = isSelected ? colors.accent : colors.road;
    c.setLineDash(limited ? [7, 4] : []);
    c.stroke();
  };
  c.lineCap = "round";
  stroke(false, false);
  stroke(false, true);
  stroke(true, false);
  stroke(true, true);
  c.setLineDash([]);
  for (const a of arrows) {
    const size = a.selected ? 9 : 7;
    c.beginPath();
    c.moveTo(a.x + Math.cos(a.angle) * size, a.y + Math.sin(a.angle) * size);
    c.lineTo(a.x + Math.cos(a.angle + 2.5) * size, a.y + Math.sin(a.angle + 2.5) * size);
    c.lineTo(a.x + Math.cos(a.angle - 2.5) * size, a.y + Math.sin(a.angle - 2.5) * size);
    c.closePath();
    c.fillStyle = a.selected ? colors.accent : colors.road;
    c.fill();
  }
}

function drawNodeShape(c: Ctx, f: Frame, n: SimNode, s: Point) {
  const { colors } = f;
  if (n.kind === "station") {
    c.fillStyle = STATION_COLORS[n.station?.type ?? "both"];
    c.strokeStyle = colors.paper;
    c.lineWidth = 1.5;
    c.beginPath();
    c.rect(s.x - 5.5, s.y - 5.5, 11, 11);
    c.fill();
    c.stroke();
  } else if (n.kind === "standby") {
    c.fillStyle = colors.paper;
    c.strokeStyle = colors.standby;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(s.x, s.y, 7, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = colors.standby;
    c.font = "bold 9px sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("P", s.x, s.y + 0.5);
    c.textAlign = "start";
    c.textBaseline = "alphabetic";
  } else {
    c.fillStyle = colors.point;
    c.beginPath();
    c.arc(s.x, s.y, 3.5, 0, Math.PI * 2);
    c.fill();
  }
}

export function drawNodes(
  c: Ctx,
  f: Frame,
  doc: SimDoc,
  pos: (id: string) => Point | undefined,
  selected: Set<string>,
  showLabels: boolean,
) {
  const { view, colors } = f;
  const visible: { n: SimNode; s: Point }[] = [];
  for (const n of doc.nodes) {
    const p = pos(n.id);
    if (!p) continue;
    const s = toScreen(view, p);
    if (inView(f, s)) visible.push({ n, s });
  }
  // 一般點位先畫, 站點和待命點蓋在上面
  for (const { n, s } of visible) if (n.kind === "point") drawNodeShape(c, f, n, s);
  for (const { n, s } of visible) if (n.kind !== "point") drawNodeShape(c, f, n, s);
  c.strokeStyle = colors.accent;
  c.lineWidth = 2;
  for (const { n, s } of visible) {
    if (!selected.has(n.id)) continue;
    c.beginPath();
    c.arc(s.x, s.y, 10, 0, Math.PI * 2);
    c.stroke();
  }
  if (!showLabels) return;
  // 站點、待命點的名稱先標, 一般點位放大一點才標; 會跟已經標的名稱疊在一起就不標
  const placed = new LabelGrid();
  c.font = "11px sans-serif";
  const candidates = [
    ...visible.filter((v) => v.n.kind !== "point" && view.scale >= 2),
    ...visible.filter((v) => v.n.kind === "point" && view.scale >= 12),
  ];
  for (const { n, s } of candidates) {
    const x = s.x + 9;
    const y = s.y - 8;
    const w = c.measureText(n.name).width;
    if (!placed.tryPlace(x - 2, y - 11, w + 4, 14)) continue;
    label(c, f, n.name, x, y);
  }
}

/** 已經標上去的名稱佔的位置 (粗格子雜湊), 用來避免名稱疊在一起 */
class LabelGrid {
  private cells = new Map<string, { x: number; y: number; w: number; h: number }[]>();
  private static SIZE = 64;

  tryPlace(x: number, y: number, w: number, h: number) {
    const keys: string[] = [];
    for (let gx = Math.floor(x / LabelGrid.SIZE); gx <= Math.floor((x + w) / LabelGrid.SIZE); gx += 1) {
      for (let gy = Math.floor(y / LabelGrid.SIZE); gy <= Math.floor((y + h) / LabelGrid.SIZE); gy += 1) {
        const key = `${gx},${gy}`;
        for (const r of this.cells.get(key) ?? []) {
          if (x < r.x + r.w && r.x < x + w && y < r.y + r.h && r.y < y + h) return false;
        }
        keys.push(key);
      }
    }
    const rect = { x, y, w, h };
    for (const key of keys) {
      const list = this.cells.get(key);
      if (list) list.push(rect);
      else this.cells.set(key, [rect]);
    }
    return true;
  }
}

export interface Overlay {
  box: { a: Point; b: Point } | null;
  draftLine: { from: Point; to: Point } | null;
  target: Target | null;
  hoverNode: Point | null;
  hoverPath: { a: Point; b: Point } | null;
  measure: { a: Point; b: Point } | null;
  calibration: { a: Point; b: Point | null } | null;
}

function marker(c: Ctx, f: Frame, t: Target) {
  const s = toScreen(f.view, t.point);
  c.strokeStyle = f.colors.accent;
  c.lineWidth = 2;
  c.beginPath();
  if (t.kind === "free" && t.cadSnap !== undefined) {
    // 吸到 CAD 圖: 端點方框、交點叉叉、圓心圓圈
    c.strokeStyle = f.colors.snap;
    if (t.cadSnap === SNAP_CROSS) {
      c.moveTo(s.x - 6, s.y - 6);
      c.lineTo(s.x + 6, s.y + 6);
      c.moveTo(s.x + 6, s.y - 6);
      c.lineTo(s.x - 6, s.y + 6);
    } else if (t.cadSnap === SNAP_CENTER) {
      c.arc(s.x, s.y, 6, 0, Math.PI * 2);
      c.moveTo(s.x + 1.5, s.y);
      c.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
    } else {
      c.rect(s.x - 5.5, s.y - 5.5, 11, 11);
    }
  } else if (t.kind === "node") {
    c.arc(s.x, s.y, 11, 0, Math.PI * 2);
  } else if (t.kind === "path") {
    c.moveTo(s.x, s.y - 7);
    c.lineTo(s.x + 7, s.y);
    c.lineTo(s.x, s.y + 7);
    c.lineTo(s.x - 7, s.y);
    c.closePath();
  } else {
    c.moveTo(s.x - 7, s.y);
    c.lineTo(s.x + 7, s.y);
    c.moveTo(s.x, s.y - 7);
    c.lineTo(s.x, s.y + 7);
  }
  c.stroke();
}

function dimension(c: Ctx, f: Frame, a0: Point, b0: Point, color: string) {
  const a = toScreen(f.view, a0);
  const b = toScreen(f.view, b0);
  c.strokeStyle = color;
  c.fillStyle = color;
  c.lineWidth = 2;
  c.setLineDash([6, 4]);
  c.beginPath();
  c.moveTo(a.x, a.y);
  c.lineTo(b.x, b.y);
  c.stroke();
  c.setLineDash([]);
  for (const p of [a, b]) {
    c.beginPath();
    c.arc(p.x, p.y, 4, 0, Math.PI * 2);
    c.fill();
  }
  const d = Math.hypot(b0.x - a0.x, b0.y - a0.y);
  label(c, f, formatLength(d), (a.x + b.x) / 2 + 8, (a.y + b.y) / 2 - 8, "bold 12px sans-serif");
}

export function drawOverlay(c: Ctx, f: Frame, o: Overlay) {
  const { view, colors } = f;
  if (o.hoverPath) {
    const a = toScreen(view, o.hoverPath.a);
    const b = toScreen(view, o.hoverPath.b);
    c.strokeStyle = colors.accent;
    c.globalAlpha = 0.35;
    c.lineWidth = 8;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.stroke();
    c.globalAlpha = 1;
  }
  if (o.hoverNode) {
    const s = toScreen(view, o.hoverNode);
    c.strokeStyle = colors.accent;
    c.globalAlpha = 0.5;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(s.x, s.y, 10, 0, Math.PI * 2);
    c.stroke();
    c.globalAlpha = 1;
  }
  if (o.draftLine) {
    const a = toScreen(view, o.draftLine.from);
    const b = toScreen(view, o.draftLine.to);
    c.strokeStyle = colors.accent;
    c.lineWidth = 2;
    c.setLineDash([8, 5]);
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.stroke();
    c.setLineDash([]);
    const d = Math.hypot(o.draftLine.to.x - o.draftLine.from.x, o.draftLine.to.y - o.draftLine.from.y);
    if (d > 0) label(c, f, formatLength(d), (a.x + b.x) / 2 + 8, (a.y + b.y) / 2 - 8);
  }
  if (o.target) marker(c, f, o.target);
  if (o.measure) dimension(c, f, o.measure.a, o.measure.b, colors.accent);
  if (o.calibration) {
    const { a, b } = o.calibration;
    if (b) dimension(c, f, a, b, colors.danger);
    else {
      const s = toScreen(view, a);
      c.fillStyle = colors.danger;
      c.beginPath();
      c.arc(s.x, s.y, 4, 0, Math.PI * 2);
      c.fill();
    }
  }
  if (o.box) {
    const a = toScreen(view, o.box.a);
    const b = toScreen(view, o.box.b);
    c.strokeStyle = colors.accent;
    c.fillStyle = colors.accent;
    c.lineWidth = 1;
    c.setLineDash([5, 3]);
    c.globalAlpha = 0.08;
    c.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    c.globalAlpha = 1;
    c.strokeRect(Math.min(a.x, b.x) + 0.5, Math.min(a.y, b.y) + 0.5, Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    c.setLineDash([]);
  }
}
