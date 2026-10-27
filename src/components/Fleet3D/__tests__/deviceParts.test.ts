import { describe, expect, it } from "vitest";
import * as THREE from "three";
import type { CargoInfo } from "@/sockets/useCargoInfo";
import type { Conveyor_Info, Elevator_Info, Stack_Info } from "@/types/peripheral";
import type { DevicePlacement } from "../devicePlacement";
import { conveyorParts, elevatorParts, stackParts, storageParts } from "../deviceParts";
import { LOAD_HEIGHT } from "../dimensions";

const at = (m: THREE.Matrix4) => new THREE.Vector3().setFromMatrixPosition(m);
const ys = (items: { matrix: THREE.Matrix4 }[]) => items.map((i) => Number(at(i.matrix).y.toFixed(3)));

const placement = (kind: DevicePlacement["kind"], yaw = 0): DevicePlacement => ({ locationId: "L1", kind, x: 2, y: 3, yaw });

const level = (height: number | undefined, cargo: number, disable = false) => ({
  levelName: `${height}`,
  cargo: Array.from({ length: cargo }, () => ({})),
  disable,
  booker: null,
  height,
});

describe("deviceParts", () => {
  it("貨架: 每一層照後端的層高 (mm), 有貨的層放一板, 停用的層橫樑變灰, 每一層各自點得到", () => {
    const info = { name: "A-01", layer: { 1: level(0, 1), 2: level(1200, 0), 3: level(2400, 1, true) } } as unknown as CargoInfo;
    const p = storageParts(placement("STORAGE"), info);

    expect(ys(p.pallets)).toEqual([0, 2.4]);
    const beams = p.frames.filter((f) => f.color !== "#2f5d9a");
    // 第一層在地上不用橫樑, 其他每層前後兩根
    expect(ys(beams)).toEqual([1.15, 1.15, 2.35, 2.35]);
    expect(beams.map((b) => b.color)).toEqual(["#e8862a", "#e8862a", "#9aa0a6", "#9aa0a6"]);
    expect(p.hits.map((h) => h.target)).toEqual([
      { type: "STORAGE", locationId: "L1", level: 1 },
      { type: "STORAGE", locationId: "L1", level: 2 },
      { type: "STORAGE", locationId: "L1", level: 3 },
    ]);
    // 立柱比最上面那板貨高
    expect(Math.max(...p.frames.map((f) => new THREE.Vector3().setFromMatrixScale(f.matrix).y))).toBeGreaterThan(2.4 + LOAD_HEIGHT);
  });

  it("貨架: 沒有層高 (舊資料) 一層 1.2m; 還沒收到資料也有架子可以點", () => {
    const info = { layer: { 1: level(undefined, 0), 2: level(undefined, 1) } } as unknown as CargoInfo;
    expect(ys(storageParts(placement("STORAGE"), info).pallets)).toEqual([1.2]);
    const empty = storageParts(placement("STORAGE"), undefined);
    expect(empty.frames.length).toBe(4);
    expect(empty.hits.map((h) => h.target)).toEqual([{ type: "STORAGE", locationId: "L1" }]);
  });

  it("設備座標 +x 朝路: 轉到 yaw 的方向 (ROS 逆時針), 世界座標 z = -ROS y", () => {
    const info = { layer: { 1: level(0, 1) } } as unknown as CargoInfo;
    // 開口朝北 (+y): 貨架前面的立柱在北邊
    const p = storageParts(placement("STORAGE", Math.PI / 2), info);
    expect(at(p.pallets[0].matrix).toArray().map((v) => Number(v.toFixed(3)))).toEqual([2, 0, -3]);
    const zs = p.frames.map((f) => Number(at(f.matrix).z.toFixed(3)));
    expect(Math.min(...zs)).toBeCloseTo(-3 - 0.55);
    expect(Math.max(...zs)).toBeCloseTo(-3 + 0.55);
  });

  it("堆疊: 有幾板疊幾板", () => {
    const info = { name: "K", cargo: [{}, {}, {}], disable: false } as unknown as Stack_Info;
    expect(ys(stackParts(placement("STACK"), info).pallets)).toEqual([0, LOAD_HEIGHT, 2 * LOAD_HEIGHT].map((v) => Number(v.toFixed(3))));
  });

  it("輸送帶 / 電梯: 貨在對接高度 (forkHeight, mm)", () => {
    const conveyor = { forkHeight: 700, cargo: [{}] } as unknown as Conveyor_Info;
    expect(ys(conveyorParts(placement("CONVEYOR"), conveyor).pallets)).toEqual([0.7]);
    // 沒設對接高度用 0.5m
    expect(ys(conveyorParts(placement("CONVEYOR"), { cargo: [{}] } as unknown as Conveyor_Info).pallets)).toEqual([0.5]);

    const elevator = { forkHeight: 1500, cargo: [], hasCargoSignal: true } as unknown as Elevator_Info;
    expect(ys(elevatorParts(placement("ELEVATOR"), elevator).pallets)).toEqual([1.5]);
  });
});
