/**
 * 找路: 走最短時間的路. 時間 = 每段路長 / 速度 (車速和限速取小的) + 轉彎時間
 * (方向變化超過門檻就停下來原地轉, 另外加上減速再起步多花的時間).
 *
 * 不准在半路迴轉 (同一條路線開回頭、或轉超過 150 度), 只有出發的時候可以 (車本來就停著).
 */
import { MinHeap } from "./heap";
import type { Net } from "./network";

export interface Profile {
  /** 這台車目前的最高速度 (空車或載貨) */
  vcap: number;
  accel: number;
  decel: number;
  /** 轉向速度 (弧度/秒) */
  turnRate: number;
  /** 超過這個角度 (弧度) 就要停下來轉 */
  thr: number;
  canReverse: boolean;
}

const TWO_PI = Math.PI * 2;

/** 兩個方向差幾度 (弧度, 0 ~ π) */
export function angDiff(a: number, b: number) {
  let d = Math.abs(a - b) % TWO_PI;
  if (d > Math.PI) d = TWO_PI - d;
  return d;
}

/** 路線中途轉超過這個角度就算迴轉, 不准 (只有出發的時候可以掉頭) */
const MAX_TURN = (150 * Math.PI) / 180;

/** 從 a 弧接 b 弧是不是迴轉 (同一條路線開回頭, 或轉超過 150 度) */
export const isUturn = (net: Net, a: number, b: number) =>
  net.arcs[a].edge === net.arcs[b].edge || angDiff(net.arcs[a].heading, net.arcs[b].heading) > MAX_TURN;

export const arcTime = (net: Net, p: Profile, arc: number) => {
  const a = net.arcs[arc];
  return a.len / Math.min(p.vcap, a.vmax);
};

/** 停下來再起步, 比一路開過去多花的時間 */
const stopPenalty = (p: Profile) => p.vcap / (2 * p.accel) + p.vcap / (2 * p.decel);

/** 在點位上從 a 弧轉到 b 弧要多花的時間 */
export function turnCost(net: Net, p: Profile, a: number, b: number) {
  const ang = angDiff(net.arcs[a].heading, net.arcs[b].heading);
  return ang > p.thr ? ang / p.turnRate + stopPenalty(p) : 0;
}

/**
 * 停著的車要往 heading 方向出發, 要先轉多少 (弧度) 、是不是倒車出去.
 * 能倒車的車會挑轉得比較少的那個方向.
 */
export function departTurn(p: Profile, facing: number, heading: number): { angle: number; reverse: boolean } {
  const fwd = angDiff(facing, heading);
  if (!p.canReverse) return { angle: fwd, reverse: false };
  const back = angDiff(facing, heading + Math.PI);
  return back < fwd ? { angle: back, reverse: true } : { angle: fwd, reverse: false };
}

/** 出發前原地轉向要幾秒; 角度沒超過門檻就直接開 (邊走邊修正) */
export function departCost(p: Profile, facing: number, heading: number) {
  const { angle } = departTurn(p, facing, heading);
  return angle > p.thr ? angle / p.turnRate : 0;
}

/**
 * 從每個弧的終點 (剛開完這個弧) 到 target 最少要幾秒. 到不了是 Infinity.
 * 反過來從 target 往回做 Dijkstra, 一次算出所有起點.
 */
export function costToGo(net: Net, p: Profile, target: number): Float64Array {
  const dist = new Float64Array(net.arcs.length).fill(Infinity);
  const heap = new MinHeap<number>();
  for (const a of net.inc[target]) {
    dist[a] = 0;
    heap.push(0, a);
  }
  while (heap.size) {
    const d = heap.peekKey();
    const a = heap.pop()!;
    if (d > dist[a]) continue;
    const arc = net.arcs[a];
    const base = d + arcTime(net, p, a);
    for (const prev of net.inc[arc.from]) {
      if (isUturn(net, prev, a)) continue;
      if (net.arcs[prev].to === target) continue;
      const c = base + turnCost(net, p, prev, a);
      if (c < dist[prev] - 1e-12) {
        dist[prev] = c;
        heap.push(c, prev);
      }
    }
  }
  return dist;
}

