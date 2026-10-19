/**
 * DXF 圖元 -> 一條一條的折線 (弧、圓、橢圓、雲形線都切成小段), 圖塊照插入的位置、旋轉、
 * 縮放展開. 另外收集可以吸附的點: 線的端點和頂點、弧和圓的圓心、圖塊的插入點、直線之間的交點.
 */
import type { DxfBlock, DxfData, DxfEntity } from "./reader";
import {
  CadBounds,
  CadGeometry,
  CadLayerInfo,
  CadSnapIndex,
  CadText,
  SNAP_CENTER,
  SNAP_CROSS,
  SNAP_END,
} from "./types";

export interface FlattenOptions {
  /** 圖面原點; 不給就用主要範圍的左下角 */
  base?: { x: number; y: number } | null;
  /** 頂點最多幾個, 超過的不讀 (避免把瀏覽器的記憶體吃光) */
  maxVertices?: number;
  /** 算交點時最多幾條直線段, 超過就不算交點 */
  maxIntersectionSegments?: number;
  encoding?: string;
}

const DEFAULT_MAX_VERTICES = 4_000_000;
const DEFAULT_MAX_SEGMENTS = 400_000;
/** 弧切成小段: 每段最多幾度 */
const ARC_STEP = Math.PI / 24;
/** 圖塊最多套幾層 */
const MAX_DEPTH = 12;

/** 2D 仿射轉換 [a, b, c, d, e, f]: x' = a x + c y + e, y' = b x + d y + f */
type M = [number, number, number, number, number, number];

const IDENTITY: M = [1, 0, 0, 1, 0, 0];
const MIRROR_X: M = [-1, 0, 0, 1, 0, 0];

const mul = (m: M, n: M): M => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const translate = (x: number, y: number): M => [1, 0, 0, 1, x, y];
const rotateDeg = (deg: number): M => {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [c, s, -s, c, 0, 0];
};
const scale = (sx: number, sy: number): M => [sx, 0, 0, sy, 0, 0];

/** 可以長大的 typed array */
class Grow {
  arr: Float64Array;
  len = 0;
  constructor(cap = 1024) {
    this.arr = new Float64Array(cap);
  }
  push(v: number) {
    if (this.len === this.arr.length) {
      const next = new Float64Array(this.arr.length * 2);
      next.set(this.arr);
      this.arr = next;
    }
    this.arr[this.len++] = v;
  }
}

class Flattener {
  readonly layerIndex = new Map<string, number>();
  readonly layers: CadLayerInfo[] = [];
  readonly coords = new Grow(1 << 16);
  readonly polyStart: number[] = [];
  readonly polyLayer: number[] = [];
  /** 直線段 (算交點用): x1, y1, x2, y2 */
  readonly segs = new Grow(1 << 14);
  readonly segLayer: number[] = [];
  readonly snaps = new Grow(1 << 14);
  readonly snapKind: number[] = [];
  readonly snapLayer: number[] = [];
  readonly texts: CadText[] = [];
  readonly xrefs = new Set<string>();
  readonly skipped: Record<string, number>;
  entities = 0;
  inserts = 0;
  truncated = false;
  private open = false;
  private openLayer = 0;
  private stack: string[] = [];

  constructor(
    private readonly data: DxfData,
    private readonly maxVertices: number,
  ) {
    this.skipped = { ...data.skipped };
    for (const l of data.layers.values()) this.layerOf(l.name);
  }

  layerOf(name: string): number {
    let i = this.layerIndex.get(name);
    if (i === undefined) {
      const def = this.data.layers.get(name);
      i = this.layers.length;
      this.layers.push({ name, color: def?.color ?? 7, hiddenInFile: !!def && (def.off || def.frozen), lines: 0, texts: 0 });
      this.layerIndex.set(name, i);
    }
    return i;
  }

  private bump(type: string) {
    this.skipped[type] = (this.skipped[type] ?? 0) + 1;
  }

  // ---- 低階: 一條折線、直線段、吸附點

  private begin(layer: number) {
    this.open = true;
    this.openLayer = layer;
    this.polyStart.push(this.coords.len / 2);
    this.polyLayer.push(layer);
  }

