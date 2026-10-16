import { nanoid } from "nanoid";
import {
  DemandRow,
  EditorSettings,
  NodeKind,
  RunSettings,
  SIM_DOC_VERSION,
  SimDoc,
  SimNode,
  StationProps,
  SweepSettings,
  TrafficSettings,
  VehicleType,
} from "./types";

export const DEFAULT_EDITOR: EditorSettings = {
  gridSize: 1,
  snap: true,
  defaultDirection: "two-way",
  snapCad: true,
};

export const DEFAULT_STATION: StationProps = {
  type: "both",
  pickSec: 30,
  dropSec: 30,
  bufferMax: null,
};

/** 新車種的預設值: 一般的堆高機式 AGV */
export const DEFAULT_VEHICLE: Omit<VehicleType, "id"> = {
  name: "AGV",
  count: 3,
  length: 2.4,
  width: 1.2,
  speedEmpty: 1.5,
  speedLoaded: 1.0,
  accel: 0.4,
  decel: 0.5,
  turnSpeed: 30,
  canReverse: true,
};

export const DEFAULT_TRAFFIC: TrafficSettings = {
  safetyGap: 0.5,
  turnThresholdDeg: 30,
};

export const DEFAULT_RUN: RunSettings = {
  durationH: 8,
  warmupMin: 30,
  startClock: "08:00",
  seed: 1,
};

export const DEFAULT_SWEEP: SweepSettings = {
  typeId: null,
  min: 1,
  max: 10,
  seeds: 3,
  minAchievement: 0.99,
  maxWaitP95Min: 5,
  maxUtilization: 0.85,
  availability: 0.85,
};

export const newId = () => nanoid(10);

export const newVehicleType = (patch: Partial<VehicleType> = {}): VehicleType => ({
  id: newId(),
  ...DEFAULT_VEHICLE,
  ...patch,
});

export const newDemandRow = (patch: Partial<DemandRow> = {}): DemandRow => ({
  id: newId(),
  from: "",
  to: "",
  perHour: 10,
  mode: "random",
  start: null,
  end: null,
  priority: 0,
  ...patch,
});

export const createEmptyDoc = (): SimDoc => ({
  schemaVersion: SIM_DOC_VERSION,
  background: null,
  cad: null,
  nodes: [],
  paths: [],
  groups: [],
  editor: { ...DEFAULT_EDITOR },
  vehicleTypes: [newVehicleType()],
  traffic: { ...DEFAULT_TRAFFIC },
  demand: [],
  run: { ...DEFAULT_RUN },
  sweep: { ...DEFAULT_SWEEP },
});

/**
 * 新點位的名稱: 目前最大的數字名稱 + 1 (跟現場點位一樣用數字), 從 1 開始.
 * 一次要好幾個時傳 count, 拿到連號.
 */
export function nextNodeNames(nodes: SimNode[], count = 1): string[] {
  let max = 0;
  for (const n of nodes) {
    if (/^\d{1,9}$/.test(n.name)) max = Math.max(max, Number(n.name));
  }
  return Array.from({ length: count }, (_, i) => String(max + 1 + i));
}

/** 換點位類型: 變成站點時補上預設的站點設定, 不是站點就拿掉 */
export function withKind(node: SimNode, kind: NodeKind): SimNode {
  if (kind === "station") {
    return { ...node, kind, station: node.station ?? { ...DEFAULT_STATION } };
  }
  const { station: _station, ...rest } = node;
  return { ...rest, kind };
}