/** 停在 node 的車到 target 最少幾秒 */
export function estimateFromNode(net: Net, p: Profile, ctg: Float64Array, node: number, facing: number, target: number) {
  if (node === target) return 0;
  let best = Infinity;
  for (const b of net.out[node]) {
    const c = departCost(p, facing, net.arcs[b].heading) + arcTime(net, p, b) + ctg[b];
    if (c < best) best = c;
  }
  return best;
}

/** 照 costToGo 一步一步選下一個弧, 直到 target; 到不了回 null */
export function followTo(net: Net, p: Profile, ctg: Float64Array, path: number[], target: number): number[] | null {
  let guard = net.arcs.length + 5;
  while (net.arcs[path[path.length - 1]].to !== target) {
    if (guard-- < 0) return null;
    const a = path[path.length - 1];
    let best = -1;
    let bestC = Infinity;
    for (const c of net.out[net.arcs[a].to]) {
      if (isUturn(net, a, c)) continue;
      const cost = turnCost(net, p, a, c) + arcTime(net, p, c) + ctg[c];
      if (cost < bestC - 1e-9) {
        bestC = cost;
        best = c;
      }
    }
    if (best < 0 || !Number.isFinite(bestC)) return null;
    path.push(best);
  }
  return path;
}

/** 停在 node、車頭朝 facing 的車到 target 的路線 (弧的清單); 已經在 target 回空陣列 */
export function planFromNode(net: Net, p: Profile, ctg: Float64Array, node: number, facing: number, target: number): number[] | null {
  if (node === target) return [];
  let best = -1;
  let bestC = Infinity;
  for (const b of net.out[node]) {
    const c = departCost(p, facing, net.arcs[b].heading) + arcTime(net, p, b) + ctg[b];
    if (c < bestC - 1e-9) {
      bestC = c;
      best = b;
    }
  }
  if (best < 0 || !Number.isFinite(bestC)) return null;
  return followTo(net, p, ctg, [best], target);
}

/**
 * 繞路用: 一般的 Dijkstra, 有些弧不能走 (banned). 從 fromArc 的終點出發 (不准迴轉),
 * 或 fromArc 是 -1 時從停在 node 的狀態出發.
 */
export function planAvoiding(
  net: Net,
  p: Profile,
  fromArc: number,
  node: number,
  facing: number,
  target: number,
  banned: (arc: number) => boolean,
): number[] | null {
  const n = net.arcs.length;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const heap = new MinHeap<number>();
  const startNode = fromArc >= 0 ? net.arcs[fromArc].to : node;
  if (startNode === target) return [];
  for (const b of net.out[startNode]) {
    if (banned(b)) continue;
    if (fromArc >= 0 && isUturn(net, fromArc, b)) continue;
    const c =
      (fromArc >= 0 ? turnCost(net, p, fromArc, b) : departCost(p, facing, net.arcs[b].heading)) + arcTime(net, p, b);
    if (c < dist[b]) {
      dist[b] = c;
      heap.push(c, b);
    }
  }
  while (heap.size) {
    const d = heap.peekKey();
    const a = heap.pop()!;
    if (d > dist[a]) continue;
    if (net.arcs[a].to === target) {
      const path: number[] = [];
      for (let x = a; x >= 0; x = prev[x]) path.push(x);
      return path.reverse();
    }
    for (const b of net.out[net.arcs[a].to]) {
      if (banned(b) || isUturn(net, a, b)) continue;
      const c = d + turnCost(net, p, a, b) + arcTime(net, p, b);
      if (c < dist[b] - 1e-12) {
        dist[b] = c;
        prev[b] = a;
        heap.push(c, b);
      }
    }
  }
  return null;
}
