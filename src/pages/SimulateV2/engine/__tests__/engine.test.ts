/**
 * 模擬引擎的自動測試 (計劃 5.10). 改引擎就要跑: yarn test:sim
 */
import { describe, expect, it } from "vitest";
import { Simulator, runSimulation } from "../sim";
import type { SimInput } from "../types";
import { Layout, trapezoidTime } from "./layout";
import { warehouse } from "./warehouse";

/** 跑一次, 每一步都檢查內部狀態有沒有矛盾 */
function runChecked(input: SimInput, every = 1) {
  const sim = new Simulator(input, { trace: false });
  const errors: string[] = [];
  let step = 0;
  const res = sim.runWithHook((s) => {
    if (errors.length < 5 && step++ % every === 0) errors.push(...s.checkInvariants());
  });
  return { res, errors, sim };
}

describe("1. 單車走直線", () => {
  it("取貨站到放貨站的時間跟加速、等速、減速的公式一樣 (誤差 < 0.2 秒)", () => {
    const L = new Layout().standby("S", -10, 0).station("A", 0, 0, 5, 5).station("B", 20, 0, 5, 5).chain(["S", "A", "B"]);
    const res = runSimulation(L.input({ demand: [{ from: "A", to: "B", perHour: 1, mode: "fixed" }], durationH: 2 }));
    expect(res.deadlock).toBeNull();
    const first = res.loads[0];
    expect(first.dropDone).toBeGreaterThan(0);
    expect(Math.abs(first.dropStart - first.pickDone - trapezoidTime(20, 1.5, 0.5, 0.5))).toBeLessThan(0.2);
    // 從待命點開到取貨站 (10 公尺)
    expect(Math.abs(first.pickStart - first.assigned - trapezoidTime(10, 1.5, 0.5, 0.5))).toBeLessThan(0.2);
  });

  it("限速的路段會先減速再進去", () => {
    const L = new Layout()
      .standby("S", -10, 0)
      .station("A", 0, 0, 5, 5)
      .point("M", 10, 0)
      .station("B", 20, 0, 5, 5)
      .chain(["S", "A", "M"])
      .path("M", "B", "two-way", 0.5);
    const res = runSimulation(L.input({ demand: [{ from: "A", to: "B", perHour: 1, mode: "fixed" }], durationH: 2 }));
    const first = res.loads[0];
    // 前 10 公尺最快 1.5, 在 M 之前要減到 0.5; 後 10 公尺 0.5
    const travel = first.dropStart - first.pickDone;
    const expected = 1.5 / 0.5 + (1.5 - 0.5) / 0.5 + (10 - 2.25 - 2) / 1.5 + 10 / 0.5 + 0.5 / 0.5 / 2;
    expect(Math.abs(travel - expected)).toBeLessThan(1);
  });

  it("轉彎超過門檻要停下來原地轉: 時間多了轉向和減速再起步", () => {
    const L = new Layout().standby("S", -10, 0).station("A", 0, 0, 5, 5).point("C", 10, 0).station("B", 10, 10, 5, 5).chain(["S", "A", "C", "B"]);
    const res = runSimulation(L.input({ vehicles: [{ turnSpeed: 45 }], demand: [{ from: "A", to: "B", perHour: 1, mode: "fixed" }], durationH: 2 }));
    const first = res.loads[0];
    // 兩段各 10 公尺 + 原地轉 90 度 (2 秒)
    const expected = 2 * trapezoidTime(10, 1.5, 0.5, 0.5) + 2;
    expect(Math.abs(first.dropStart - first.pickDone - expected)).toBeLessThan(0.3);
  });
});

