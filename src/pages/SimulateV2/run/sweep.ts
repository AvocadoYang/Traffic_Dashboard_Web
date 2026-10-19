/**
 * 車數掃描 (計劃 5.9): 某一種車從 min 台跑到 max 台, 每個台數跑幾個亂數種子, 取平均看有沒有達到目標.
 * 建議台數 = 達標的最少台數 / 可用率, 無條件進位. 純計算, 不碰畫面 (測試直接跑).
 */
import { toSimInput } from "../engine/runner";
import type { RunSummary, SimInput } from "../engine/types";
import { hashOf } from "../model/hash";
import type { SimDoc, SweepSettings } from "../model/types";

export interface SweepPlan {
  /** 掃描的車種 */
  typeId: string;
  typeName: string;
  counts: number[];
  seeds: number[];
  /** 其他車種加起來幾台 (照原本的台數, 不變) */
  others: number;
}

/** 掃描哪一種車: 設定裡選的, 找不到就第一種有台數的 */
export function sweepType(doc: SimDoc) {
  return doc.vehicleTypes.find((t) => t.id === doc.sweep.typeId) ?? doc.vehicleTypes.find((t) => t.count > 0) ?? doc.vehicleTypes[0] ?? null;
}

export function planSweep(doc: SimDoc): SweepPlan | null {
  const type = sweepType(doc);
  if (!type) return null;
  const s = doc.sweep;
  const counts: number[] = [];
  for (let n = s.min; n <= s.max; n++) counts.push(n);
  const seeds = Array.from({ length: s.seeds }, (_, k) => (doc.run.seed + k) % 2147483647);
  const others = doc.vehicleTypes.reduce((sum, t) => sum + (t.id === type.id ? 0 : t.count), 0);
  return { typeId: type.id, typeName: type.name, counts, seeds, others };
}

/** 掃描裡的某一次: 那種車改成 count 台、種子改成 seed */
export function sweepDoc(doc: SimDoc, typeId: string, count: number, seed: number): SimDoc {
  return {
    ...doc,
    vehicleTypes: doc.vehicleTypes.map((t) => (t.id === typeId ? { ...t, count } : t)),
    run: { ...doc.run, seed },
  };
}

export interface SweepJob {
  count: number;
  seed: number;
  input: SimInput;
}

/** 先把每個台數的第一個種子都跑完, 曲線比較快出來 */
export function sweepJobs(doc: SimDoc, plan: SweepPlan): SweepJob[] {
  const jobs: SweepJob[] = [];
  for (const seed of plan.seeds) {
    for (const count of plan.counts) jobs.push({ count, seed, input: toSimInput(sweepDoc(doc, plan.typeId, count, seed)) });
  }
  return jobs;
}

/** 單次執行的結果過期了沒: 比對這個 */
export const runHash = (doc: SimDoc) => hashOf(toSimInput(doc));

/** 掃描結果過期了沒: 掃描的那種車原本設幾台不影響 (反正每個台數都跑) */
export function sweepHash(doc: SimDoc): string {
  const type = sweepType(doc);
  const base = type ? sweepDoc(doc, type.id, 0, doc.run.seed) : doc;
  return hashOf({ input: toSimInput(base), sweep: doc.sweep, type: type?.id ?? null });
}

export interface SweepRun {
  count: number;
  seed: number;
  summary: RunSummary;
}

export interface Stat {
  avg: number;
  min: number;
  max: number;
}

export type SweepFail = "achievement" | "wait" | "utilization" | "deadlock";

export interface SweepRow {
  count: number;
  /** 跑完幾次 (全部 = plan.seeds.length) */
  runs: number;
  throughput: Stat;
  achievement: Stat;
  /** P95 等待 (秒); 沒有任務開始取貨時當 0 */
  waitP95: Stat;
  utilization: Stat;
  /** 產線停等 (分鐘) */
  lineStopMin: Stat;
  deadlocks: number;
  /** 每個種子都跑完才有; 沒跑完是 null */
  pass: boolean | null;
  fails: SweepFail[];
}

export interface SweepSummary {
  rows: SweepRow[];
  /** 達到所有目標的最少台數; 範圍內都沒有是 null */
  minPass: number | null;
  /** 建議台數 = minPass / 可用率, 無條件進位 */
  recommended: number | null;
  /** 比 minPass 多、卻又沒達標的台數 (車太多反而塞) */
  failAbove: number[];
  /** 全部跑完了沒 */
  complete: boolean;
}

const stat = (xs: number[]): Stat =>
  xs.length ? { avg: xs.reduce((a, b) => a + b, 0) / xs.length, min: Math.min(...xs), max: Math.max(...xs) } : { avg: 0, min: 0, max: 0 };

/** 建議台數: 浮點數誤差 (例如 17 / 0.85 = 20.000000000000004) 不要多進一台 */
export const recommendCount = (minPass: number, availability: number) => Math.ceil(minPass / Math.max(0.01, availability) - 1e-9);

export function summarizeSweep(runs: SweepRun[], plan: SweepPlan, settings: SweepSettings): SweepSummary {
  const rows: SweepRow[] = [];
  for (const count of plan.counts) {
    const list = runs.filter((r) => r.count === count);
    if (!list.length) continue;
    const k = list.map((r) => r.summary.kpi);
    const row: SweepRow = {
      count,
      runs: list.length,
      throughput: stat(k.map((x) => x.throughputPerHour)),
      achievement: stat(k.map((x) => x.achievement ?? 0)),
      waitP95: stat(k.map((x) => x.waitP95 ?? 0)),
      utilization: stat(k.map((x) => x.utilization)),
      lineStopMin: stat(k.map((x) => x.lineStopSec / 60)),
      deadlocks: list.filter((r) => r.summary.deadlock).length,
      pass: null,
      fails: [],
    };
    if (row.achievement.avg < settings.minAchievement - 1e-9) row.fails.push("achievement");
    if (row.waitP95.avg > settings.maxWaitP95Min * 60 + 1e-9) row.fails.push("wait");
    if (row.utilization.avg > settings.maxUtilization + 1e-9) row.fails.push("utilization");
    if (row.deadlocks > 0) row.fails.push("deadlock");
    if (list.length >= plan.seeds.length) row.pass = row.fails.length === 0;
    rows.push(row);
  }
  const complete = rows.length === plan.counts.length && rows.every((r) => r.pass !== null);
  const passing = rows.filter((r) => r.pass === true);
  const minPass = complete && passing.length ? passing[0].count : null;
  return {
    rows,
    minPass,
    recommended: minPass !== null ? recommendCount(minPass, settings.availability) : null,
    failAbove: minPass !== null ? rows.filter((r) => r.count > minPass && r.pass === false).map((r) => r.count) : [],
    complete,
  };
}
