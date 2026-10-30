import { describe, expect, it } from "vitest";
import { GONE_MS, incidentLoadedAt, incidentPoseAt } from "../incidentTimeline";

const vehicle = (samples: [number, number, number, number][], cargo: [number, number][] = []) => ({ amrId: "A", isReal: true, samples, cargo });

describe("incidentTimeline", () => {
  it("兩筆之間插值, 角度走近的那一邊 (350 度到 10 度經過 0 度)", () => {
    const v = vehicle([
      [-1000, 0, 0, 350],
      [0, 2, 4, 10],
    ]);
    expect(incidentPoseAt(v, -500)).toEqual({ x: 1, y: 2, yaw: 360 });
    expect(incidentPoseAt(v, 0)).toEqual({ x: 2, y: 4, yaw: 10 });
  });

  it("還沒出現、離線之後不畫; 最後一筆之後短時間內停在最後的位置", () => {
    const v = vehicle([
      [-1000, 0, 0, 0],
      [0, 1, 0, 0],
    ]);
    expect(incidentPoseAt(v, -1001)).toBeNull();
    expect(incidentPoseAt(v, GONE_MS - 1)).toEqual({ x: 1, y: 0, yaw: 0 });
    expect(incidentPoseAt(v, GONE_MS + 1)).toBeNull();
    expect(incidentPoseAt(vehicle([]), 0)).toBeNull();
  });

  it("載貨照變化的時間點", () => {
    const v = vehicle([[0, 0, 0, 0]], [
      [-60_000, 1],
      [5_000, 0],
    ]);
    expect(incidentLoadedAt(v, -70_000)).toBe(false);
    expect(incidentLoadedAt(v, 0)).toBe(true);
    expect(incidentLoadedAt(v, 6_000)).toBe(false);
  });
});