describe("2. 排隊理論 (M/D/1)", () => {
  it("一台車在兩站之間服務隨機需求: 平均等待時間跟公式差不到 5%", () => {
    // 單向環線 W -> P -> C1 -> D -> C2 -> W; 加減速很快、不停下來轉, 每一趟的時間固定
    const L = new Layout()
      .standby("W", 0, 0)
      .station("P", 10, 0, 30, 30, "pick")
      .point("C1", 20, 0)
      .station("D", 20, 10, 30, 30, "drop")
      .point("C2", 0, 10)
      .chain(["W", "P", "C1", "D", "C2", "W"], "one-way");
    const S = 60 / 1.5 + 60 + 0.7; // 一圈 + 取放貨 + 停兩次和事件對齊的零頭
    const rho = 0.6;
    const ratios: number[] = [];
    for (const seed of [1, 2, 3]) {
      const res = runSimulation(
        L.input({
          vehicles: [{ accel: 5, decel: 5 }],
          demand: [{ from: "P", to: "D", perHour: (rho / S) * 3600, mode: "random" }],
          durationH: 600,
          warmupMin: 60,
          turnThresholdDeg: 100,
          seed,
        }),
        { trace: false },
      );
      const wq = (rho * S) / (2 * (1 - rho));
      const travelWP = 10 / 1.5 + 0.3;
      ratios.push(res.kpi.waitAvg! / (wq + travelWP));
    }
    const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    expect(Math.abs(mean - 1)).toBeLessThan(0.05);
  }, 60_000);
});

describe("3. N 台車在單向環線上", () => {
  it("搬運量不會超過 N 倍的一台車, 車多到塞滿時停在上限", () => {
    const loop = (n: number) => {
      const L = new Layout()
        .point("J", 0, 0)
        .station("P", 10, 0, 30, 30, "pick")
        .point("C1", 30, 0)
        .station("D", 30, 10, 30, 30, "drop")
        .point("C2", 0, 10)
        .chain(["J", "P", "C1", "D", "C2", "J"], "one-way");
      const sb = Array.from({ length: 8 }, (_, i) => `S${i + 1}`);
      sb.forEach((id, i) => L.standby(id, -3 * (i + 1), 0));
      L.chain(["J", ...sb]);
      return L.input({ vehicles: [{ count: n }], demand: [{ from: "P", to: "D", perHour: 1000 }], durationH: 4, warmupMin: 30 });
    };
    const th: number[] = [];
    for (let n = 1; n <= 7; n++) {
      const { res, errors } = runChecked(loop(n), 7);
      expect(errors).toEqual([]);
      expect(res.deadlock).toBeNull();
      th.push(res.kpi.throughputPerHour);
    }
    for (let i = 1; i < th.length; i++) {
      expect(th[i]).toBeLessThanOrEqual(th[0] * (i + 1) * 1.02);
      expect(th[i]).toBeGreaterThanOrEqual(th[i - 1] * 0.98);
    }
    // 取貨站一次一台, 30 秒一板: 最多每小時 120 板; 車夠多時就停在差不多的地方
    expect(th[6]).toBeLessThanOrEqual(120);
    expect(Math.abs(th[6] - th[5])).toBeLessThan(th[5] * 0.03);
    expect(th[6]).toBeGreaterThan(th[0] * 2.5);
  }, 60_000);
});

describe("4. 同樣的輸入和種子, 結果一模一樣", () => {
  it("兩次結果和軌跡完全一樣; 換種子就不一樣", () => {
    const input = warehouse({ vehicles: 6, durationH: 2 });
    const strip = (r: ReturnType<typeof runSimulation>) => ({ ...r, wallMs: 0, trace: null });
    const a = runSimulation(input);
    const b = runSimulation(input);
    expect(JSON.stringify(strip(a))).toEqual(JSON.stringify(strip(b)));
    expect(Buffer.from(a.trace!.pose.buffer).equals(Buffer.from(b.trace!.pose.buffer))).toBe(true);
    const c = runSimulation({ ...input, run: { ...input.run, seed: 2 } });
    expect(JSON.stringify(strip(c))).not.toEqual(JSON.stringify(strip(a)));
  }, 30_000);
});

