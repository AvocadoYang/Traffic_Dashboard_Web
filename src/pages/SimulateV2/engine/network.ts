/**
 * 把專案的點位和路線整理成引擎用的路網.
 *
 * - 邊 (edge) 是一條路線; 弧 (arc) 是邊的一個行進方向, 雙向路線有兩個弧.
 * - 佔用單位 (resource), 一次只能有一台車:
 *   - 區 (zone): 路口 (接 3 條以上路線的點)、站點、待命點, 以點位為中心前後各 r 公尺.
 *     r = 最長車長 / 2 + 安全距離 / 2, 車停在點位上剛好佔滿一個區.
 *   - 格 (cell): 路線扣掉兩端的區, 剩下的切成約「車長 + 安全距離」長的小段.
 * - 窄道 (corridor): 一串雙向路線, 中間的點只接這兩條路線; 一次只給一個方向走.
 * - 衝突 (conflict): 位置太近、不能同時有車的兩個佔用單位 (例如兩個靠得很近的點位、
 *   沒有接起來的兩條交叉路線).
 */
import type { SimInput } from "./types";

export interface NetNode {
  id: string;
  name: string;
  x: number;
  y: number;
  /** 0: 一般點位 / 1: 站點 / 2: 待命點 */
  role: 0 | 1 | 2;
  canPick: boolean;
  canDrop: boolean;
  pickSec: number;
  dropSec: number;
  bufferMax: number | null;
  /** 區的 resource id; 沒有區是 -1 */
  zone: number;
  /** 接了幾條路線 */
  degree: number;
}

export interface NetEdge {
  pathId: string;
  a: number;
  b: number;
  len: number;
  twoWay: boolean;
  /** 限速; 沒有限速是 Infinity */
  vmax: number;
  /** 這條路線上的格 (resource id), 從 a 往 b 排 */
  cells: number[];
  /** 每一格從 a 算起的起點、終點 (公尺) */
  cellFrom: number[];
  cellTo: number[];
  /** 屬於哪條窄道; 單向路線是 -1 */
  corridor: number;
  /** a -> b 是不是窄道的正方向 */
  corFwd: boolean;
}

export interface Arc {
  edge: number;
  from: number;
  to: number;
  /** 方向是不是 edge 的 a -> b */
  fwd: boolean;
  /** 行進方向 (弧度, x 軸為 0, 逆時針為正) */
  heading: number;
  ux: number;
  uy: number;
  len: number;
  vmax: number;
}

export interface Resource {
  zone: boolean;
  /** 區所在的點位; 格是 -1 */
  node: number;
  /** 格所在的邊; 區是 -1 */
  edge: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** 屬於哪條窄道 (窄道中間的格和站點); 其他是 -1 */
  corridor: number;
  /** 站點、待命點的區 */
  stop: boolean;
  /** 路口的區 (接 3 條以上路線) */
  junction: boolean;
  /** 跟別條路線交叉、但交叉的地方沒有點位的格: 跟路口一樣, 不能停在上面等 */
  crossing: boolean;
  conflicts: number[];
}

export interface Corridor {
  /** 依序排好的邊 */
  edges: number[];
}

export interface Net {
  /** 區的半徑 = 最長車長 / 2 + 安全距離 / 2 */
  r: number;
  cellLen: number;
  /** 最寬的車寬 */
  width: number;
  nodes: NetNode[];
  nodeIndex: Map<string, number>;
  edges: NetEdge[];
  arcs: Arc[];
  /** 每個點位出去的弧、進來的弧 */
  out: number[][];
  inc: number[][];
  res: Resource[];
  corridors: Corridor[];
  /** 群組 id -> 成員點位 (只有站點) */
  groups: Map<string, number[]>;
  /** 兩條沒有接在一起、但距離比車寬還近的路線 (車會擦撞), 給執行前檢查提醒 */
  closePaths: { a: string; b: string; dist: number }[];
}

const SHORTEST_CELL = 0.05;

/** 點到線段的距離 */
function pointSegDist(px: number, py: number, x0: number, y0: number, x1: number, y1: number) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const L2 = dx * dx + dy * dy;
  let t = L2 > 0 ? ((px - x0) * dx + (py - y0) * dy) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
}

/** 兩條線段有沒有在中間交叉 (端點碰到不算) */
function segmentsCross(a: Resource, b: Resource) {
  const d1x = a.x1 - a.x0;
  const d1y = a.y1 - a.y0;
  const d2x = b.x1 - b.x0;
  const d2y = b.y1 - b.y0;
  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) < 1e-12) return false;
  const t = ((b.x0 - a.x0) * d2y - (b.y0 - a.y0) * d2x) / den;
  const u = ((b.x0 - a.x0) * d1y - (b.y0 - a.y0) * d1x) / den;
  const e = 1e-6;
  return t > e && t < 1 - e && u > e && u < 1 - e;
}