  private vertex(m: M, x: number, y: number) {
    this.coords.push(m[0] * x + m[2] * y + m[4]);
    this.coords.push(m[1] * x + m[3] * y + m[5]);
  }

  private end() {
    if (!this.open) return;
    this.open = false;
    const start = this.polyStart[this.polyStart.length - 1];
    const count = this.coords.len / 2 - start;
    if (count < 2) {
      // 只有一個點畫不出來
      this.coords.len = start * 2;
      this.polyStart.pop();
      this.polyLayer.pop();
      return;
    }
    this.layers[this.openLayer].lines++;
    if (this.coords.len / 2 > this.maxVertices) this.truncated = true;
  }

  private segment(m: M, layer: number, x1: number, y1: number, x2: number, y2: number) {
    this.segs.push(m[0] * x1 + m[2] * y1 + m[4]);
    this.segs.push(m[1] * x1 + m[3] * y1 + m[5]);
    this.segs.push(m[0] * x2 + m[2] * y2 + m[4]);
    this.segs.push(m[1] * x2 + m[3] * y2 + m[5]);
    this.segLayer.push(layer);
  }

  private snap(m: M, layer: number, x: number, y: number, kind: number) {
    this.snaps.push(m[0] * x + m[2] * y + m[4]);
    this.snaps.push(m[1] * x + m[3] * y + m[5]);
    this.snapKind.push(kind);
    this.snapLayer.push(layer);
  }

