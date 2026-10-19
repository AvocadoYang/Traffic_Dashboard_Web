/**
 * 車輛、搬運需求、執行設定的編輯操作. 跟 ops.ts 一樣: 吃一份 doc、回一份新的, 沒有改就回同一份.
 */
import { newDemandRow, newVehicleType } from "./defaults";
import type { DemandRow, RunSettings, SimDoc, SweepSettings, TrafficSettings, VehicleType } from "./types";

const changed = <T extends object>(item: T, patch: Partial<T>) =>
  (Object.keys(patch) as (keyof T)[]).some((k) => item[k] !== patch[k]);

function patchList<T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] | null {
  const i = list.findIndex((x) => x.id === id);
  if (i < 0 || !changed(list[i], patch)) return null;
  const next = [...list];
  next[i] = { ...list[i], ...patch };
  return next;
}

export function addVehicleType(doc: SimDoc): SimDoc {
  const names = new Set(doc.vehicleTypes.map((t) => t.name));
  let k = doc.vehicleTypes.length + 1;
  while (names.has(`AGV${k}`)) k++;
  return { ...doc, vehicleTypes: [...doc.vehicleTypes, newVehicleType({ name: doc.vehicleTypes.length ? `AGV${k}` : "AGV" })] };
}

export function updateVehicleType(doc: SimDoc, id: string, patch: Partial<VehicleType>): SimDoc {
  const list = patchList(doc.vehicleTypes, id, patch);
  return list ? { ...doc, vehicleTypes: list } : doc;
}

export function deleteVehicleType(doc: SimDoc, id: string): SimDoc {
  if (!doc.vehicleTypes.some((t) => t.id === id)) return doc;
  return { ...doc, vehicleTypes: doc.vehicleTypes.filter((t) => t.id !== id) };
}

export function updateTraffic(doc: SimDoc, patch: Partial<TrafficSettings>): SimDoc {
  return changed(doc.traffic, patch) ? { ...doc, traffic: { ...doc.traffic, ...patch } } : doc;
}

export function addDemandRow(doc: SimDoc, patch: Partial<DemandRow> = {}): SimDoc {
  return { ...doc, demand: [...doc.demand, newDemandRow(patch)] };
}

export function updateDemandRow(doc: SimDoc, id: string, patch: Partial<DemandRow>): SimDoc {
  const list = patchList(doc.demand, id, patch);
  return list ? { ...doc, demand: list } : doc;
}

export function deleteDemandRow(doc: SimDoc, id: string): SimDoc {
  if (!doc.demand.some((d) => d.id === id)) return doc;
  return { ...doc, demand: doc.demand.filter((d) => d.id !== id) };
}

/** 往上 / 往下移一列 (優先序一樣時, 表格上的順序沒有意義, 只是方便看) */
export function moveDemandRow(doc: SimDoc, id: string, delta: -1 | 1): SimDoc {
  const i = doc.demand.findIndex((d) => d.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= doc.demand.length) return doc;
  const next = [...doc.demand];
  [next[i], next[j]] = [next[j], next[i]];
  return { ...doc, demand: next };
}

export function updateRun(doc: SimDoc, patch: Partial<RunSettings>): SimDoc {
  return changed(doc.run, patch) ? { ...doc, run: { ...doc.run, ...patch } } : doc;
}

export function updateSweep(doc: SimDoc, patch: Partial<SweepSettings>): SimDoc {
  if (!changed(doc.sweep, patch)) return doc;
  const next = { ...doc.sweep, ...patch };
  // 範圍反過來時把另一頭推過去
  if (patch.min !== undefined && next.max < next.min) next.max = next.min;
  if (patch.max !== undefined && next.min > next.max) next.min = next.max;
  return { ...doc, sweep: next };
}

/** 模擬會用到的設定 (點位、路線、群組、車、規則、需求、執行設定) 是不是同一份: 結果過期了沒 */
export const sameSimSetup = (a: SimDoc, b: SimDoc) =>
  a.nodes === b.nodes &&
  a.paths === b.paths &&
  a.groups === b.groups &&
  a.vehicleTypes === b.vehicleTypes &&
  a.traffic === b.traffic &&
  a.demand === b.demand &&
  a.run === b.run;
