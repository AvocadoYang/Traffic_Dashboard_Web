/**
 * 編輯操作: 每個函式都吃一份 doc、回一份新的 doc, 不改原本的 (復原 / 重做靠這個).
 */
import { dist, projectOnSegment, roundPoint, segmentIntersection } from "./geometry";
import { DEFAULT_STATION, newId, nextNodeNames, withKind } from "./defaults";
import {
  NodeKind,
  PathDirection,
  Point,
  SimDoc,
  SimGroup,
  SimNode,
  SimPath,
  StationProps,
} from "./types";

/** 小於這個距離 (公尺) 的兩個點當作同一個位置 */
export const SAME_POINT_EPS = 0.01;

export const nodeMap = (doc: SimDoc) => new Map(doc.nodes.map((n) => [n.id, n]));

/** 兩點之間已經有路線 (不管方向) 就回那一條 */
export const pathBetween = (doc: SimDoc, a: string, b: string) =>
  doc.paths.find((p) => (p.from === a && p.to === b) || (p.from === b && p.to === a));

export function addNode(
  doc: SimDoc,
  at: Point,
  kind: NodeKind = "point",
): { doc: SimDoc; id: string } {
  const p = roundPoint(at);
  const [name] = nextNodeNames(doc.nodes);
  const node = withKind({ id: newId(), name, x: p.x, y: p.y, kind: "point" }, kind);
  return { doc: { ...doc, nodes: [...doc.nodes, node] }, id: node.id };
}

/** 離 p 最近、而且在 tolerance 公尺以內的點位 */
export function findNodeNear(doc: SimDoc, p: Point, tolerance: number, exclude?: Set<string>) {
  let best: SimNode | null = null;
  let bestD = tolerance;
  for (const n of doc.nodes) {
    if (exclude?.has(n.id)) continue;
    const d = dist(p, n);
    if (d <= bestD) {
      best = n;
      bestD = d;
    }
  }
  return best;
}

/** 離 p 最近、而且在 tolerance 公尺以內的路線, 連同 p 投影到路線上的位置 */
export function findPathNear(doc: SimDoc, p: Point, tolerance: number) {
  const nodes = nodeMap(doc);
  let best: { path: SimPath; point: Point; t: number } | null = null;
  let bestD = tolerance;
  for (const path of doc.paths) {
    const a = nodes.get(path.from);
    const b = nodes.get(path.to);
    if (!a || !b) continue;
    const hit = projectOnSegment(p, a, b);
    if (hit.distance <= bestD) {
      best = { path, point: hit.point, t: hit.t };
      bestD = hit.distance;
    }
  }
  return best;
}

/**
 * 在路線上 at 的位置插一個點, 路線切成兩段 (方向、限速照舊).
 * at 離端點很近時直接回那個端點, 不切.
 */
export function splitPath(
  doc: SimDoc,
  pathId: string,
  at: Point,
  kind: NodeKind = "point",
): { doc: SimDoc; id: string } {
  const path = doc.paths.find((p) => p.id === pathId);
  const nodes = nodeMap(doc);
  const a = path && nodes.get(path.from);
  const b = path && nodes.get(path.to);
  if (!path || !a || !b) return addNode(doc, at, kind);
  const { point } = projectOnSegment(at, a, b);
  if (dist(point, a) < SAME_POINT_EPS) return { doc, id: a.id };
  if (dist(point, b) < SAME_POINT_EPS) return { doc, id: b.id };
  const added = addNode(doc, point, kind);
  const first: SimPath = { ...path, id: newId(), to: added.id };
  const second: SimPath = { ...path, id: newId(), from: added.id };
  return {
    doc: {
      ...added.doc,
      paths: added.doc.paths.flatMap((p) => (p.id === pathId ? [first, second] : [p])),
    },
    id: added.id,
  };
}

/**
 * 從 a 拉一條直線到 b. 經過的既有點位會接上, 跟既有路線交叉的地方會自動切出交叉點,
 * 所以畫完之後路網一定是連通的. 兩點之間已經有路線的那一段不重複建.
 */
