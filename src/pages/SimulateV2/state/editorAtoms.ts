import { atom } from "jotai";
import { createEmptyDoc } from "../model/defaults";
import { Bounds, boundsOf } from "../model/geometry";
import { Point, SimDoc } from "../model/types";
import type { Target } from "../editor/targeting";
import { clearRunAtom } from "./runAtoms";

/** 復原最多幾步 */
const HISTORY_LIMIT = 200;

export interface History {
  past: SimDoc[];
  present: SimDoc;
  future: SimDoc[];
}

export const historyAtom = atom<History>({ past: [], present: createEmptyDoc(), future: [] });

export const docAtom = atom((get) => get(historyAtom).present);

/** 最後一次存檔 (或載入) 時的 doc; 跟目前的不是同一個物件就是改過還沒存 */
export const savedDocAtom = atom<SimDoc | null>(null);

export const isDirtyAtom = atom((get) => {
  const saved = get(savedDocAtom);
  return saved !== null && saved !== get(docAtom);
});

/** 改 doc 都走這裡, 才能復原. update 回傳同一個物件代表沒有改 */
export const commitAtom = atom(null, (get, set, update: (doc: SimDoc) => SimDoc) => {
  const h = get(historyAtom);
  const next = update(h.present);
  if (next === h.present) return;
  set(historyAtom, {
    past: [...h.past, h.present].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
  });
});

export const canUndoAtom = atom((get) => get(historyAtom).past.length > 0);
export const canRedoAtom = atom((get) => get(historyAtom).future.length > 0);

export const undoAtom = atom(null, (get, set) => {
  const h = get(historyAtom);
  const prev = h.past[h.past.length - 1];
  if (!prev) return;
  set(historyAtom, { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future] });
});

export const redoAtom = atom(null, (get, set) => {
  const h = get(historyAtom);
  const [next, ...rest] = h.future;
  if (!next) return;
  set(historyAtom, { past: [...h.past, h.present], present: next, future: rest });
});

export interface Selection {
  nodeIds: string[];
  pathIds: string[];
}

export const EMPTY_SELECTION: Selection = { nodeIds: [], pathIds: [] };

export const selectionAtom = atom<Selection>(EMPTY_SELECTION);

export type Tool = "select" | "point" | "path" | "station" | "standby" | "measure" | "calibrate";

export const toolAtom = atom<Tool>("select");

/** 畫面: 平移 (像素) 和比例 (一公尺幾個像素) */
export interface View {
  x: number;
  y: number;
  scale: number;
}

export const viewAtom = atom<View>({ x: 0, y: 0, scale: 10 });

export interface Layers {
  background: boolean;
  /** DXF 底圖 (各圖層的開關存在 doc.cad.hiddenLayers) */
  cad: boolean;
  grid: boolean;
  paths: boolean;
  nodes: boolean;
  labels: boolean;
}

export const layersAtom = atom<Layers>({
  background: true,
  cad: true,
  grid: true,
  paths: true,
  nodes: true,
  labels: true,
});

/** 滑鼠目前在地圖上的位置 (公尺), 給狀態列顯示 */
export const cursorAtom = atom<Point | null>(null);

/** 量測: 第一點、第二點 */
export const measureAtom = atom<{ a: Point | null; b: Point | null }>({ a: null, b: null });

/** 比例校正: 點的兩個位置; 兩點都有了就跳出輸入距離的視窗 */
export const calibrationAtom = atom<{ a: Point | null; b: Point | null }>({ a: null, b: null });

/** 比例校正要校哪一個: 圖片底圖或 DXF */
export const calibrationTargetAtom = atom<"image" | "cad">("image");

/** 畫路線時, 這一串目前接到哪裡 (第一下點完、還沒拉出第一段時, 起點還沒建成點位) */
export const pathDraftAtom = atom<Target | null>(null);

/** 換工具: 離開某個工具時, 它畫到一半的東西 (路線、量測、校正) 清掉 */
export const switchToolAtom = atom(null, (_get, set, tool: Tool) => {
  if (tool !== "path") set(pathDraftAtom, null);
  if (tool !== "measure") set(measureAtom, { a: null, b: null });
  if (tool !== "calibrate") set(calibrationAtom, { a: null, b: null });
  set(toolAtom, tool);
});

/** 換專案或重新載入時, 編輯狀態全部歸零 */
export const loadDocAtom = atom(null, (_get, set, doc: SimDoc) => {
  set(historyAtom, { past: [], present: doc, future: [] });
  set(savedDocAtom, doc);
  set(selectionAtom, EMPTY_SELECTION);
  set(toolAtom, "select");
  set(measureAtom, { a: null, b: null });
  set(calibrationAtom, { a: null, b: null });
  set(pathDraftAtom, null);
  set(clearRunAtom);
});

export const markSavedAtom = atom(null, (get, set, doc?: SimDoc) => {
  set(savedDocAtom, doc ?? get(docAtom));
});

export type WorkspaceTab = "layout" | "vehicles" | "demand" | "run";

export const workspaceTabAtom = atom<WorkspaceTab>("layout");

/** 目前打開的專案 */
export interface ProjectMeta {
  id: string;
  name: string;
  description: string;
  rev: number;
  updated_at: string;
}

export const projectAtom = atom<ProjectMeta | null>(null);

/** 要求畫面縮放到全部看得到 (每次 +1 觸發一次) */
export const fitRequestAtom = atom(0);

/** 下一次縮放只看這個範圍 (例如執行前檢查點出來的點位); 用完就清掉 */
export const fitBoundsAtom = atom<Bounds | null>(null);

/** 選取這些點位 / 路線, 切到佈局分頁, 畫面移過去 */
export const showInLayoutAtom = atom(null, (get, set, target: { nodeIds?: string[]; pathIds?: string[] }) => {
  const doc = get(docAtom);
  const nodeIds = new Set(target.nodeIds ?? []);
  for (const p of doc.paths) {
    if (target.pathIds?.includes(p.id)) {
      nodeIds.add(p.from);
      nodeIds.add(p.to);
    }
  }
  const bounds = boundsOf(doc.nodes.filter((n) => nodeIds.has(n.id)));
  set(selectionAtom, { nodeIds: target.nodeIds ?? [], pathIds: target.pathIds ?? [] });
  set(workspaceTabAtom, "layout");
  if (bounds) {
    // 只有一個點時範圍是 0, 四周留一點
    const pad = 4;
    set(fitBoundsAtom, { minX: bounds.minX - pad, minY: bounds.minY - pad, maxX: bounds.maxX + pad, maxY: bounds.maxY + pad });
    set(fitRequestAtom, (n) => n + 1);
  }
});
