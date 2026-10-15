/**
 * 點在畫布上的那一下要對到什麼: 既有點位、路線上的某一點, 或空地 (會吸附格線).
 */
import { snapToGrid } from "../model/geometry";
import { addNode, findNodeNear, findPathNear, setKind, splitPath } from "../model/ops";
import { NodeKind, Point, SimDoc } from "../model/types";

/** 滑鼠離點位幾個像素內算點到它 */
export const NODE_HIT_PX = 9;
/** 滑鼠離路線幾個像素內算點到它 */
export const PATH_HIT_PX = 7;

export type Target =
  | { kind: "node"; id: string; point: Point }
  | { kind: "path"; pathId: string; point: Point }
  | { kind: "free"; point: Point };

export function resolveTarget(
  doc: SimDoc,
  raw: Point,
  scale: number,
  opts: { snap: boolean; usePaths?: boolean },
): Target {
  const node = findNodeNear(doc, raw, NODE_HIT_PX / scale);
  if (node) return { kind: "node", id: node.id, point: { x: node.x, y: node.y } };
  if (opts.usePaths !== false) {
    const hit = findPathNear(doc, raw, PATH_HIT_PX / scale);
    if (hit) return { kind: "path", pathId: hit.path.id, point: hit.point };
  }
  return { kind: "free", point: opts.snap ? snapToGrid(raw, doc.editor.gridSize) : raw };
}

/**
 * 把 target 變成一個真的點位: 既有點位直接用 (要換類型就換), 路線上就切一刀插點, 空地就新增.
 * kind 不給代表不改類型 (畫路線時接到既有點位, 不應該把站點變回一般點位).
 */
export function materialize(doc: SimDoc, target: Target, kind?: NodeKind): { doc: SimDoc; id: string } {
  if (target.kind === "node") {
    const node = doc.nodes.find((n) => n.id === target.id);
    if (!node) return addNode(doc, target.point, kind ?? "point");
    if (kind && node.kind !== kind) return { doc: setKind(doc, [node.id], kind), id: node.id };
    return { doc, id: node.id };
  }
  if (target.kind === "path" && doc.paths.some((p) => p.id === target.pathId)) {
    return splitPath(doc, target.pathId, target.point, kind ?? "point");
  }
  return addNode(doc, target.point, kind ?? "point");
}
