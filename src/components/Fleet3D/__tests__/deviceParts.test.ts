import { describe, expect, it } from "vitest";
import * as THREE from "three";
import type { CargoInfo } from "@/sockets/useCargoInfo";
import { Lift_Gate_Status } from "@/types/peripheral";
import type { Conveyor_Info, Elevator_Info, Lift_Gate_Info, Package_Info, Stack_Info } from "@/types/peripheral";
import type { DevicePlacement } from "../devicePlacement";
import { PackageText, chargerParts, conveyorParts, elevatorParts, liftGateParts, packageParts, stackParts, storageParts } from "../deviceParts";
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

  it("電梯的訊號: 滾筒在轉閃滾筒、手動閃側框、雷射感應到閃雷射; 都沒有就不閃", () => {
    const at = (info: Partial<Elevator_Info>) => elevatorParts(placement("ELEVATOR"), { forkHeight: 600, cargo: [], ...info } as unknown as Elevator_Info).blinks;
    const colors = (info: Partial<Elevator_Info>) => [...new Set(at(info).map((b) => b.color))];
    expect(at({})).toEqual([]);
    expect(colors({ isRunning: true })).toEqual(["#faad14"]);
    expect(colors({ isManualMode: true })).toEqual(["#eb2f96"]);
    expect(colors({ hasCargoSignal: true })).toEqual(["#ff2d2d"]);
    expect(at({ isRunning: true, isManualMode: true, hasCargoSignal: true, disable: true })).toEqual([]);
  });
});

describe("deviceParts: 派車選點位 (同 2D 的規則)", () => {
  it("貨架: 取貨要有貨、放貨要是空的, 停用的層都不能選; 名稱去掉最後一段 (同 2D)", () => {
    const info = { name: "A", layer: { 1: { ...level(0, 1), levelName: "A-01-1" }, 2: level(1200, 0), 3: level(2400, 1, true) } } as unknown as CargoInfo;
    const picks = storageParts(placement("STORAGE"), info).hits.map((h) => h.pick);
    expect(picks.map((p) => [p?.load, p?.offload])).toEqual([
      [true, false],
      [false, true],
      [false, false],
    ]);
    expect(picks[0]).toMatchObject({ locationId: "L1", columnName: "A-01", level: 1 });
  });

  it("堆疊: 有貨能取、沒滿 (3 板) 能放; 還沒收到資料不能選", () => {
    const pick = (n: number, disable = false) =>
      stackParts(placement("STACK"), { name: "K", cargo: Array.from({ length: n }, () => ({})), disable } as unknown as Stack_Info).hits[0].pick;
    expect([pick(0)?.load, pick(0)?.offload]).toEqual([false, true]);
    expect([pick(3)?.load, pick(3)?.offload]).toEqual([true, false]);
    expect([pick(1, true)?.load, pick(1, true)?.offload]).toEqual([false, false]);
    expect(stackParts(placement("STACK"), undefined).hits[0].pick).toBeUndefined();
  });

  it("充電站點了打開充電站控制, 不能當取放貨點", () => {
    const [hit] = chargerParts(placement("CHARGING"), undefined).hits;
    expect(hit).toMatchObject({ charger: "L1" });
    expect(hit.pick).toBeUndefined();
  });
});

