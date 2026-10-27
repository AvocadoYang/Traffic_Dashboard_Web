import * as THREE from "three";
import type { CargoInfo } from "@/sockets/useCargoInfo";
import type { Charge_Status_Info } from "@/sockets/useChargeStationSocket";
import type { CargoPanelTarget } from "@/components/CargoPanel/state";
import type { Conveyor_Info, Elevator_Info, Stack_Info } from "@/types/peripheral";
import type { DevicePlacement } from "./devicePlacement";
import { CARTON_SIZE, LOAD_HEIGHT, PALLET_HEIGHT } from "./dimensions";

/**
 * 3D 設備的零件 (框架、棧板、紙箱、燈、點選用的盒子) 擺在哪, 給 Devices3D 一類一個 InstancedMesh 畫。
 *
 * 設備座標: 原點在貨放的地方 (地面), +x 朝路 (叉車從這邊把牙叉伸進來), y 朝上。
 */

const RACK_POST = "#2f5d9a";
const RACK_BEAM = "#e8862a";
const STEEL = "#7d8794";
const ROLLER = "#c3c9cf";
const PLATFORM = "#a0aab4";
const CHARGER = "#dde1e5";
const FLOOR_TAPE = "#f2c230";
const DISABLED = "#9aa0a6";
const LIGHT = { ok: "#52c41a", busy: "#faad14", booked: "#1890ff", off: "#8c8c8c" };

/** 沒有層高 (舊資料) 時一層多高 (公尺) */
const DEFAULT_LEVEL_GAP = 1.2;
/** 輸送帶沒設對接高度時的高度 */
const DEFAULT_CONVEYOR_HEIGHT = 0.5;

export type Item = { matrix: THREE.Matrix4; color?: string };
/** 點選用的盒子: 點了打開哪個貨物面板, 滑過去顯示什麼, 標籤放哪 */
export type Hit = { matrix: THREE.Matrix4; target: CargoPanelTarget; label: string; top: THREE.Vector3 };
export type Parts = { frames: Item[]; pallets: Item[]; cartons: Item[]; lights: Item[]; hits: Hit[] };

const emptyParts = (): Parts => ({ frames: [], pallets: [], cartons: [], lights: [], hits: [] });
export const merge = (list: Parts[]): Parts => ({
  frames: list.flatMap((p) => p.frames),
  pallets: list.flatMap((p) => p.pallets),
  cartons: list.flatMap((p) => p.cartons),
  lights: list.flatMap((p) => p.lights),
  hits: list.flatMap((p) => p.hits),
});

const Q = new THREE.Quaternion();
const AXIS_Y = new THREE.Vector3(0, 1, 0);