describe("5. 數量對得起來", () => {
  it("產生的 = 已完成 + 搬運中 + 等待中; 每張任務的時間先後順序對; 取放貨的站點對", () => {
    const input = warehouse({ vehicles: 5, durationH: 3 });
    const res = runSimulation(input, { trace: false });
    const all = res.loads.length;
    const done = res.loads.filter((l) => l.dropDone >= 0).length;
    expect(done + res.kpi.inTransit + res.kpi.backlog).toBe(all);
    const stations = new Map(input.nodes.map((n) => [n.id, n]));
    const stack = new Set(input.groups[0].nodeIds);
    for (const l of res.loads) {
      if (l.assigned >= 0) expect(l.assigned).toBeGreaterThanOrEqual(l.created - 1e-6);
      if (l.pickStart >= 0) expect(l.pickStart).toBeGreaterThanOrEqual(l.assigned - 1e-6);
      if (l.pickDone >= 0) expect(l.pickDone).toBeGreaterThanOrEqual(l.pickStart);
      if (l.dropStart >= 0) expect(l.dropStart).toBeGreaterThanOrEqual(l.pickDone);
      if (l.dropDone >= 0) expect(l.dropDone).toBeGreaterThanOrEqual(l.dropStart);
      if (l.dropDone < 0) continue;
      if (l.row === 0) {
        expect(l.from).toBe("OUT");
        expect(stack.has(l.to!)).toBe(true);
      } else {
        expect(stack.has(l.from!)).toBe(true);
        expect(l.to).toBe("SHIP");
      }
      expect(stations.get(l.from!)!.station!.type).not.toBe("drop");
      expect(stations.get(l.to!)!.station!.type).not.toBe("pick");
    }
    const rowsDone = res.rows.reduce((s, r) => s + r.done, 0);
    expect(rowsDone).toBe(res.kpi.completed);
  }, 30_000);
});

describe("6. 雙向窄道", () => {
  it("兩頭對向開進同一條雙向窄道: 不會同時有反方向的車在裡面", () => {
    // 左右各一個單向的環, 中間一條 30 公尺的雙向窄道
    const L = new Layout()
      .point("J1", 0, 0)
      .point("A1", -5, 5)
      .station("SL", -15, 5)
      .point("A2", -15, -5)
      .point("A3", -5, -5)
      .point("K1", 10, 0)
      .point("K2", 20, 0)
      .point("J2", 30, 0)
      .point("B1", 35, 5)
      .station("SR", 45, 5)
      .point("B2", 45, -5)
      .point("B3", 35, -5)
      .standby("SBL", -20, -5)
      .standby("SBL2", -25, -5)
      .standby("SBR", 50, -5)
      .standby("SBR2", 55, -5)
      .chain(["J1", "A1", "SL", "A2", "A3", "J1"], "one-way")
      .chain(["J1", "K1", "K2", "J2"])
      .chain(["J2", "B1", "SR", "B2", "B3", "J2"], "one-way")
      .chain(["A2", "SBL", "SBL2"])
      .chain(["B2", "SBR", "SBR2"]);
    const input = L.input({
      vehicles: [{ count: 4 }],
      demand: [
        { from: "SL", to: "SR", perHour: 40 },
        { from: "SR", to: "SL", perHour: 40 },
      ],
      durationH: 4,
    });
    const sim = new Simulator(input, { trace: false });
    let opposite = 0;
    let inside = 0;
    const errors: string[] = [];
    let last = new Map<string, number>();
    const res = sim.runWithHook((s) => {
      if (errors.length < 5) errors.push(...s.checkInvariants());
      const now = new Map<string, number>();
      const dirs = new Set<number>();
      for (const v of s.snapshot()) {
        if (v.pos.x <= 0.5 || v.pos.x >= 29.5 || Math.abs(v.pos.y) > 1e-6) continue;
        now.set(v.name, v.pos.x);
        const prev = last.get(v.name);
        if (prev !== undefined && prev !== v.pos.x) dirs.add(Math.sign(v.pos.x - prev));
      }
      if (now.size) inside++;
      if (dirs.size > 1) opposite++;
      last = now;
    });
    expect(errors).toEqual([]);
    expect(res.deadlock).toBeNull();
    expect(inside).toBeGreaterThan(1000);
    expect(opposite).toBe(0);
    expect(res.kpi.completed).toBeGreaterThan(100);
  }, 30_000);
});

describe("7. 路口淨空", () => {
  it("8 字形中間的路口兩股車流交叉: 不會有車停在路口上等", () => {
    const L = new Layout()
      .point("X", 0, 0)
      .point("R1", 10, 10)
      .point("R2", 20, 0)
      .station("P", 10, -10, 20, 20, "pick")
      .point("L1", -10, 10)
      .point("L2", -20, 0)
      .station("D", -10, -10, 20, 20, "drop")
      .chain(["X", "R1", "R2", "P", "X", "L1", "L2", "D", "X"], "one-way");
    const sb = ["S1", "S2", "S3", "S4", "S5"];
    sb.forEach((id, i) => L.standby(id, 20 + 4 * (i + 1), 0));
    L.chain(["R2", ...sb]);
    const sim = new Simulator(L.input({ vehicles: [{ count: 5 }], demand: [{ from: "P", to: "D", perHour: 200 }], durationH: 4 }), { trace: false });
    let onJunction = 0;
    const errors: string[] = [];
    const res = sim.runWithHook((s) => {
      if (errors.length < 5) errors.push(...s.checkInvariants());
      for (const v of s.snapshot()) if (v.waiting && v.held.includes("zone X")) onJunction++;
    });
    expect(errors).toEqual([]);
    expect(res.deadlock).toBeNull();
    expect(onJunction).toBe(0);
    expect(res.kpi.completed).toBeGreaterThan(300);
  }, 30_000);
});

