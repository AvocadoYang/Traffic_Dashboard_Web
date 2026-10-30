import { describe, expect, it } from "vitest";
import { CARRY_LIFT } from "@/components/Fleet3D/forkliftRig";
import { TIME_BUCKETS, Trace } from "../../engine/types";
import { forkAt, forkWorkOf } from "../forkTimeline";

const B = Object.fromEntries(TIME_BUCKETS.map((b, i) => [b, i])) as Record<(typeof TIME_BUCKETS)[number], number>;
const LOADED = 0x10;

/** 一台車, 每秒一筆 */
const traceOf = (states: number[]): Trace => ({
  dt: 1,
  count: states.length,
  vehicles: [{ name: "V1", length: 2.4, width: 1.2 }],
  pose: new Float32Array(states.length * 3),
  state: Uint8Array.from(states),
});

describe("forkTimeline", () => {
  // 0-1 空車, 2-5 取貨, 6-7 載貨, 8-11 放貨, 12 空車, 13 閒置
  const states = [
    B.empty, B.empty,
    B.pick, B.pick, B.pick, B.pick,
    B.loaded | LOADED, B.loaded | LOADED,
    B.drop | LOADED, B.drop | LOADED, B.drop | LOADED, B.drop | LOADED,
    B.empty, B.idle,
  ];
  const [work] = forkWorkOf(traceOf(states));
  const at = (t: number) => forkAt(work, t, states[Math.floor(t)]);

  it("找出連續的取貨 / 放貨時段", () => {
    expect(work).toEqual({ start: [2, 8], end: [6, 12], pick: [true, false] });
  });

  it("取貨: 一開始棧板就在牙叉上、牙叉在最低, 中段升起, 結束時在載貨高度", () => {
    expect(at(0)).toEqual({ lift: 0, loaded: false });
    expect(at(2.5)).toEqual({ lift: 0, loaded: true });
    expect(at(4).lift).toBeCloseTo(CARRY_LIFT / 2);
    expect(at(5.9).lift).toBeCloseTo(CARRY_LIFT);
    expect(at(7)).toEqual({ lift: CARRY_LIFT, loaded: true });
  });

  it("放貨: 牙叉降下去, 放完才沒有貨", () => {
    expect(at(8.5)).toEqual({ lift: CARRY_LIFT, loaded: true });
    expect(at(10).lift).toBeCloseTo(CARRY_LIFT / 2);
    expect(at(11.9).loaded).toBe(true);
    expect(at(12.5)).toEqual({ lift: 0, loaded: false });
  });

  it("模擬停在取貨中間 (死結) 時, 時段到軌跡最後為止", () => {
    const [w] = forkWorkOf(traceOf([B.empty, B.pick, B.pick]));
    expect(w).toEqual({ start: [1], end: [3], pick: [true] });
  });
});