  /** 從 (x1, y1) 到 (x2, y2) 的弧 (bulge), 不含起點 */
  private bulgeArc(m: M, x1: number, y1: number, x2: number, y2: number, b: number) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const chord = Math.hypot(dx, dy);
    if (chord < 1e-12) return;
    const theta = 4 * Math.atan(b);
    const h = chord / 2 / Math.tan(theta / 2);
    const cx = (x1 + x2) / 2 - (dy / chord) * h;
    const cy = (y1 + y2) / 2 + (dx / chord) * h;
    const r = Math.hypot(x1 - cx, y1 - cy);
    const a1 = Math.atan2(y1 - cy, x1 - cx);
    const n = Math.max(1, Math.ceil(Math.abs(theta) / ARC_STEP));
    for (let k = 1; k < n; k++) {
      const a = a1 + (theta * k) / n;
      this.vertex(m, cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    this.vertex(m, x2, y2);
  }

  /** x, y, bulge 一組三個的折線 */
  private poly(m: M, layer: number, pts: number[], closed: boolean, opts: { snaps: boolean; segments: boolean }) {
    const n = pts.length / 3;
    if (n < 2) return;
    this.begin(layer);
    this.vertex(m, pts[0], pts[1]);
    const edges = closed ? n : n - 1;
    for (let i = 0; i < edges; i++) {
      const j = (i + 1) % n;
      const x1 = pts[i * 3];
      const y1 = pts[i * 3 + 1];
      const b = pts[i * 3 + 2];
      const x2 = pts[j * 3];
      const y2 = pts[j * 3 + 1];
      if (Math.abs(b) > 1e-9) this.bulgeArc(m, x1, y1, x2, y2, b);
      else {
        this.vertex(m, x2, y2);
        if (opts.segments) this.segment(m, layer, x1, y1, x2, y2);
      }
    }
    this.end();
    if (opts.snaps) for (let i = 0; i < n; i++) this.snap(m, layer, pts[i * 3], pts[i * 3 + 1], SNAP_END);
  }

  private arc(m: M, layer: number, cx: number, cy: number, r: number, a0: number, sweep: number) {
    if (!(r > 0)) return;
    const n = Math.max(2, Math.ceil(Math.abs(sweep) / ARC_STEP));
    this.begin(layer);
    for (let k = 0; k <= n; k++) {
      const a = a0 + (sweep * k) / n;
      this.vertex(m, cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    this.end();
  }

  // ---- 圖元

  entity(e: DxfEntity, m0: M, parentLayer: string | null, depth: number) {
    if (this.truncated) return;
    this.entities++;
    const layerName = e.layer === "0" && parentLayer !== null ? parentLayer : e.layer;
    const layer = this.layerOf(layerName);
    const m = e.flip ? mul(m0, MIRROR_X) : m0;
    switch (e.type) {
      case "LINE":
        this.begin(layer);
        this.vertex(m, e.x1, e.y1);
        this.vertex(m, e.x2, e.y2);
        this.end();
        this.segment(m, layer, e.x1, e.y1, e.x2, e.y2);
        this.snap(m, layer, e.x1, e.y1, SNAP_END);
        this.snap(m, layer, e.x2, e.y2, SNAP_END);
        return;
      case "POLY":
        this.poly(m, layer, e.pts, e.closed, { snaps: true, segments: true });
        return;
      case "ARC": {
        const a0 = (e.a0 * Math.PI) / 180;
        let sweep = (((e.a1 - e.a0) % 360) + 360) % 360;
        if (sweep < 1e-9) sweep = 360;
        const sw = (sweep * Math.PI) / 180;
        this.arc(m, layer, e.cx, e.cy, e.r, a0, sw);
        this.snap(m, layer, e.cx + e.r * Math.cos(a0), e.cy + e.r * Math.sin(a0), SNAP_END);
        this.snap(m, layer, e.cx + e.r * Math.cos(a0 + sw), e.cy + e.r * Math.sin(a0 + sw), SNAP_END);
        this.snap(m, layer, e.cx, e.cy, SNAP_CENTER);
        return;
      }
      case "CIRCLE":
        this.arc(m, layer, e.cx, e.cy, e.r, 0, Math.PI * 2);
        this.snap(m, layer, e.cx, e.cy, SNAP_CENTER);
        return;
      case "ELLIPSE": {
        let t1 = e.t1;
        while (t1 <= e.t0 + 1e-9) t1 += Math.PI * 2;
        // 短軸 = 長軸轉 90 度 x 比例 (擠出方向反過來時轉 -90 度)
        const sx = e.flip ? e.my : -e.my;
        const sy = e.flip ? -e.mx : e.mx;
        const n = Math.max(2, Math.ceil((t1 - e.t0) / ARC_STEP));
        this.begin(layer);
        for (let k = 0; k <= n; k++) {
          const t = e.t0 + ((t1 - e.t0) * k) / n;
          const c = Math.cos(t);
          const s = Math.sin(t) * e.ratio;
          this.vertex(m0, e.cx + c * e.mx + s * sx, e.cy + c * e.my + s * sy);
        }
        this.end();
        this.snap(m0, layer, e.cx, e.cy, SNAP_CENTER);
        return;
      }
      case "SPLINE": {
        const pts = splinePoints(e);
        if (pts.length < 4) return;
        this.begin(layer);
        for (let i = 0; i < pts.length; i += 2) this.vertex(m, pts[i], pts[i + 1]);
        this.end();
        this.snap(m, layer, pts[0], pts[1], SNAP_END);
        this.snap(m, layer, pts[pts.length - 2], pts[pts.length - 1], SNAP_END);
        return;
      }
      case "TEXT": {
        const r = (e.rot * Math.PI) / 180;
        // 文字的方向和「上」照轉換算, 字高跟著縮放
        const dx = m[0] * Math.cos(r) + m[2] * Math.sin(r);
        const dy = m[1] * Math.cos(r) + m[3] * Math.sin(r);
        const ux = -m[0] * Math.sin(r) + m[2] * Math.cos(r);
        const uy = -m[1] * Math.sin(r) + m[3] * Math.cos(r);
        const h = e.h * Math.hypot(ux, uy);
        if (!(h > 0)) return;
        this.texts.push({
          layer,
          x: m[0] * e.x + m[2] * e.y + m[4],
          y: m[1] * e.x + m[3] * e.y + m[5],
          h,
          rot: Math.atan2(dy, dx),
          text: e.text,
          ha: e.ha,
          va: e.va,
        });
        this.layers[layer].texts++;
        return;
      }
      case "INSERT": {
        const block = this.data.blocks.get(e.name);
        this.inserts++;
        this.snap(m, layer, e.x, e.y, SNAP_CENTER);
        if (!block) {
          this.bump("INSERT (missing block)");
          return;
        }
        if (block.xref) {
          this.xrefs.add(block.name);
          return;
        }
        const cells = e.cols * e.rows;
        if (cells > 10000) {
          this.bump("INSERT (array too large)");
          return;
        }
        const place = mul(translate(e.x, e.y), rotateDeg(e.rot));
        const inner = mul(scale(e.sx, e.sy), translate(-block.x, -block.y));
        for (let c = 0; c < e.cols; c++) {
          for (let r = 0; r < e.rows; r++) {
            const cell = mul(place, mul(translate(c * e.dc, r * e.dr), inner));
            this.block(block, mul(m, cell), layerName, depth);
          }
        }
        return;
      }
      case "DIMENSION": {
        const block = this.data.blocks.get(e.block);
        if (block) this.block(block, m0, layerName, depth);
        return;
      }
      case "SOLID": {
        const pts: number[] = [];
        for (let i = 0; i < e.pts.length; i += 2) {
          const x = e.pts[i];
          const y = e.pts[i + 1];
          // 三角形的第四個角跟第三個一樣
          if (pts.length && Math.abs(pts[pts.length - 3] - x) < 1e-12 && Math.abs(pts[pts.length - 2] - y) < 1e-12) continue;
          pts.push(x, y, 0);
        }
        this.poly(m, layer, pts, true, { snaps: true, segments: false });
        return;
      }
      case "HATCH":
        for (const loop of e.loops) this.poly(m, layer, loop, true, { snaps: false, segments: false });
        return;
    }
  }

  block(block: DxfBlock, m: M, parentLayer: string, depth: number) {
    if (depth >= MAX_DEPTH || this.stack.includes(block.name)) {
      this.bump("INSERT (recursive)");
      return;
    }
    this.stack.push(block.name);
    for (const e of block.entities) {
      if (this.truncated) break;
      this.entity(e, m, parentLayer, depth + 1);
    }
    this.stack.pop();
  }
}

// ================================================================ 雲形線

function splinePoints(e: Extract<DxfEntity, { type: "SPLINE" }>): number[] {
  const p = e.degree;
  const nCtrl = e.ctrl.length / 2;
  const knots = e.knots;
  if (nCtrl >= p + 1 && knots.length === nCtrl + p + 1) {
    const w = e.weights.length === nCtrl ? e.weights : null;
    const t0 = knots[p];
    const t1 = knots[nCtrl];
    if (t1 > t0) {
      const samples = Math.min(512, Math.max(16, nCtrl * 8));
      const out: number[] = [];
      for (let s = 0; s <= samples; s++) {
        const t = s === samples ? t1 : t0 + ((t1 - t0) * s) / samples;
        const pt = deBoor(t, p, knots, e.ctrl, w, nCtrl);
        if (pt) out.push(pt[0], pt[1]);
      }
      if (out.length >= 4) return out;
    }
  }
  // 沒有節點或對不起來: 用擬合點, 再不然用控制點連線
  return e.fit.length >= 4 ? e.fit : e.ctrl;
}

function deBoor(t: number, p: number, knots: number[], ctrl: number[], w: number[] | null, n: number): [number, number] | null {
  // 找 knots[k] <= t < knots[k+1], k 在 [p, n-1]
  let k = p;
  while (k < n - 1 && t >= knots[k + 1]) k++;
  const dx: number[] = [];
  const dy: number[] = [];
  const dw: number[] = [];
  for (let j = 0; j <= p; j++) {
    const i = j + k - p;
    const wi = w ? w[i] : 1;
    dx.push(ctrl[i * 2] * wi);
    dy.push(ctrl[i * 2 + 1] * wi);
    dw.push(wi);
  }
  for (let r = 1; r <= p; r++) {
    for (let j = p; j >= r; j--) {
      const lo = knots[j + k - p];
      const hi = knots[j + 1 + k - r];
      const a = hi - lo > 1e-12 ? (t - lo) / (hi - lo) : 0;
      dx[j] = (1 - a) * dx[j - 1] + a * dx[j];
      dy[j] = (1 - a) * dy[j - 1] + a * dy[j];
      dw[j] = (1 - a) * dw[j - 1] + a * dw[j];
    }
  }
  if (Math.abs(dw[p]) < 1e-12) return null;
  return [dx[p] / dw[p], dy[p] / dw[p]];
}

// ================================================================ 範圍

function quantile(sorted: Float64Array, q: number) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))));
  return sorted[i];
}

