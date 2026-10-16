/** 測試用: 用程式蓋一個小地圖 */
import type { DemandRow, PathDirection, SimNode, StationType, VehicleType } from "../../model/types";
import { DEFAULT_RUN, DEFAULT_TRAFFIC } from "../../model/defaults";
import type { SimInput } from "../types";

export const VEHICLE: VehicleType = {
  id: "v",
  name: "V",
  count: 1,
  length: 1,
  width: 0.8,
  speedEmpty: 1.5,
  speedLoaded: 1.5,
  accel: 0.5,
  decel: 0.5,
  turnSpeed: 90,
  canReverse: true,
};

export class Layout {
  nodes: SimNode[] = [];
  paths: SimInput["paths"] = [];
  groups: SimInput["groups"] = [];

  point(id: string, x: number, y: number) {
    this.nodes.push({ id, name: id, x, y, kind: "point" });
    return this;
  }

  station(id: string, x: number, y: number, pickSec = 30, dropSec = 30, type: StationType = "both", bufferMax: number | null = null) {
    this.nodes.push({ id, name: id, x, y, kind: "station", station: { type, pickSec, dropSec, bufferMax } });
    return this;
  }

  standby(id: string, x: number, y: number) {
    this.nodes.push({ id, name: id, x, y, kind: "standby" });
    return this;
  }

  path(from: string, to: string, direction: PathDirection = "two-way", maxSpeed: number | null = null) {
    this.paths.push({ id: `${from}-${to}`, from, to, direction, maxSpeed });
    return this;
  }

  /** 依序連起來 */
  chain(ids: string[], direction: PathDirection = "two-way") {
    for (let i = 1; i < ids.length; i++) this.path(ids[i - 1], ids[i], direction);
    return this;
  }

  group(id: string, nodeIds: string[]) {
    this.groups.push({ id, name: id, nodeIds });
    return this;
  }

  input(opts: {
    vehicles?: Partial<VehicleType>[];
    demand: Partial<DemandRow>[];
    durationH?: number;
    warmupMin?: number;
    seed?: number;
    turnThresholdDeg?: number;
    safetyGap?: number;
  }): SimInput {
    return {
      nodes: this.nodes,
      paths: this.paths,
      groups: this.groups,
      vehicleTypes: (opts.vehicles ?? [{}]).map((v, i) => ({ ...VEHICLE, id: `t${i}`, name: `V${i}`, ...v })),
      traffic: {
        ...DEFAULT_TRAFFIC,
        ...(opts.turnThresholdDeg !== undefined ? { turnThresholdDeg: opts.turnThresholdDeg } : {}),
        ...(opts.safetyGap !== undefined ? { safetyGap: opts.safetyGap } : {}),
      },
      demand: opts.demand.map((d, i) => ({
        id: `d${i}`,
        from: "",
        to: "",
        perHour: 10,
        mode: "random",
        start: null,
        end: null,
        priority: 0,
        ...d,
      })),
      run: {
        ...DEFAULT_RUN,
        durationH: opts.durationH ?? 1,
        warmupMin: opts.warmupMin ?? 0,
        seed: opts.seed ?? 1,
      },
    };
  }
}

/** 等速運動 + 加減速的時間 (梯形速度曲線) */
export function trapezoidTime(dist: number, vmax: number, a: number, d: number) {
  const da = (vmax * vmax) / (2 * a);
  const dd = (vmax * vmax) / (2 * d);
  if (da + dd <= dist) return vmax / a + vmax / d + (dist - da - dd) / vmax;
  // 加速到一半就要減速 (三角形)
  const vp = Math.sqrt((2 * dist * a * d) / (a + d));
  return vp / a + vp / d;
}