export function addSegment(
  doc: SimDoc,
  aId: string,
  bId: string,
  direction: PathDirection,
): { doc: SimDoc; pathIds: string[] } {
  if (aId === bId) return { doc, pathIds: [] };
  let next = doc;
  const nodes = nodeMap(next);
  const a = nodes.get(aId);
  const b = nodes.get(bId);
  if (!a || !b) return { doc, pathIds: [] };
  const length = dist(a, b);
  if (length < SAME_POINT_EPS) return { doc, pathIds: [] };

  // 沿線的點: 既有點位剛好在線上的, 以及跟既有路線的交叉點
  const stops: { t: number; id: string }[] = [];
  for (const n of next.nodes) {
    if (n.id === aId || n.id === bId) continue;
    const hit = projectOnSegment(n, a, b);
    const awayFromEnds = hit.t * length > SAME_POINT_EPS && (1 - hit.t) * length > SAME_POINT_EPS;
    if (hit.distance < SAME_POINT_EPS && awayFromEnds) stops.push({ t: hit.t, id: n.id });
  }
  const crossings: { t: number; pathId: string; point: Point }[] = [];
  for (const p of next.paths) {
    if ([p.from, p.to].some((id) => id === aId || id === bId)) continue;
    const c = nodes.get(p.from);
    const d = nodes.get(p.to);
    if (!c || !d) continue;
    const hit = segmentIntersection(a, b, c, d, SAME_POINT_EPS);
    if (hit) crossings.push({ t: hit.t, pathId: p.id, point: hit.point });
  }
  for (const c of crossings) {
    // 交叉點剛好落在已經收進來的點位上就不用再切
    if (stops.some((s) => Math.abs(s.t - c.t) * length < SAME_POINT_EPS)) continue;
    const split = splitPath(next, c.pathId, c.point);
    next = split.doc;
    stops.push({ t: c.t, id: split.id });
  }

  const chain = [aId, ...stops.sort((x, y) => x.t - y.t).map((s) => s.id), bId];
  const created: SimPath[] = [];
  for (let i = 0; i + 1 < chain.length; i += 1) {
    const from = chain[i];
    const to = chain[i + 1];
    if (from === to || pathBetween(next, from, to) || created.some((p) => p.from === from && p.to === to)) continue;
    created.push({ id: newId(), from, to, direction, maxSpeed: null });
  }
  return {
    doc: { ...next, paths: [...next.paths, ...created] },
    pathIds: created.map((p) => p.id),
  };
}

/** 刪掉點位 (連著的路線一起刪) 和路線; 群組裡也拿掉 */
export function deleteItems(doc: SimDoc, nodeIds: string[], pathIds: string[]): SimDoc {
  const nodeSet = new Set(nodeIds);
  const pathSet = new Set(pathIds);
  return {
    ...doc,
    nodes: doc.nodes.filter((n) => !nodeSet.has(n.id)),
    paths: doc.paths.filter((p) => !pathSet.has(p.id) && !nodeSet.has(p.from) && !nodeSet.has(p.to)),
    groups: doc.groups.map((g) => ({ ...g, nodeIds: g.nodeIds.filter((id) => !nodeSet.has(id)) })),
  };
}

export function moveNodes(doc: SimDoc, positions: Map<string, Point>): SimDoc {
  if (positions.size === 0) return doc;
  return {
    ...doc,
    nodes: doc.nodes.map((n) => {
      const p = positions.get(n.id);
      return p ? { ...n, ...roundPoint(p) } : n;
    }),
  };
}

/** 換點位類型; 不再是站點的從群組裡拿掉 */
export function setKind(doc: SimDoc, nodeIds: string[], kind: NodeKind): SimDoc {
  const ids = new Set(nodeIds);
  return {
    ...doc,
    nodes: doc.nodes.map((n) => (ids.has(n.id) ? withKind(n, kind) : n)),
    groups:
      kind === "station"
        ? doc.groups
        : doc.groups.map((g) => ({ ...g, nodeIds: g.nodeIds.filter((id) => !ids.has(id)) })),
  };
}

export function updateNode(doc: SimDoc, id: string, patch: Partial<Pick<SimNode, "name" | "x" | "y">>): SimDoc {
  return {
    ...doc,
    nodes: doc.nodes.map((n) => (n.id === id ? { ...n, ...patch, ...roundPoint({ x: patch.x ?? n.x, y: patch.y ?? n.y }) } : n)),
  };
}