/** 主要範圍: 去掉最外面 0.2% 的頂點 (零星畫在很遠的線), 四周多留 3% */
function mainBoundsOf(coords: Float64Array, count: number): { main: CadBounds; full: CadBounds } {
  const full = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (let i = 0; i < count; i++) {
    const x = coords[i * 2];
    const y = coords[i * 2 + 1];
    if (x < full.minX) full.minX = x;
    if (x > full.maxX) full.maxX = x;
    if (y < full.minY) full.minY = y;
    if (y > full.maxY) full.maxY = y;
  }
  if (!count) {
    const z = { minX: 0, minY: 0, maxX: 1, maxY: 1 };
    return { main: z, full: z };
  }
  const stride = Math.max(1, Math.floor(count / 200_000));
  const n = Math.floor((count - 1) / stride) + 1;
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    xs[k] = coords[k * stride * 2];
    ys[k] = coords[k * stride * 2 + 1];
  }
  xs.sort();
  ys.sort();
  let main = { minX: quantile(xs, 0.002), minY: quantile(ys, 0.002), maxX: quantile(xs, 0.998), maxY: quantile(ys, 0.998) };
  const padX = Math.max((main.maxX - main.minX) * 0.03, 1e-6);
  const padY = Math.max((main.maxY - main.minY) * 0.03, 1e-6);
  main = {
    minX: Math.max(full.minX, main.minX - padX),
    minY: Math.max(full.minY, main.minY - padY),
    maxX: Math.min(full.maxX, main.maxX + padX),
    maxY: Math.min(full.maxY, main.maxY + padY),
  };
  if (main.maxX - main.minX < 1e-9) main = { ...main, minX: main.minX - 0.5, maxX: main.maxX + 0.5 };
  if (main.maxY - main.minY < 1e-9) main = { ...main, minY: main.minY - 0.5, maxY: main.maxY + 0.5 };
  return { main, full };
}

