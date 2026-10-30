import { describe, expect, it } from "vitest";
import { devicePlacements } from "../devicePlacement";
import { PALLET_OFFSET } from "../dimensions";

const loc = (locationId: string, x: number, y: number, areaType: string) => ({ locationId, x, y, areaType });

describe("devicePlacements", () => {
  it("只挑設備類的地點", () => {
    const out = devicePlacements([loc("1", 0, 0, "EXTRA"), loc("2", 1, 0, "STORAGE"), loc("3", 2, 0, "CHARGING")], []);
    expect(out.map((d) => [d.locationId, d.kind])).toEqual([
      ["2", "STORAGE"],
      ["3", "CHARGING"],
    ]);
  });

  it("開口朝相連的點, 貨放在站點往後 PALLET_OFFSET (車停在站點時棧板的位置)", () => {
    // 路從 (0, 0) 往東接到貨架 (5, 0): 開口朝西, 貨在站點再往東
    const [d] = devicePlacements([loc("9", 5, 0, "STORAGE")], [{ x1: 0, y1: 0, x2: 5, y2: 0 }]);
    expect(d.yaw).toBeCloseTo(Math.PI);
    expect(d.x).toBeCloseTo(5 + PALLET_OFFSET);
    expect(d.y).toBeCloseTo(0);

    // 路的方向反過來存也一樣
    const [e] = devicePlacements([loc("9", 5, 0, "STACK")], [{ x1: 5, y1: 0, x2: 5, y2: -3 }]);
    expect(e.yaw).toBeCloseTo(-Math.PI / 2);
    expect(e.y).toBeCloseTo(PALLET_OFFSET);
  });

  it("沒接路線的站點開口朝南, 貨就在站點上", () => {
    const [d] = devicePlacements([loc("9", 3, 4, "CONVEYOR")], [{ x1: 0, y1: 0, x2: 1, y2: 0 }]);
    expect(d).toMatchObject({ x: 3, y: 4, yaw: -Math.PI / 2 });
  });

  it("捲門、門前等待點在路上: 就放在點位上, yaw 是路的方向", () => {
    const [g, w] = devicePlacements([loc("G", 5, 0, "LIFT_GATE"), loc("W", 0, 0, "GATE_WAIT_POINT")], [{ x1: 0, y1: 0, x2: 5, y2: 0 }]);
    expect(g).toMatchObject({ kind: "LIFT_GATE", x: 5, y: 0 });
    expect(g.yaw).toBeCloseTo(Math.PI);
    expect(w).toMatchObject({ kind: "GATE_WAIT_POINT", x: 0, y: 0, yaw: 0 });
  });
});