describe("需求表", () => {
  it("時段: 08:00 開始模擬, 09:00~10:00 的需求只在第 2 個小時產生", () => {
    const L = new Layout().standby("S", -10, 0).station("A", 0, 0).station("B", 20, 0).chain(["S", "A", "B"]);
    const res = runSimulation(L.input({ demand: [{ from: "A", to: "B", perHour: 30, start: "09:00", end: "10:00" }], durationH: 3 }), {
      trace: false,
    });
    expect(res.loads.length).toBeGreaterThan(10);
    for (const l of res.loads) {
      expect(l.created).toBeGreaterThanOrEqual(3600);
      expect(l.created).toBeLessThan(7200);
    }
    expect(Math.abs(res.kpi.demandPerHour - 10)).toBeLessThan(0.01); // 3 小時裡 1 小時有 30 板
  });

  it("取貨站暫存滿了產線就停: 等著被取走的板數不會超過上限, 記得到停等時間", () => {
    const L = new Layout().standby("S", -10, 0).station("A", 0, 0, 30, 30, "pick", 2).station("B", 40, 0, 30, 30, "drop").chain(["S", "A", "B"]);
    const res = runSimulation(L.input({ demand: [{ from: "A", to: "B", perHour: 120, mode: "fixed" }], durationH: 4 }), { trace: false });
    expect(res.kpi.lineStopCount).toBeGreaterThan(0);
    expect(res.kpi.lineStopSec).toBeGreaterThan(3600);
    // 任何時間點, 產生了還沒取走的板數最多 2
    const events = res.loads.flatMap((l) => [
      { t: l.created, d: 1 },
      { t: l.pickDone >= 0 ? l.pickDone : Infinity, d: -1 },
    ]);
    events.sort((a, b) => a.t - b.t || a.d - b.d);
    let waiting = 0;
    for (const e of events) {
      waiting += e.d;
      expect(waiting).toBeLessThanOrEqual(2);
    }
    expect(res.stations.find((s) => s.nodeId === "A")!.lineStops).toBe(res.kpi.lineStopCount);
  });

  it("群組: 放貨分散到群組裡沒有車在用的站點", () => {
    const L = new Layout()
      .standby("S1", -10, 0)
      .standby("S2", -12, 0)
      .station("A", 0, 0, 10, 10, "pick")
      .point("M", 10, 0)
      .station("G1", 20, 5, 60, 60, "drop")
      .station("G2", 20, -5, 60, 60, "drop")
      .chain(["S2", "S1", "A", "M"])
      .path("M", "G1")
      .path("M", "G2")
      .group("G", ["G1", "G2"]);
    const res = runSimulation(L.input({ vehicles: [{ count: 2 }], demand: [{ from: "A", to: "G", perHour: 60, mode: "fixed" }], durationH: 2 }), {
      trace: false,
    });
    const used = new Set(res.loads.filter((l) => l.dropDone >= 0).map((l) => l.to));
    expect(used.has("G1") && used.has("G2")).toBe(true);
  });
});

describe("仿倉庫的地圖", () => {
  it("10 台車跑 8 小時: 不會卡死, 5 秒內算完", () => {
    const t0 = Date.now();
    const { res, errors } = runChecked(warehouse({ vehicles: 10 }), 20);
    expect(errors).toEqual([]);
    expect(res.deadlock).toBeNull();
    expect(res.kpi.completed).toBeGreaterThan(300);
    expect(Date.now() - t0).toBeLessThan(5000 * 3); // 每 20 步檢查一次狀態也算進去
    const plain = runSimulation(warehouse({ vehicles: 10 }));
    expect(plain.wallMs).toBeLessThan(5000);
  }, 60_000);
});