export function updateStations(doc: SimDoc, nodeIds: string[], patch: Partial<StationProps>): SimDoc {
  const ids = new Set(nodeIds);
  return {
    ...doc,
    nodes: doc.nodes.map((n) =>
      ids.has(n.id) && n.kind === "station"
        ? { ...n, station: { ...(n.station ?? DEFAULT_STATION), ...patch } }
        : n,
    ),
  };
}

export function updatePaths(
  doc: SimDoc,
  pathIds: string[],
  patch: Partial<Pick<SimPath, "direction" | "maxSpeed">>,
): SimDoc {
  const ids = new Set(pathIds);
  return { ...doc, paths: doc.paths.map((p) => (ids.has(p.id) ? { ...p, ...patch } : p)) };
}

export function reversePaths(doc: SimDoc, pathIds: string[]): SimDoc {
  const ids = new Set(pathIds);
  return {
    ...doc,
    paths: doc.paths.map((p) => (ids.has(p.id) ? { ...p, from: p.to, to: p.from } : p)),
  };
}

export function createGroup(doc: SimDoc, name: string, nodeIds: string[]): { doc: SimDoc; id: string } {
  const stations = new Set(doc.nodes.filter((n) => n.kind === "station").map((n) => n.id));
  const group: SimGroup = { id: newId(), name, nodeIds: nodeIds.filter((id) => stations.has(id)) };
  return { doc: { ...doc, groups: [...doc.groups, group] }, id: group.id };
}

export function updateGroup(doc: SimDoc, id: string, patch: Partial<Pick<SimGroup, "name" | "nodeIds">>): SimDoc {
  return { ...doc, groups: doc.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)) };
}

export function deleteGroup(doc: SimDoc, id: string): SimDoc {
  return { ...doc, groups: doc.groups.filter((g) => g.id !== id) };
}

export interface Clipboard {
  nodes: SimNode[];
  paths: SimPath[];
}

/** 複製選到的點位, 以及兩端都在裡面的路線 */
export function copyItems(doc: SimDoc, nodeIds: string[], pathIds: string[]): Clipboard | null {
  const ids = new Set(nodeIds);
  for (const p of doc.paths) {
    if (pathIds.includes(p.id)) {
      ids.add(p.from);
      ids.add(p.to);
    }
  }
  if (ids.size === 0) return null;
  return {
    nodes: doc.nodes.filter((n) => ids.has(n.id)),
    paths: doc.paths.filter((p) => ids.has(p.from) && ids.has(p.to)),
  };
}

/** 貼上: 每個點位拿新的 id 和新名稱, 整組位移 offset */
export function pasteItems(
  doc: SimDoc,
  clip: Clipboard,
  offset: Point,
): { doc: SimDoc; nodeIds: string[]; pathIds: string[] } {
  const names = nextNodeNames(doc.nodes, clip.nodes.length);
  const idMap = new Map<string, string>();
  const nodes = clip.nodes.map((n, i) => {
    const id = newId();
    idMap.set(n.id, id);
    return { ...n, id, name: names[i], ...roundPoint({ x: n.x + offset.x, y: n.y + offset.y }) };
  });
  const paths = clip.paths.map((p) => ({
    ...p,
    id: newId(),
    from: idMap.get(p.from) as string,
    to: idMap.get(p.to) as string,
  }));
  return {
    doc: { ...doc, nodes: [...doc.nodes, ...nodes], paths: [...doc.paths, ...paths] },
    nodeIds: nodes.map((n) => n.id),
    pathIds: paths.map((p) => p.id),
  };
}

export const pathLength = (doc: SimDoc, path: SimPath, nodes = nodeMap(doc)) => {
  const a = nodes.get(path.from);
  const b = nodes.get(path.to);
  return a && b ? dist(a, b) : 0;
};

export function totalPathLength(doc: SimDoc) {
  const nodes = nodeMap(doc);
  return doc.paths.reduce((sum, p) => sum + pathLength(doc, p, nodes), 0);
}
