import { DEFAULT_EDITOR, DEFAULT_STATION } from "./defaults";
import {
  ImageBackground,
  NodeKind,
  PathDirection,
  SIM_DOC_VERSION,
  SimDoc,
  SimGroup,
  SimNode,
  SimPath,
  StationType,
} from "./types";

/** 專案是用比較新版的畫面存的, 這一版看不懂 */
export class NewerDocError extends Error {}

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  options.includes(v as T) ? (v as T) : fallback;
const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

const NODE_KINDS: NodeKind[] = ["point", "station", "standby"];
const STATION_TYPES: StationType[] = ["pick", "drop", "both"];
const DIRECTIONS: PathDirection[] = ["two-way", "one-way"];

function parseNode(v: Obj): SimNode | null {
  const id = str(v.id);
  if (!id) return null;
  const kind = oneOf(v.kind, NODE_KINDS, "point");
  const node: SimNode = { id, name: str(v.name, id), x: num(v.x, 0), y: num(v.y, 0), kind };
  if (kind === "station") {
    const s = isObj(v.station) ? v.station : {};
    node.station = {
      type: oneOf(s.type, STATION_TYPES, DEFAULT_STATION.type),
      pickSec: Math.max(0, num(s.pickSec, DEFAULT_STATION.pickSec)),
      dropSec: Math.max(0, num(s.dropSec, DEFAULT_STATION.dropSec)),
      bufferMax: numOrNull(s.bufferMax),
    };
  }
  return node;
}

function parseBackground(v: unknown): ImageBackground | null {
  if (!isObj(v) || v.kind !== "image" || !str(v.fileId)) return null;
  return {
    kind: "image",
    fileId: str(v.fileId),
    fileName: str(v.fileName),
    source: oneOf(v.source, ["upload", "pdf", "site"] as const, "upload"),
    ...(typeof v.pdfPage === "number" ? { pdfPage: v.pdfPage } : {}),
    widthPx: Math.max(1, num(v.widthPx, 1)),
    heightPx: Math.max(1, num(v.heightPx, 1)),
    originX: num(v.originX, 0),
    originY: num(v.originY, 0),
    metersPerPx: num(v.metersPerPx, 0.05) > 0 ? num(v.metersPerPx, 0.05) : 0.05,
    opacity: Math.min(1, Math.max(0, num(v.opacity, 0.6))),
    locked: v.locked !== false,
    calibrated: v.calibrated === true,
  };
}

/**
 * 從後端或檔案讀進來的 doc 轉成這一版的格式. 缺的欄位補預設值, 壞掉的項目丟掉
 * (例如路線指到不存在的點位), 不讓畫面因為一筆壞資料整個打不開.
 */
export function parseDoc(raw: unknown): SimDoc {
  const d = isObj(raw) ? raw : {};
  const version = num(d.schemaVersion, 1);
  if (version > SIM_DOC_VERSION) throw new NewerDocError(`schemaVersion ${version}`);

  const nodes: SimNode[] = [];
  const seen = new Set<string>();
  for (const v of Array.isArray(d.nodes) ? d.nodes : []) {
    const n = isObj(v) ? parseNode(v) : null;
    if (n && !seen.has(n.id)) {
      seen.add(n.id);
      nodes.push(n);
    }
  }

  const paths: SimPath[] = [];
  for (const v of Array.isArray(d.paths) ? d.paths : []) {
    if (!isObj(v)) continue;
    const from = str(v.from);
    const to = str(v.to);
    if (!str(v.id) || !seen.has(from) || !seen.has(to) || from === to) continue;
    paths.push({
      id: str(v.id),
      from,
      to,
      direction: oneOf(v.direction, DIRECTIONS, "two-way"),
      maxSpeed: numOrNull(v.maxSpeed),
    });
  }

  const groups: SimGroup[] = [];
  for (const v of Array.isArray(d.groups) ? d.groups : []) {
    if (!isObj(v) || !str(v.id)) continue;
    const members = Array.isArray(v.nodeIds) ? v.nodeIds.filter((id): id is string => typeof id === "string" && seen.has(id)) : [];
    groups.push({ id: str(v.id), name: str(v.name, "群組"), nodeIds: members });
  }

  const e = isObj(d.editor) ? d.editor : {};
  return {
    schemaVersion: SIM_DOC_VERSION,
    background: parseBackground(d.background),
    nodes,
    paths,
    groups,
    editor: {
      gridSize: num(e.gridSize, DEFAULT_EDITOR.gridSize) > 0 ? num(e.gridSize, DEFAULT_EDITOR.gridSize) : DEFAULT_EDITOR.gridSize,
      snap: typeof e.snap === "boolean" ? e.snap : DEFAULT_EDITOR.snap,
      defaultDirection: oneOf(e.defaultDirection, DIRECTIONS, DEFAULT_EDITOR.defaultDirection),
    },
  };
}