describe("deviceParts: 捲門", () => {
  const gate = (status: Lift_Gate_Status | undefined) =>
    liftGateParts(placement("LIFT_GATE"), status ? ({ name: "G", status, disable: false } as Lift_Gate_Info) : undefined, "G");
  /** 門簾 (淺灰的那些片) 從多高放到多低 */
  const curtainBottom = (status: Lift_Gate_Status | undefined) => {
    const slats = gate(status).frames.filter((f) => f.color === "#c3cad2");
    if (!slats.length) return null;
    return Math.min(...slats.map((f) => at(f.matrix).y - new THREE.Vector3().setFromMatrixScale(f.matrix).y / 2));
  };

  it("關著門簾放到底, 開著捲上去, 開關中停一半", () => {
    expect(curtainBottom(Lift_Gate_Status.CLOSED)).toBeLessThan(0.05);
    expect(curtainBottom(Lift_Gate_Status.OPENED)).toBeNull();
    expect(curtainBottom(Lift_Gate_Status.OPENING)).toBeCloseTo(1.5, 1);
  });

  it("異常整片門簾閃紅, 開關中狀態燈閃, 平常不閃; 只有滑過去的說明, 不擋點位的點擊", () => {
    expect(gate(Lift_Gate_Status.E_STOP).blinks.some((b) => b.color === "#ff4d4f" && new THREE.Vector3().setFromMatrixScale(b.matrix).y > 1)).toBe(true);
    expect(gate(Lift_Gate_Status.CLOSING).blinks.map((b) => b.color)).toEqual(["#faad14", "#faad14"]);
    expect(gate(Lift_Gate_Status.CLOSED).blinks).toEqual([]);
    const p = gate(Lift_Gate_Status.OPENED);
    expect(p.hits).toEqual([]);
    expect(p.tips.map((t) => t.label)).toEqual(["G"]);
  });

  it("門簾橫跨路: 路往東時門簾沿著南北", () => {
    const slat = gate(Lift_Gate_Status.CLOSED).frames.find((f) => f.color === "#c3cad2")!;
    const box = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(), new THREE.Vector3(1, 1, 1)).applyMatrix4(slat.matrix);
    const size = box.getSize(new THREE.Vector3());
    expect(size.z).toBeGreaterThan(2.5);
    expect(size.x).toBeLessThan(0.1);
  });
});

describe("deviceParts: 包膜線", () => {
  const text: PackageText = { entry: (n) => `入口 ${n}`, exit: (n) => `出口 ${n}`, registered: (n) => `登記 ${n}` };
  const entry: DevicePlacement = { locationId: "IN", kind: "PACKAGE_IN", x: 0, y: 0, yaw: Math.PI };
  const exit: DevicePlacement = { locationId: "OUT", kind: "PACKAGE_OUT", x: 6, y: 0, yaw: 0 };
  const info = (over: Partial<Package_Info> = {}) =>
    ({ name: "P", locationId: "IN", disable: false, capacity: 3, cargo: [{}], forkHeight: 600, lamps: [true, false, null, true], ...over }) as unknown as Package_Info;

  it("入口到出口一整條, 亮著的感測燈位置放貨 (沿線平均排), 台面在對接高度", () => {
    const p = packageParts(entry, exit, info(), info({ locationId: "OUT", name: "Q" }), text);
    expect(p.pallets.map((x) => Number(at(x.matrix).x.toFixed(2)))).toEqual([0, 6]);
    expect(ys(p.pallets)).toEqual([0.6, 0.6]);
    expect(p.lights.filter((l) => l.color === "#52c41a" || l.color === "#3a3f45" || l.color === "#9aa0a6").length).toBeGreaterThanOrEqual(4);
  });

  it("入口能放 (還沒滿), 出口能取 (有登記的貨); 滿了入口就不能放", () => {
    const p = packageParts(entry, exit, info(), info({ locationId: "OUT", name: "Q" }), text);
    expect(p.hits.map((h) => [h.target?.locationId, h.pick?.load, h.pick?.offload])).toEqual([
      ["IN", false, true],
      ["OUT", true, false],
    ]);
    expect(p.hits[0].label).toBe("入口 P · 登記 1");
    const full = packageParts(entry, exit, info({ cargo: [{}, {}, {}] } as Partial<Package_Info>), info({ locationId: "OUT" }), text);
    expect(full.hits[0].pick?.offload).toBe(false);
  });

  it("沒配對的入口只畫一小段, 不畫感測燈的貨", () => {
    const p = packageParts(entry, null, info(), undefined, text);
    expect(p.pallets).toEqual([]);
    expect(p.hits.map((h) => h.target?.locationId)).toEqual(["IN"]);
  });
});
