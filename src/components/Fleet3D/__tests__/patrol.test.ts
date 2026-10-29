import { describe, expect, it } from "vitest";
import { PATROL_DWELL_MS, PATROL_PAUSE_MS, PATROL_TOUR_MS, Patrol } from "../patrol";

describe("Patrol", () => {
  it("新的告警馬上飛過去; 告警沒了回全景", () => {
    const p = new Patrol();
    expect(p.step([], 0)).toBeNull();
    expect(p.step(["a"], 100)).toEqual({ kind: "follow", id: "a" });
    expect(p.step(["a"], 200)).toBeNull();
    expect(p.step([], 300)).toEqual({ kind: "overview" });
    expect(p.step([], 400)).toBeNull();
  });

  it("好幾台都有告警時輪流看, 有新的先看新的", () => {
    const p = new Patrol();
    p.step(["a", "b"], 0);
    expect(p.current).toBe("a");
    expect(p.step(["a", "b"], PATROL_DWELL_MS - 1)).toBeNull();
    expect(p.step(["a", "b"], PATROL_DWELL_MS)).toEqual({ kind: "follow", id: "b" });
    expect(p.step(["a", "b", "c"], PATROL_DWELL_MS + 10)).toEqual({ kind: "follow", id: "c" });
    // 正在看的那台告警沒了: 換下一台還有告警的
    expect(p.step(["a", "b"], PATROL_DWELL_MS + 20)).toEqual({ kind: "follow", id: "a" });
  });

  it("使用者自己操作後先停一陣子, 停的時候冒出來的告警之後照樣會輪到", () => {
    const p = new Patrol();
    p.step(["a"], 0);
    p.pause(1000);
    expect(p.step([], 2000)).toBeNull();
    expect(p.step(["b"], 3000)).toBeNull();
    // 暫停結束: a 的告警已經沒了, 改看 b
    expect(p.step(["b"], 1000 + PATROL_PAUSE_MS)).toEqual({ kind: "follow", id: "b" });
  });

  it("沒有告警時全景、各區域輪流看; 有告警先看車, 告警沒了回全景再重新輪", () => {
    const p = new Patrol();
    const T = PATROL_TOUR_MS;
    expect(p.step([], 0, 2)).toBeNull();
    expect(p.step([], T - 1, 2)).toBeNull();
    expect(p.step([], T, 2)).toEqual({ kind: "area", index: 0 });
    expect(p.step([], 2 * T, 2)).toEqual({ kind: "area", index: 1 });
    expect(p.step([], 3 * T, 2)).toEqual({ kind: "overview" });
    expect(p.step([], 4 * T, 2)).toEqual({ kind: "area", index: 0 });
    expect(p.step(["a"], 4 * T + 10, 2)).toEqual({ kind: "follow", id: "a" });
    expect(p.step(["a"], 6 * T, 2)).toBeNull();
    expect(p.step([], 6 * T + 10, 2)).toEqual({ kind: "overview" });
    expect(p.step([], 7 * T, 2)).toBeNull();
    expect(p.step([], 7 * T + 10, 2)).toEqual({ kind: "area", index: 0 });
  });

  it("沒有區域就停在全景; 區域變少了從全景重新輪", () => {
    const p = new Patrol();
    p.step([], 0, 0);
    expect(p.step([], 10 * PATROL_TOUR_MS, 0)).toBeNull();
    const q = new Patrol();
    q.step([], 0, 3);
    q.step([], PATROL_TOUR_MS, 3);
    q.step([], 2 * PATROL_TOUR_MS, 3);
    expect(q.step([], 3 * PATROL_TOUR_MS, 2)).toEqual({ kind: "overview" });
  });
});