// ================================================================ 交點

/**
 * 直線段之間的交點 (不含線段的兩端, 端點本來就吸附得到). 用格子分區, 同一格的線段兩兩比.
 * 只算主要範圍裡的.
 */
function intersections(
  segs: Float64Array,
  segLayer: number[],
  count: number,
  b: CadBounds,
  maxSegments: number,
): { pts: number[]; layers: number[]; truncated: boolean } {
  const pts: number[] = [];
  const layers: number[] = [];
  if (count < 2) return { pts, layers, truncated: false };
  if (count > maxSegments) return { pts, layers, truncated: true };
  const W = b.maxX - b.minX;
  const H = b.maxY - b.minY;
  let cell = Math.sqrt((W * H) / Math.max(1, count / 3)) || Math.max(W, H) || 1;
  // 格子總數不要超過四百萬
  while (Math.ceil(W / cell) * Math.ceil(H / cell) > 4_000_000) cell *= 1.5;
  const cols = Math.max(1, Math.ceil(W / cell));
  const rows = Math.max(1, Math.ceil(H / cell));
  const cellOf = (x: number, y: number) => {
    const cx = Math.min(cols - 1, Math.max(0, Math.floor((x - b.minX) / cell)));
    const cy = Math.min(rows - 1, Math.max(0, Math.floor((y - b.minY) / cell)));
    return cy * cols + cx;
  };
  // 每條線段經過哪些格子 (沿線每半格取一點)
  const lists = new Map<number, number[]>();
  for (let s = 0; s < count; s++) {
    const x1 = segs[s * 4];
    const y1 = segs[s * 4 + 1];
    const x2 = segs[s * 4 + 2];
    const y2 = segs[s * 4 + 3];
    if (Math.max(x1, x2) < b.minX || Math.min(x1, x2) > b.maxX || Math.max(y1, y2) < b.minY || Math.min(y1, y2) > b.maxY) continue;
    const len = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.min(100_000, Math.ceil(len / (cell * 0.5)));
    let last = -1;
    for (let k = 0; k <= steps; k++) {
      const f = steps ? k / steps : 0;
      const c = cellOf(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f);
      if (c === last) continue;
      last = c;
      const list = lists.get(c);
      if (list) {
        if (list[list.length - 1] !== s) list.push(s);
      } else lists.set(c, [s]);
    }
  }
  const eps = 1e-9 * Math.max(W, H, 1);
  let tests = 0;
  const MAX_TESTS = 40_000_000;
  const MAX_POINTS = 300_000;
  for (const [c, list] of lists) {
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      const ax = segs[a * 4];
      const ay = segs[a * 4 + 1];
      const rx = segs[a * 4 + 2] - ax;
      const ry = segs[a * 4 + 3] - ay;
      const lenA = Math.hypot(rx, ry);
      if (lenA < eps) continue;
      for (let j = i + 1; j < list.length; j++) {
        if (++tests > MAX_TESTS || pts.length / 2 >= MAX_POINTS) return { pts, layers, truncated: true };
        const s2 = list[j];
        const cx = segs[s2 * 4];
        const cy = segs[s2 * 4 + 1];
        const sx = segs[s2 * 4 + 2] - cx;
        const sy = segs[s2 * 4 + 3] - cy;
        const denom = rx * sy - ry * sx;
        if (Math.abs(denom) < 1e-12 * lenA * Math.hypot(sx, sy)) continue;
        const qx = cx - ax;
        const qy = cy - ay;
        const t = (qx * sy - qy * sx) / denom;
        const u = (qx * ry - qy * rx) / denom;
        const tEps = eps / lenA;
        const uEps = eps / Math.max(Math.hypot(sx, sy), eps);
        if (t <= tEps || t >= 1 - tEps || u <= uEps || u >= 1 - uEps) continue;
        const x = ax + t * rx;
        const y = ay + t * ry;
        // 同一對線段可能在好幾格都碰到: 只算交點所在的那一格
        if (cellOf(x, y) !== c) continue;
        pts.push(x, y);
        layers.push(segLayer[a], segLayer[s2]);
      }
    }
  }
  return { pts, layers, truncated: false };
}

