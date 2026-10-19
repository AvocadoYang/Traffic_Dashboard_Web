/**
 * 回放地圖上的東西 (螢幕座標直接畫, 跟編輯器一樣): 車、塞車熱點、死結的位置.
 */
import type { Frame } from "../editor/drawing";
import { toScreen } from "../editor/viewMath";
import type { DeadlockInfo, TimeBucket, Trace } from "../engine/types";
import type { Point, SimDoc } from "../model/types";
import { DEADLOCK_COLOR, bucketOf, heatColor, isLoaded } from "./colors";

type Ctx = CanvasRenderingContext2D;

export interface VehiclePose {
  index: number;
  name: string;
  x: number;
  y: number;
  heading: number;
  state: number;
  length: number;
  width: number;
}

const shortAngle = (from: number, to: number) => {
  let d = (to - from) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
};

/** 某個時間點每台車在哪 (兩筆紀錄之間內插) */
export function posesAt(trace: Trace, t: number): VehiclePose[] {
  const n = trace.vehicles.length;
  if (!trace.count || !n) return [];
  const f = Math.max(0, t / trace.dt);
  let i = Math.floor(f);
  let frac = f - i;
  if (i >= trace.count - 1) {
    i = trace.count - 1;
    frac = 0;
  }
  const out: VehiclePose[] = [];
  for (let k = 0; k < n; k++) {
    const a = (i * n + k) * 3;
    const b = frac > 0 ? ((i + 1) * n + k) * 3 : a;
    const p = trace.pose;
    out.push({
      index: k,
      name: trace.vehicles[k].name,
      x: p[a] + (p[b] - p[a]) * frac,
      y: p[a + 1] + (p[b + 1] - p[a + 1]) * frac,
      heading: p[a + 2] + shortAngle(p[a + 2], p[b + 2]) * frac,
      state: trace.state[i * n + k],
      length: trace.vehicles[k].length,
      width: trace.vehicles[k].width,
    });
  }
  return out;
}

/** 車在畫面上的大小 (太小看不到, 最小 10 x 6 像素) */
export const vehicleSize = (v: VehiclePose, scale: number) => ({
  L: Math.max(10, v.length * scale),
  W: Math.max(6, v.width * scale),
});

function roundRect(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.arcTo(x + w, y, x + w, y + r, r);
  c.lineTo(x + w, y + h - r);
  c.arcTo(x + w, y + h, x + w - r, y + h, r);
  c.lineTo(x + r, y + h);
  c.arcTo(x, y + h, x, y + h - r, r);
  c.lineTo(x, y + r);
  c.arcTo(x, y, x + r, y, r);
  c.closePath();
}

export function drawVehicles(c: Ctx, f: Frame, poses: VehiclePose[], colors: Record<TimeBucket, string>, hover: number | null) {
  const { view } = f;
  for (const v of poses) {
    const s = toScreen(view, v);
    const { L, W } = vehicleSize(v, view.scale);
    c.save();
    c.translate(s.x, s.y);
    // 畫面的 y 是反的, 角度也反過來轉
    c.rotate(-v.heading);
    roundRect(c, -L / 2, -W / 2, L, W, Math.min(3, W / 3));
    c.fillStyle = colors[bucketOf(v.state)];
    c.fill();
    c.lineWidth = hover === v.index ? 3 : 2;
    c.strokeStyle = hover === v.index ? f.colors.ink : f.colors.paper;
    c.stroke();
    // 車頭: 前端一小段深色
    c.fillStyle = "rgba(0,0,0,0.35)";
    c.fillRect(L / 2 - Math.max(2, L * 0.14), -W / 2 + 1, Math.max(2, L * 0.14) - 1, W - 2);
    // 載著貨: 中間一個方塊
    if (isLoaded(v.state)) {
      const p = Math.min(L, W) * 0.55;
      c.fillStyle = f.colors.paper;
      c.fillRect(-p / 2 - L * 0.08, -p / 2, p, p);
      c.lineWidth = 1;
      c.strokeStyle = "rgba(0,0,0,0.45)";
      c.strokeRect(-p / 2 - L * 0.08, -p / 2, p, p);
    }
    c.restore();
  }
  // 名稱 (放大一點才標)
  if (view.scale >= 6) {
    c.font = "11px sans-serif";
    c.lineJoin = "round";
    for (const v of poses) {
      const s = toScreen(view, v);
      const { L } = vehicleSize(v, view.scale);
      const label = v.name;
      c.lineWidth = 3;
      c.strokeStyle = f.colors.paper;
      c.strokeText(label, s.x + L / 2 + 2, s.y - 6);
      c.fillStyle = f.colors.ink;
      c.fillText(label, s.x + L / 2 + 2, s.y - 6);
    }
  }
}