/** 設備座標的一個盒子 (中心、大小) -> 世界矩陣 */
const place = (d: DevicePlacement, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => {
  const c = Math.cos(d.yaw);
  const s = Math.sin(d.yaw);
  const position = new THREE.Vector3(d.x + x * c + z * s, y, -d.y - x * s + z * c);
  return new THREE.Matrix4().compose(position, Q.setFromAxisAngle(AXIS_Y, d.yaw), new THREE.Vector3(sx, sy, sz));
};

/** 一板貨 (棧板 + 紙箱), 底部在 y */
const addLoad = (p: Parts, d: DevicePlacement, y: number) => {
  p.pallets.push({ matrix: place(d, 0, y, 0) });
  p.cartons.push({ matrix: place(d, 0, y + PALLET_HEIGHT + CARTON_SIZE[1] / 2, 0, ...CARTON_SIZE) });
};

const addHit = (p: Parts, d: DevicePlacement, box: [number, number, number, number, number, number], target: CargoPanelTarget, label: string) => {
  const [x, y, z, sx, sy, sz] = box;
  const top = new THREE.Vector3().setFromMatrixPosition(place(d, x, y + sy / 2 + 0.25, z));
  p.hits.push({ matrix: place(d, x, y, z, sx, sy, sz), target, label, top });
};

/** 貨架: 四根立柱, 每一層前後兩根橫樑 (第一層在地上就不用), 有貨的層放一板貨 */
export const storageParts = (d: DevicePlacement, info: CargoInfo | undefined): Parts => {
  const p = emptyParts();
  const DEPTH = 1.1;
  const WIDTH = 1.3;
  const levels = Object.entries(info?.layer ?? {})
    .map(([level, l]) => ({
      level: Number(level),
      // 後端每一層有 height (mm, 就是叉車取放這一層的牙叉高度), 前端的型別沒寫
      height: (l as { height?: number }).height,
      hasCargo: (l.cargo?.length ?? 0) > 0,
      disable: !!l.disable,
      name: l.levelName,
    }))
    .sort((a, b) => a.level - b.level)
    .map((l, i) => ({ ...l, y: l.height && l.height > 0 ? l.height / 1000 : i * DEFAULT_LEVEL_GAP }));
  const top = Math.max(1.2, ...levels.map((l) => l.y + LOAD_HEIGHT + 0.2));
  for (const x of [-DEPTH / 2, DEPTH / 2]) {
    for (const z of [-WIDTH / 2, WIDTH / 2]) p.frames.push({ matrix: place(d, x, top / 2, z, 0.08, top, 0.08), color: RACK_POST });
  }
  levels.forEach((l, i) => {
    if (l.y > 0.05) {
      for (const x of [-DEPTH / 2, DEPTH / 2]) {
        p.frames.push({ matrix: place(d, x, l.y - 0.05, 0, 0.07, 0.1, WIDTH), color: l.disable ? DISABLED : RACK_BEAM });
      }
    }
    if (l.hasCargo) addLoad(p, d, l.y);
    const next = levels[i + 1]?.y ?? top;
    const h = Math.max(0.2, next - l.y);
    addHit(p, d, [0, l.y + h / 2, 0, DEPTH, h, WIDTH], { type: "STORAGE", locationId: d.locationId, level: l.level }, [info?.name, l.name].filter(Boolean).join(" "));
  });
  if (!levels.length) addHit(p, d, [0, top / 2, 0, DEPTH, top, WIDTH], { type: "STORAGE", locationId: d.locationId }, info?.name ?? d.locationId);
  return p;
};

/** 堆疊: 地上貼一圈線, 有幾板就疊幾板 */
export const stackParts = (d: DevicePlacement, info: Stack_Info | undefined): Parts => {
  const p = emptyParts();
  const SIZE = 1.2;
  const color = info?.disable ? DISABLED : FLOOR_TAPE;
  for (const s of [-1, 1]) {
    p.frames.push({ matrix: place(d, (s * SIZE) / 2, 0.005, 0, 0.05, 0.01, SIZE), color });
    p.frames.push({ matrix: place(d, 0, 0.005, (s * SIZE) / 2, SIZE, 0.01, 0.05), color });
  }
  const n = info?.cargo?.length ?? 0;
  for (let i = 0; i < n; i++) addLoad(p, d, i * LOAD_HEIGHT);
  const h = Math.max(0.3, n * LOAD_HEIGHT);
  addHit(p, d, [0, h / 2, 0, SIZE, h, SIZE], { type: "STACK", locationId: d.locationId }, info?.name ?? d.locationId);
  return p;
};

/** 輸送帶: 台面在對接高度, 往路的反方向延伸 */
export const conveyorParts = (d: DevicePlacement, info: Conveyor_Info | undefined): Parts => {
  const p = emptyParts();
  const h = info?.forkHeight && info.forkHeight > 0 ? info.forkHeight / 1000 : DEFAULT_CONVEYOR_HEIGHT;
  const LENGTH = 2.2;
  const WIDTH = 1.1;
  const cx = 0.6 - LENGTH / 2;
  const frame = info?.disable ? DISABLED : STEEL;
  for (const z of [-WIDTH / 2, WIDTH / 2]) {
    p.frames.push({ matrix: place(d, cx, h - 0.08, z, LENGTH, 0.12, 0.06), color: frame });
    if (h > 0.25) {
      for (const x of [cx - LENGTH / 2 + 0.05, cx + LENGTH / 2 - 0.05]) {
        p.frames.push({ matrix: place(d, x, (h - 0.14) / 2, z, 0.06, h - 0.14, 0.06), color: frame });
      }
    }
  }
  for (let x = cx - LENGTH / 2 + 0.09; x < cx + LENGTH / 2; x += 0.18) {
    p.frames.push({ matrix: place(d, x, h - 0.04, 0, 0.06, 0.06, WIDTH - 0.06), color: ROLLER });
  }
  if ((info?.cargo?.length ?? 0) > 0) addLoad(p, d, h);
  const light = info?.disable ? LIGHT.off : info?.activeLoad || info?.activeOffload ? LIGHT.busy : LIGHT.ok;
  p.lights.push({ matrix: place(d, cx - LENGTH / 2 + 0.1, h + 0.1, WIDTH / 2, 0.1, 0.1, 0.1), color: light });
  addHit(p, d, [cx, (h + 0.4) / 2, 0, LENGTH, h + 0.4, WIDTH], { type: "CONVEYOR", locationId: d.locationId }, info?.name ?? d.locationId);
  return p;
};

/** 電梯: 籠子 + 平台 (在對接高度), 上面一顆燈 */
export const elevatorParts = (d: DevicePlacement, info: Elevator_Info | undefined): Parts => {
  const p = emptyParts();
  const HEIGHT = 3.2;
  const HALF = 0.75;
  const h = info?.forkHeight && info.forkHeight > 0 ? info.forkHeight / 1000 : 0;
  const frame = info?.disable ? DISABLED : STEEL;
  for (const x of [-HALF, HALF]) {
    for (const z of [-HALF, HALF]) p.frames.push({ matrix: place(d, x, HEIGHT / 2, z, 0.08, HEIGHT, 0.08), color: frame });
    p.frames.push({ matrix: place(d, x, HEIGHT, 0, 0.08, 0.08, HALF * 2), color: frame });
  }
  for (const z of [-HALF, HALF]) p.frames.push({ matrix: place(d, 0, HEIGHT, z, HALF * 2, 0.08, 0.08), color: frame });
  p.frames.push({ matrix: place(d, 0, Math.max(0.02, h - 0.04), 0, HALF * 2 - 0.1, 0.08, HALF * 2 - 0.1), color: PLATFORM });
  if ((info?.cargo?.length ?? 0) > 0 || info?.hasCargoSignal) addLoad(p, d, h);
  const light = info?.disable ? LIGHT.off : info?.isRunning ? LIGHT.busy : info?.isManualMode ? LIGHT.booked : LIGHT.ok;
  p.lights.push({ matrix: place(d, 0, HEIGHT + 0.1, 0, 0.18, 0.12, 0.18), color: light });
  addHit(p, d, [0, HEIGHT / 2, 0, HALF * 2, HEIGHT, HALF * 2], { type: "ELEVATOR", locationId: d.locationId }, info?.name ?? d.locationId);
  return p;
};

/** 充電站: 車後面一個櫃子, 頂上的燈: 充電中綠、有車預約藍、連不上灰 */
export const chargerParts = (d: DevicePlacement, info: Charge_Status_Info | undefined): Parts => {
  const p = emptyParts();
  p.frames.push({ matrix: place(d, -0.75, 0.55, 0, 0.45, 1.1, 0.6), color: info?.disable ? DISABLED : CHARGER });
  const connected = !info || info.isTCPConnect || info.isMQTTConnect;
  const light = !connected ? LIGHT.off : info?.barOut === "1" ? LIGHT.ok : info?.booker ? LIGHT.booked : "#d9d9d9";
  p.lights.push({ matrix: place(d, -0.75, 1.13, 0, 0.14, 0.06, 0.14), color: light });
  return p;
};