function segSegDist(a: Resource, b: Resource) {
  if (segmentsCross(a, b)) return 0;
  return Math.min(
    pointSegDist(a.x0, a.y0, b.x0, b.y0, b.x1, b.y1),
    pointSegDist(a.x1, a.y1, b.x0, b.y0, b.x1, b.y1),
    pointSegDist(b.x0, b.y0, a.x0, a.y0, a.x1, a.y1),
    pointSegDist(b.x1, b.y1, a.x0, a.y0, a.x1, a.y1),
  );
}

export function buildNet(input: SimInput): Net {
  const used = input.vehicleTypes.filter((t) => t.count > 0);
  const types = used.length ? used : input.vehicleTypes;
  const maxLen = Math.max(0.3, ...types.map((t) => t.length));
  const width = Math.max(0.2, ...types.map((t) => t.width));
  const gap = Math.max(0, input.traffic.safetyGap);
  const r = maxLen / 2 + gap / 2;
  const cellLen = 2 * r;

  // 點位
  const nodes: NetNode[] = [];
  const nodeIndex = new Map<string, number>();
  for (const n of input.nodes) {
    if (nodeIndex.has(n.id)) continue;
    const st = n.kind === "station" ? n.station : undefined;
    nodeIndex.set(n.id, nodes.length);
    nodes.push({
      id: n.id,
      name: n.name,
      x: n.x,
      y: n.y,
      role: n.kind === "station" ? 1 : n.kind === "standby" ? 2 : 0,
      canPick: !!st && st.type !== "drop",
      canDrop: !!st && st.type !== "pick",
      pickSec: st?.pickSec ?? 0,
      dropSec: st?.dropSec ?? 0,
      bufferMax: st?.bufferMax ?? null,
      zone: -1,
      degree: 0,
    });
  }

  // 路線; 同兩點之間第二條、接不到點位的、兩端同一點的都不算
  const edges: NetEdge[] = [];
  const pairSeen = new Set<string>();
  const incident: number[][] = nodes.map(() => []);
  for (const p of input.paths) {
    const a = nodeIndex.get(p.from);
    const b = nodeIndex.get(p.to);
    if (a === undefined || b === undefined || a === b) continue;
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    if (pairSeen.has(key)) continue;
    pairSeen.add(key);
    const len = Math.hypot(nodes[b].x - nodes[a].x, nodes[b].y - nodes[a].y);
    if (len < 1e-6) continue;
    const id = edges.length;
    edges.push({
      pathId: p.id,
      a,
      b,
      len,
      twoWay: p.direction === "two-way",
      vmax: p.maxSpeed !== null && p.maxSpeed > 0 ? p.maxSpeed : Infinity,
      cells: [],
      cellFrom: [],
      cellTo: [],
      corridor: -1,
      corFwd: true,
    });
    incident[a].push(id);
    incident[b].push(id);
  }
  for (let i = 0; i < nodes.length; i++) nodes[i].degree = incident[i].length;

  // 區: 站點、待命點、路口
  const res: Resource[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.role === 0 && n.degree < 3) continue;
    n.zone = res.length;
    res.push({
      zone: true,
      node: i,
      edge: -1,
      x0: n.x,
      y0: n.y,
      x1: n.x,
      y1: n.y,
      corridor: -1,
      stop: n.role !== 0,
      junction: n.degree >= 3,
      crossing: false,
      conflicts: [],
    });
  }

  // 窄道: 從每條還沒歸類的雙向路線往兩頭延伸, 經過只接兩條雙向路線的一般點位.
  // 站點、待命點是窄道的分界 (車會停在那裡、也可能從那裡掉頭)
  const corridors: Corridor[] = [];
  const otherEnd = (e: number, n: number) => (edges[e].a === n ? edges[e].b : edges[e].a);
  const interior = (n: number) =>
    nodes[n].role === 0 && incident[n].length === 2 && incident[n].every((e) => edges[e].twoWay);
  for (let e0 = 0; e0 < edges.length; e0++) {
    if (!edges[e0].twoWay || edges[e0].corridor >= 0) continue;
    const id = corridors.length;
    edges[e0].corridor = id;
    const extend = (start: number) => {
      const list: number[] = [];
      let cur = e0;
      let n = start;
      while (interior(n)) {
        const f = incident[n][0] === cur ? incident[n][1] : incident[n][0];
        if (f === e0 || edges[f].corridor >= 0) break;
        edges[f].corridor = id;
        list.push(f);
        n = otherEnd(f, n);
        cur = f;
      }
      return list;
    };
    const forward = extend(edges[e0].b);
    const backward = extend(edges[e0].a);
    const chain = [...backward.reverse(), e0, ...forward];
    // 方向: 從鏈的第一條路線、不跟第二條共用的那一端開始走
    let n: number;
    if (chain.length === 1) n = edges[e0].a;
    else {
      const f0 = edges[chain[0]];
      const f1 = edges[chain[1]];
      n = f0.a === f1.a || f0.a === f1.b ? f0.b : f0.a;
    }
    for (const e of chain) {
      edges[e].corFwd = edges[e].a === n;
      n = otherEnd(e, n);
    }
    corridors.push({ edges: chain });
  }

  // 格. 每條路線至少一格: 兩端的區疊在一起 (比一個車長還短的路線) 時放一個長度 0 的格在中間,
  // 雙向路線的方向 (窄道) 和路線的分段都靠格來判斷
  for (let e = 0; e < edges.length; e++) {
    const ed = edges[e];
    const ta = nodes[ed.a].zone >= 0 ? r : 0;
    const tb = nodes[ed.b].zone >= 0 ? r : 0;
    const avail = ed.len - ta - tb;
    const short = avail <= SHORTEST_CELL;
    const k = short ? 1 : Math.max(1, Math.round(avail / cellLen));
    const step = short ? 0 : avail / k;
    const start = short ? Math.min(ed.len, Math.max(0, (ta + ed.len - tb) / 2)) : ta;
    const A = nodes[ed.a];
    const B = nodes[ed.b];
    const ux = (B.x - A.x) / ed.len;
    const uy = (B.y - A.y) / ed.len;
    for (let i = 0; i < k; i++) {
      const from = start + i * step;
      const to = from + step;
      ed.cells.push(res.length);
      ed.cellFrom.push(from);
      ed.cellTo.push(to);
      res.push({
        zone: false,
        node: -1,
        edge: e,
        x0: A.x + ux * from,
        y0: A.y + uy * from,
        x1: A.x + ux * to,
        y1: A.y + uy * to,
        corridor: ed.corridor,
        stop: false,
        junction: false,
        crossing: false,
        conflicts: [],
      });
    }
  }

  // 弧
  const arcs: Arc[] = [];
  const out: number[][] = nodes.map(() => []);
  const inc: number[][] = nodes.map(() => []);
  const addArc = (e: number, fwd: boolean) => {
    const ed = edges[e];
    const from = fwd ? ed.a : ed.b;
    const to = fwd ? ed.b : ed.a;
    const ux = (nodes[to].x - nodes[from].x) / ed.len;
    const uy = (nodes[to].y - nodes[from].y) / ed.len;
    const id = arcs.length;
    arcs.push({ edge: e, from, to, fwd, heading: Math.atan2(uy, ux), ux, uy, len: ed.len, vmax: ed.vmax });
    out[from].push(id);
    inc[to].push(id);
  };
  for (let e = 0; e < edges.length; e++) {
    addArc(e, true);
    if (edges[e].twoWay) addArc(e, false);
  }

  // 衝突
  const conflictKeys = new Set<string>();
  const addConflict = (i: number, j: number) => {
    const key = i < j ? `${i},${j}` : `${j},${i}`;
    if (conflictKeys.has(key)) return;
    conflictKeys.add(key);
    res[i].conflicts.push(j);
    res[j].conflicts.push(i);
  };
  // 1. 一條路線兩端都是站點 / 待命點, 而且比兩個半徑還短: 停在一個點上的車會碰到停在另一個點上的車
  for (const ed of edges) {
    const za = nodes[ed.a].zone;
    const zb = nodes[ed.b].zone;
    if (za >= 0 && zb >= 0 && res[za].stop && res[zb].stop && ed.len < 2 * r) addConflict(za, zb);
  }
  const zones = res.filter((x) => x.zone).map((x) => nodes[x.node].zone);
  const cells = res.map((x, i) => i).filter((i) => !res[i].zone);
  const touches = (cellRes: Resource, node: number) => edges[cellRes.edge].a === node || edges[cellRes.edge].b === node;
  const shareNode = (e1: number, e2: number) =>
    edges[e1].a === edges[e2].a || edges[e1].a === edges[e2].b || edges[e1].b === edges[e2].a || edges[e1].b === edges[e2].b;
  // 2. 兩個沒有路線直接相連的點位比車寬還近 (幾乎同一個位置). 有路線相連的照路線上的前後順序算,
  //    不另外加: 不然一排很密的路口 (例如每 1.6 公尺一條儲位道) 會互相卡死
  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      const a = res[zones[i]];
      const b = res[zones[j]];
      if (Math.abs(a.x0 - b.x0) >= width || Math.abs(a.y0 - b.y0) >= width) continue;
      const key = a.node < b.node ? `${a.node},${b.node}` : `${b.node},${a.node}`;
      if (pairSeen.has(key)) continue;
      if (Math.hypot(a.x0 - b.x0, a.y0 - b.y0) < width) addConflict(zones[i], zones[j]);
    }
  }
  // 3. 點位離一條沒接到它的路線比車寬還近: 停在點上的車會擋到路過的車
  for (const zi of zones) {
    const z = res[zi];
    for (const ci of cells) {
      const c = res[ci];
      if (touches(c, z.node)) continue;
      if (Math.min(c.x0, c.x1) - width > z.x0 || Math.max(c.x0, c.x1) + width < z.x0) continue;
      if (Math.min(c.y0, c.y1) - width > z.y0 || Math.max(c.y0, c.y1) + width < z.y0) continue;
      if (pointSegDist(z.x0, z.y0, c.x0, c.y0, c.x1, c.y1) < width) addConflict(zi, ci);
    }
  }
  // 4. 兩條沒接在一起的路線交叉: 交叉點所在的格 (或區) 互斥, 交叉的格當路口看;
  //    平行但比車寬還近的只提醒
  const segOf = (e: number) => {
    const ed = edges[e];
    const A = nodes[ed.a];
    const B = nodes[ed.b];
    return { x0: A.x, y0: A.y, x1: B.x, y1: B.y } as Resource;
  };
  /** 路線 e 上離 a 端 d 公尺的地方, 屬於哪個格或區 */
  const resAt = (e: number, d: number) => {
    const ed = edges[e];
    const za = nodes[ed.a].zone;
    const zb = nodes[ed.b].zone;
    if (za >= 0 && d < r) return za;
    if (zb >= 0 && d > ed.len - r) return zb;
    let best = ed.cells[0];
    let bestD = Infinity;
    ed.cells.forEach((c, i) => {
      const dd = d < ed.cellFrom[i] ? ed.cellFrom[i] - d : d > ed.cellTo[i] ? d - ed.cellTo[i] : 0;
      if (dd < bestD) {
        bestD = dd;
        best = c;
      }
    });
    return best;
  };
  const closePairs = new Map<string, { a: string; b: string; dist: number }>();
  for (let e1 = 0; e1 < edges.length; e1++) {
    const s1 = segOf(e1);
    for (let e2 = e1 + 1; e2 < edges.length; e2++) {
      if (shareNode(e1, e2)) continue;
      const s2 = segOf(e2);
      if (Math.min(s1.x0, s1.x1) - width > Math.max(s2.x0, s2.x1) || Math.min(s2.x0, s2.x1) - width > Math.max(s1.x0, s1.x1)) continue;
      if (Math.min(s1.y0, s1.y1) - width > Math.max(s2.y0, s2.y1) || Math.min(s2.y0, s2.y1) - width > Math.max(s1.y0, s1.y1)) continue;
      if (segmentsCross(s1, s2)) {
        // 交叉點在兩條路線上各是第幾公尺
        const d1x = s1.x1 - s1.x0;
        const d1y = s1.y1 - s1.y0;
        const d2x = s2.x1 - s2.x0;
        const d2y = s2.y1 - s2.y0;
        const den = d1x * d2y - d1y * d2x;
        const t = ((s2.x0 - s1.x0) * d2y - (s2.y0 - s1.y0) * d2x) / den;
        const u = ((s2.x0 - s1.x0) * d1y - (s2.y0 - s1.y0) * d1x) / den;
        const ra = resAt(e1, t * edges[e1].len);
        const rb = resAt(e2, u * edges[e2].len);
        if (ra !== rb) addConflict(ra, rb);
        if (!res[ra].zone) res[ra].crossing = true;
        if (!res[rb].zone) res[rb].crossing = true;
        continue;
      }
      const d = segSegDist(s1, s2);
      if (d < width) {
        const pa = edges[e1].pathId;
        const pb = edges[e2].pathId;
        const key = pa < pb ? `${pa}|${pb}` : `${pb}|${pa}`;
        const prev = closePairs.get(key);
        if (!prev || d < prev.dist) closePairs.set(key, { a: pa, b: pb, dist: d });
      }
    }
  }
  // 離路口太近的格 (別條路線經過路口旁邊) 也當路口看: 停在上面等就會擋住路口
  for (const c of cells) {
    if (!res[c].crossing && res[c].conflicts.some((x) => res[x].zone && res[x].junction)) res[c].crossing = true;
  }

  const groups = new Map<string, number[]>();
  for (const g of input.groups) {
    groups.set(
      g.id,
      g.nodeIds.map((id) => nodeIndex.get(id)).filter((i): i is number => i !== undefined && nodes[i].role === 1),
    );
  }

  return {
    r,
    cellLen,
    width,
    nodes,
    nodeIndex,
    edges,
    arcs,
    out,
    inc,
    res,
    corridors,
    groups,
    closePaths: [...closePairs.values()],
  };
}