// ================================================================ 吸附點的格子索引

function buildSnapIndex(
  pts: Float32Array,
  kind: Uint8Array,
  layerA: Uint16Array,
  layerB: Uint16Array,
  b: CadBounds,
): CadSnapIndex {
  const n = pts.length / 2;
  const W = Math.max(b.maxX - b.minX, 1e-6);
  const H = Math.max(b.maxY - b.minY, 1e-6);
  let cell = Math.max(W, H) / 256;
  while (Math.ceil(W / cell) * Math.ceil(H / cell) > 1_000_000) cell *= 1.5;
  const cols = Math.max(1, Math.ceil(W / cell));
  const rows = Math.max(1, Math.ceil(H / cell));
  const cellOf = (i: number) => {
    const cx = Math.min(cols - 1, Math.max(0, Math.floor((pts[i * 2] - b.minX) / cell)));
    const cy = Math.min(rows - 1, Math.max(0, Math.floor((pts[i * 2 + 1] - b.minY) / cell)));
    return cy * cols + cx;
  };
  const start = new Uint32Array(cols * rows + 1);
  for (let i = 0; i < n; i++) start[cellOf(i) + 1]++;
  for (let k = 0; k < cols * rows; k++) start[k + 1] += start[k];
  const fill = start.slice(0, cols * rows);
  const idx = new Uint32Array(n);
  for (let i = 0; i < n; i++) idx[fill[cellOf(i)]++] = i;
  return { pts, kind, layerA, layerB, cell, minX: b.minX, minY: b.minY, cols, rows, start, idx };
}

