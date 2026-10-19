/**
 * 車數掃描的自動測試: 每個台數的平均和最好 / 最差、達標判斷、建議台數 (除以可用率、無條件進位),
 * 掃描的指紋不受原本台數影響. yarn test:sim
 */
import { describe, expect, it } from "vitest";
import type { Kpi, RunSummary } from "../../engine/types";
import { createEmptyDoc, newDemandRow, newVehicleType } from "../../model/defaults";
import type { SweepSettings } from "../../model/types";
import { SweepPlan, SweepRun, planSweep, recommendCount, summarizeSweep, sweepHash, sweepJobs } from "../sweep";

const kpi = (p: Partial<Kpi>): Kpi => ({
  throughputPerHour: 0,
  demandPerHour: 60,
  createdPerHour: 60,
  lostPerHour: 0,
  achievement: 1,
  waitAvg: 30,
  waitP95: 60,
  waitMax: 90,
  taskAvg: 120,
  taskP95: 200,
  utilization: 0.5,
  lineStopCount: 0,
  lineStopSec: 0,
  created: 100,
  completed: 100,
  backlog: 0,
  inTransit: 0,
  ...p,
});

const run = (count: number, seed: number, p: Partial<Kpi>, deadlock = false): SweepRun => ({
  count,
  seed,
  summary: { kpi: kpi(p), deadlock: deadlock ? { t: 100, vehicles: ["a", "b"], points: [] } : null, endSec: 3600, wallMs: 10, reroutes: 0, noStandby: 0 } as RunSummary,
});

const settings: SweepSettings = {
  typeId: null,
  min: 2,
  max: 6,
  seeds: 2,
  minAchievement: 0.99,
  maxWaitP95Min: 5,
  maxUtilization: 0.85,
  availability: 0.85,
};
const plan: SweepPlan = { typeId: "t", typeName: "AGV", counts: [2, 3, 4, 5, 6], seeds: [1, 2], others: 0 };

describe("車數掃描", () => {
  it("建議台數 = 達標台數 / 可用率, 無條件進位; 浮點誤差不多進一台", () => {
    expect(recommendCount(4, 0.85)).toBe(5);
    expect(recommendCount(17, 0.85)).toBe(20);
    expect(recommendCount(5, 1)).toBe(5);
    expect(recommendCount(3, 0.5)).toBe(6);
  });

  it("平均、最好 / 最差; 每個目標分開判斷; 達標的最少台數; 車太多又沒達標的列出來", () => {
    const runs: SweepRun[] = [
      // 2 台: 搬不完
      run(2, 1, { throughputPerHour: 40, achievement: 0.66, utilization: 1, waitP95: 1200 }),
      run(2, 2, { throughputPerHour: 44, achievement: 0.72, utilization: 1, waitP95: 1500 }),
      // 3 台: 達成率平均 0.985 < 0.99
      run(3, 1, { throughputPerHour: 58, achievement: 0.98, utilization: 0.9, waitP95: 250 }),
      run(3, 2, { throughputPerHour: 59, achievement: 0.99, utilization: 0.88, waitP95: 280 }),
      // 4 台: 達標
      run(4, 1, { throughputPerHour: 60, achievement: 1, utilization: 0.7, waitP95: 120 }),
      run(4, 2, { throughputPerHour: 60, achievement: 0.995, utilization: 0.72, waitP95: 200 }),
      // 5 台: 一次死結 -> 不達標
      run(5, 1, { throughputPerHour: 60, utilization: 0.6 }),
      run(5, 2, { throughputPerHour: 30, utilization: 0.6 }, true),
      // 6 台: 達標
      run(6, 1, { throughputPerHour: 60, utilization: 0.5 }),
      run(6, 2, { throughputPerHour: 60, utilization: 0.5 }),
    ];
    const s = summarizeSweep(runs, plan, settings);
    expect(s.complete).toBe(true);
    const by = new Map(s.rows.map((r) => [r.count, r]));
    expect(by.get(2)!.throughput).toEqual({ avg: 42, min: 40, max: 44 });
    expect(by.get(2)!.fails).toEqual(["achievement", "wait", "utilization"]);
    expect(by.get(3)!.fails).toEqual(["achievement", "utilization"]);
    expect(by.get(4)!.pass).toBe(true);
    expect(by.get(5)!.fails).toEqual(["deadlock"]);
    expect(by.get(5)!.deadlocks).toBe(1);
    expect(s.minPass).toBe(4);
    expect(s.recommended).toBe(5);
    expect(s.failAbove).toEqual([5]);
  });

  it("還沒跑完: 不判斷達標, 沒有建議台數", () => {
    const runs = [run(2, 1, { throughputPerHour: 60 }), run(3, 1, { throughputPerHour: 60 })];
    const s = summarizeSweep(runs, plan, settings);
    expect(s.complete).toBe(false);
    expect(s.rows.every((r) => r.pass === null)).toBe(true);
    expect(s.minPass).toBeNull();
    expect(s.recommended).toBeNull();
  });

  it("範圍內都沒達標: 沒有建議台數", () => {
    const runs = plan.counts.flatMap((c) => plan.seeds.map((seed) => run(c, seed, { achievement: 0.5 })));
    const s = summarizeSweep(runs, plan, settings);
    expect(s.complete).toBe(true);
    expect(s.minPass).toBeNull();
    expect(s.recommended).toBeNull();
  });

  it("要掃哪一種車、種子、工作順序; 指紋不受那種車原本的台數影響", () => {
    const doc = createEmptyDoc();
    const a = newVehicleType({ name: "A", count: 0 });
    const b = newVehicleType({ name: "B", count: 3 });
    const c = newVehicleType({ name: "C", count: 2 });
    doc.vehicleTypes = [a, b, c];
    doc.run = { ...doc.run, seed: 7 };
    doc.sweep = { ...settings, typeId: null, min: 1, max: 3, seeds: 2 };
    const p = planSweep(doc)!;
    // 沒選: 第一種有台數的
    expect(p.typeName).toBe("B");
    expect(p.others).toBe(2);
    expect(p.seeds).toEqual([7, 8]);
    const jobs = sweepJobs(doc, p);
    expect(jobs.map((j) => `${j.count}/${j.seed}`)).toEqual(["1/7", "2/7", "3/7", "1/8", "2/8", "3/8"]);
    expect(jobs[2].input.vehicleTypes.map((v) => v.count)).toEqual([0, 3, 2]);
    expect(jobs[0].input.run.seed).toBe(7);
    const h = sweepHash(doc);
    expect(sweepHash({ ...doc, vehicleTypes: [a, { ...b, count: 9 }, c] })).toBe(h);
    expect(sweepHash({ ...doc, vehicleTypes: [a, b, { ...c, count: 9 }] })).not.toBe(h);
    expect(sweepHash({ ...doc, demand: [newDemandRow()] })).not.toBe(h);
    expect(sweepHash({ ...doc, sweep: { ...doc.sweep, max: 4 } })).not.toBe(h);
  });
});
