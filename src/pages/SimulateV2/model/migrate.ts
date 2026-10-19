import { CAD_UNITS, CAD_UNIT_METERS } from "./cad";
import { DEFAULT_EDITOR, DEFAULT_RUN, DEFAULT_STATION, DEFAULT_SWEEP, DEFAULT_TRAFFIC, DEFAULT_VEHICLE, newId, newVehicleType } from "./defaults";
import {
  CadBackground,
  DemandMode,
  DemandRow,
  ImageBackground,
  NodeKind,
  PathDirection,
  RunSettings,
  SIM_DOC_VERSION,
  SimDoc,
  SimGroup,
  SimNode,
  SimPath,
  StationType,
  SweepSettings,
  TrafficSettings,
  VehicleType,
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

function parseExtent(v: unknown): CadBackground["extent"] {
  const e = isObj(v) ? v : {};
  const minX = num(e.minX, 0);
  const minY = num(e.minY, 0);
  return { minX, minY, maxX: Math.max(minX, num(e.maxX, minX)), maxY: Math.max(minY, num(e.maxY, minY)) };
}

function parseCad(v: unknown): CadBackground | null {
  if (!isObj(v) || v.kind !== "dxf" || !str(v.fileId)) return null;
  const unit = oneOf(v.unit, CAD_UNITS, "mm");
  const mpu = num(v.metersPerUnit, CAD_UNIT_METERS[unit]);
  const hidden = Array.isArray(v.hiddenLayers) ? v.hiddenLayers.filter((x): x is string => typeof x === "string") : [];
  return {
    kind: "dxf",
    fileId: str(v.fileId),
    fileName: str(v.fileName),
    unit,
    metersPerUnit: mpu > 0 ? mpu : CAD_UNIT_METERS[unit],
    baseX: num(v.baseX, 0),
    baseY: num(v.baseY, 0),
    extent: parseExtent(v.extent),
    originX: num(v.originX, 0),
    originY: num(v.originY, 0),
    hiddenLayers: [...new Set(hidden)],
    opacity: Math.min(1, Math.max(0, num(v.opacity, 0.7))),
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
  // 第 1 版沒有車種、需求表、執行設定: 補預設值 (一種車, 需求表空白)
  const vehicleTypes = Array.isArray(d.vehicleTypes)
    ? d.vehicleTypes.filter(isObj).map(parseVehicleType)
    : [newVehicleType()];
  return {
    schemaVersion: SIM_DOC_VERSION,
    background: parseBackground(d.background),
    // 第 2 版以前沒有 DXF 底圖和車數掃描
    cad: parseCad(d.cad),
    nodes,
    paths,
    groups,
    editor: {
      gridSize: num(e.gridSize, DEFAULT_EDITOR.gridSize) > 0 ? num(e.gridSize, DEFAULT_EDITOR.gridSize) : DEFAULT_EDITOR.gridSize,
      snap: typeof e.snap === "boolean" ? e.snap : DEFAULT_EDITOR.snap,
      defaultDirection: oneOf(e.defaultDirection, DIRECTIONS, DEFAULT_EDITOR.defaultDirection),
      snapCad: typeof e.snapCad === "boolean" ? e.snapCad : DEFAULT_EDITOR.snapCad,
    },
    vehicleTypes: dedupeIds(vehicleTypes),
    traffic: parseTraffic(d.traffic),
    demand: dedupeIds(Array.isArray(d.demand) ? d.demand.filter(isObj).map(parseDemandRow) : []),
    run: parseRun(d.run),
    sweep: parseSweep(d.sweep),
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const ranged = (v: unknown, fallback: number, lo: number, hi: number) => clamp(num(v, fallback), lo, hi);
const int = (v: unknown, fallback: number, lo: number, hi: number) => Math.round(ranged(v, fallback, lo, hi));

/** "HH:MM" (00:00 ~ 23:59); 格式不對回 null */
export function parseClock(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

/** id 重複 (手改過的檔案) 的換一個新的, 不然表格和刪除會亂掉 */
function dedupeIds<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.map((item) => {
    const id = item.id && !seen.has(item.id) ? item.id : newId();
    seen.add(id);
    return id === item.id ? item : { ...item, id };
  });
}

function parseVehicleType(v: Obj): VehicleType {
  const D = DEFAULT_VEHICLE;
  return {
    id: str(v.id),
    name: str(v.name, D.name).slice(0, 50) || D.name,
    count: int(v.count, D.count, 0, 200),
    length: ranged(v.length, D.length, 0.2, 30),
    width: ranged(v.width, D.width, 0.2, 10),
    speedEmpty: ranged(v.speedEmpty, D.speedEmpty, 0.05, 10),
    speedLoaded: ranged(v.speedLoaded, D.speedLoaded, 0.05, 10),
    accel: ranged(v.accel, D.accel, 0.01, 10),
    decel: ranged(v.decel, D.decel, 0.01, 10),
    turnSpeed: ranged(v.turnSpeed, D.turnSpeed, 1, 360),
    canReverse: typeof v.canReverse === "boolean" ? v.canReverse : D.canReverse,
  };
}

function parseTraffic(v: unknown): TrafficSettings {
  const t = isObj(v) ? v : {};
  return {
    safetyGap: ranged(t.safetyGap, DEFAULT_TRAFFIC.safetyGap, 0, 10),
    turnThresholdDeg: ranged(t.turnThresholdDeg, DEFAULT_TRAFFIC.turnThresholdDeg, 0, 180),
  };
}

const DEMAND_MODES: DemandMode[] = ["fixed", "random"];

function parseDemandRow(v: Obj): DemandRow {
  const start = parseClock(v.start);
  const end = parseClock(v.end);
  return {
    id: str(v.id),
    from: str(v.from),
    to: str(v.to),
    perHour: ranged(v.perHour, 10, 0, 100000),
    mode: oneOf(v.mode, DEMAND_MODES, "random"),
    // 時段要兩頭都有才算數
    start: start && end ? start : null,
    end: start && end ? end : null,
    priority: int(v.priority, 0, -1000, 1000),
  };
}

function parseRun(v: unknown): RunSettings {
  const r = isObj(v) ? v : {};
  const durationH = ranged(r.durationH, DEFAULT_RUN.durationH, 0.1, 24 * 7);
  return {
    durationH,
    warmupMin: ranged(r.warmupMin, DEFAULT_RUN.warmupMin, 0, durationH * 60),
    startClock: parseClock(r.startClock) ?? DEFAULT_RUN.startClock,
    seed: int(r.seed, DEFAULT_RUN.seed, 0, 2 ** 31 - 1),
  };
}

function parseSweep(v: unknown): SweepSettings {
  const w = isObj(v) ? v : {};
  const D = DEFAULT_SWEEP;
  const min = int(w.min, D.min, 1, 200);
  return {
    typeId: typeof w.typeId === "string" && w.typeId ? w.typeId : null,
    min,
    max: int(w.max, Math.max(min, D.max), min, 200),
    seeds: int(w.seeds, D.seeds, 1, 10),
    minAchievement: ranged(w.minAchievement, D.minAchievement, 0.5, 1),
    maxWaitP95Min: ranged(w.maxWaitP95Min, D.maxWaitP95Min, 0, 600),
    maxUtilization: ranged(w.maxUtilization, D.maxUtilization, 0.1, 1),
    availability: ranged(w.availability, D.availability, 0.3, 1),
  };
}