// ================================================================ 主流程

export function flattenDxf(data: DxfData, opts: FlattenOptions = {}): CadGeometry {
  const f = new Flattener(data, opts.maxVertices ?? DEFAULT_MAX_VERTICES);
  for (const e of data.entities) {
    if (f.truncated) break;
    f.entity(e, IDENTITY, null, 0);
  }

  const vCount = f.coords.len / 2;
  const coords64 = f.coords.arr;
  const { main, full } = mainBoundsOf(coords64, vCount);
  const base = opts.base ?? { x: main.minX, y: main.minY };
  const shift = (bb: CadBounds): CadBounds => ({ minX: bb.minX - base.x, minY: bb.minY - base.y, maxX: bb.maxX - base.x, maxY: bb.maxY - base.y });

  // 頂點換成以 base 為原點的 Float32
  const coords = new Float32Array(vCount * 2);
  let outliers = 0;
  for (let i = 0; i < vCount; i++) {
    const x = coords64[i * 2];
    const y = coords64[i * 2 + 1];
    coords[i * 2] = x - base.x;
    coords[i * 2 + 1] = y - base.y;
    if (x < main.minX || x > main.maxX || y < main.minY || y > main.maxY) outliers++;
  }
  const P = f.polyStart.length;
  const polyStart = new Uint32Array(P + 1);
  polyStart.set(f.polyStart);
  polyStart[P] = vCount;
  const polyLayer = Uint16Array.from(f.polyLayer);
  const polyBox = new Float32Array(P * 4);
  for (let p = 0; p < P; p++) {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let i = polyStart[p]; i < polyStart[p + 1]; i++) {
      const x = coords[i * 2];
      const y = coords[i * 2 + 1];
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    polyBox.set([x0, y0, x1, y1], p * 4);
  }

  // 吸附點: 端點、圓心、插入點 (重複的只留一個), 再加交點
  const cross = intersections(f.segs.arr, f.segLayer, f.segLayer.length, main, opts.maxIntersectionSegments ?? DEFAULT_MAX_SEGMENTS);
  const tol = Math.max(main.maxX - main.minX, main.maxY - main.minY, 1e-6) * 1e-7;
  const seen = new Set<string>();
  const sp: number[] = [];
  const sk: number[] = [];
  const la: number[] = [];
  const lb: number[] = [];
  const add = (x: number, y: number, kind: number, a: number, b2: number) => {
    const key = `${Math.round(x / tol)},${Math.round(y / tol)},${kind}`;
    if (seen.has(key)) return;
    seen.add(key);
    sp.push(x - base.x, y - base.y);
    sk.push(kind);
    la.push(a);
    lb.push(b2);
  };
  const sn = f.snaps.arr;
  for (let i = 0; i < f.snapKind.length; i++) add(sn[i * 2], sn[i * 2 + 1], f.snapKind[i], f.snapLayer[i], f.snapLayer[i]);
  for (let i = 0; i < cross.pts.length / 2; i++) add(cross.pts[i * 2], cross.pts[i * 2 + 1], SNAP_CROSS, cross.layers[i * 2], cross.layers[i * 2 + 1]);
  const snap = buildSnapIndex(Float32Array.from(sp), Uint8Array.from(sk), Uint16Array.from(la), Uint16Array.from(lb), shift(main));

  const texts = f.texts.map((t) => ({ ...t, x: t.x - base.x, y: t.y - base.y }));

  return {
    base,
    bounds: shift(full),
    mainBounds: shift(main),
    layers: f.layers,
    coords,
    polyStart,
    polyLayer,
    polyBox,
    texts,
    snap,
    header: { ...data.header, encoding: opts.encoding ?? "" },
    stats: {
      entities: f.entities,
      polylines: P,
      vertices: vCount,
      texts: texts.length,
      inserts: f.inserts,
      skipped: f.skipped,
      xrefs: [...f.xrefs],
      truncated: f.truncated,
      intersections: cross.pts.length / 2,
      intersectionsTruncated: cross.truncated,
      outliers,
    },
  };
}