/** 滑鼠下面是哪台車 */
export function vehicleAt(f: Frame, poses: VehiclePose[], sx: number, sy: number): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (const v of poses) {
    const s = toScreen(f.view, v);
    const { L, W } = vehicleSize(v, f.view.scale);
    const d = Math.hypot(sx - s.x, sy - s.y);
    if (d <= Math.max(L, W) / 2 + 6 && d < bestD) {
      bestD = d;
      best = v.index;
    }
  }
  return best;
}

/** 塞車熱點: 路線依等待秒數上色、加粗; 路口畫圓 */
export function drawHeat(
  c: Ctx,
  f: Frame,
  doc: SimDoc,
  pos: (id: string) => Point | undefined,
  heat: { paths: Record<string, number>; nodes: Record<string, number> },
  darkCanvas: boolean,
) {
  const { view } = f;
  const max = Math.max(1, ...Object.values(heat.paths), ...Object.values(heat.nodes));
  const items = doc.paths
    .map((p) => ({ p, sec: heat.paths[p.id] ?? 0 }))
    .filter((x) => x.sec > 0)
    .sort((a, b) => a.sec - b.sec);
  c.lineCap = "round";
  for (const { p, sec } of items) {
    const a0 = pos(p.from);
    const b0 = pos(p.to);
    if (!a0 || !b0) continue;
    const a = toScreen(view, a0);
    const b = toScreen(view, b0);
    const k = sec / max;
    c.strokeStyle = heatColor(k, darkCanvas);
    c.lineWidth = 3 + 6 * Math.sqrt(k);
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.stroke();
  }
  for (const [id, sec] of Object.entries(heat.nodes).sort((a, b) => a[1] - b[1])) {
    const p0 = pos(id);
    if (!p0) continue;
    const s = toScreen(view, p0);
    const k = sec / max;
    c.fillStyle = heatColor(k, darkCanvas);
    c.strokeStyle = f.colors.paper;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(s.x, s.y, 4 + 7 * Math.sqrt(k), 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }
}

/** 被選到的熱點 / 站點: 外面一圈 */
export function drawHighlight(c: Ctx, f: Frame, doc: SimDoc, pos: (id: string) => Point | undefined, ids: string[]) {
  const set = new Set(ids);
  c.strokeStyle = f.colors.accent;
  c.globalAlpha = 0.45;
  c.lineCap = "round";
  c.lineWidth = 16;
  for (const p of doc.paths) {
    if (!set.has(p.id)) continue;
    const a0 = pos(p.from);
    const b0 = pos(p.to);
    if (!a0 || !b0) continue;
    const a = toScreen(f.view, a0);
    const b = toScreen(f.view, b0);
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.stroke();
  }
  for (const id of ids) {
    const p0 = pos(id);
    if (!p0) continue;
    const s = toScreen(f.view, p0);
    c.lineWidth = 4;
    c.beginPath();
    c.arc(s.x, s.y, 16, 0, Math.PI * 2);
    c.stroke();
  }
  c.globalAlpha = 1;
}

export function drawDeadlock(c: Ctx, f: Frame, d: DeadlockInfo) {
  for (const p of d.points) {
    const s = toScreen(f.view, p);
    c.strokeStyle = DEADLOCK_COLOR;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(s.x, s.y, 18, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = DEADLOCK_COLOR;
    c.font = "bold 14px sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("!", s.x, s.y - 26);
    c.textAlign = "start";
    c.textBaseline = "alphabetic";
  }
}
