import * as THREE from "three";
import type { CargoInfo } from "@/sockets/useCargoInfo";
import type { Charge_Status_Info } from "@/sockets/useChargeStationSocket";
import type { CargoPanelTarget } from "@/components/CargoPanel/state";
import { Lift_Gate_Status, STACK_MAX_LEVEL } from "@/types/peripheral";
import type { Conveyor_Info, Elevator_Info, Lift_Gate_Info, Package_Info, Stack_Info } from "@/types/peripheral";
import { prefixLevelName } from "@/utils/globalFunction";
import type { DevicePlacement } from "./devicePlacement";
import { CARTON_SIZE, LOAD_HEIGHT, PALLET_HEIGHT } from "./dimensions";

/**
 * 3D 設備的零件 (框架、棧板、紙箱、燈、點選用的盒子) 擺在哪, 給 Devices3D 一類一個 InstancedMesh 畫。
 *
 * 設備座標: 原點在貨放的地方 (地面), +x 朝路 (叉車從這邊把牙叉伸進來), y 朝上。
 * 捲門、門前等待點的原點在點位上, +x 是路的方向。
 */

const RACK_POST = "#2f5d9a";
const RACK_BEAM = "#e8862a";
const STEEL = "#7d8794";
const ROLLER = "#c3c9cf";
const ROLLER_TABLE = "#2f7fd1";
const CHARGER = "#dde1e5";
const FLOOR_TAPE = "#f2c230";
const DISABLED = "#9aa0a6";
const SENSOR = "#2b2b2b";
const CURTAIN = "#c3cad2";
const FLAG = "#076aff";
/** 電梯訊號閃的顏色: 滾筒在轉、手動模式、雷射感應到東西 */
const BLINK = { running: "#faad14", manual: "#eb2f96", sensor: "#ff2d2d" };
const LIGHT = { ok: "#52c41a", busy: "#faad14", booked: "#1890ff", off: "#8c8c8c" };
/** 包膜線上的感測燈: 那個位置有東西 / 沒東西 / 沒接訊號 */
const LAMP = { on: "#52c41a", off: "#3a3f45", none: "#9aa0a6" };
/** 捲門狀態燈 (同 2D 的顏色); 異常時整片門簾閃紅 */
const GATE_LIGHT: Record<Lift_Gate_Status, string> = {
  [Lift_Gate_Status.OPENED]: "#52c41a",
  [Lift_Gate_Status.OPENING]: "#1890ff",
  [Lift_Gate_Status.CLOSING]: "#faad14",
  [Lift_Gate_Status.CLOSED]: "#8c8c8c",
  [Lift_Gate_Status.E_STOP]: "#ff4d4f",
  [Lift_Gate_Status.VFD_Alarm]: "#ff4d4f",
  [Lift_Gate_Status.System_Error]: "#ff4d4f",
};
const GATE_FAULTS = [Lift_Gate_Status.E_STOP, Lift_Gate_Status.VFD_Alarm, Lift_Gate_Status.System_Error];

/** 沒有層高 (舊資料) 時一層多高 (公尺) */
const DEFAULT_LEVEL_GAP = 1.2;
/** 輸送帶沒設對接高度時的高度 */
const DEFAULT_CONVEYOR_HEIGHT = 0.5;

export type Item = { matrix: THREE.Matrix4; color?: string };
/** 派車選點位時 (首頁「任務派發」) 這一格能不能當取貨點 / 放貨點、選了填什麼; 規則同 2D 各設備 */
export type Selectable = { load: boolean; offload: boolean; locationId: string; columnName: string; level: number };
/**
 * 點選用的盒子: 滑過去顯示什麼、標籤放哪; 點了打開哪個貨物面板 (target) 或充電站控制 (charger),
 * 派車選點位時能不能選 (pick)
 */
export type Hit = {
  matrix: THREE.Matrix4;
  label: string;
  top: THREE.Vector3;
  target?: CargoPanelTarget;
  charger?: string;
  pick?: Selectable;
};
/**
 * blinks: 一閃一閃的 (狀態訊號), 蓋在對應的零件上。
 * tips: 只有滑過去顯示說明的盒子 (捲門), 點了不做事, 也不擋住底下點位的點擊
 */
export type Parts = { frames: Item[]; pallets: Item[]; cartons: Item[]; lights: Item[]; blinks: Item[]; hits: Hit[]; tips: Hit[] };

const emptyParts = (): Parts => ({ frames: [], pallets: [], cartons: [], lights: [], blinks: [], hits: [], tips: [] });
export const merge = (list: Parts[]): Parts => ({
  frames: list.flatMap((p) => p.frames),
  pallets: list.flatMap((p) => p.pallets),
  cartons: list.flatMap((p) => p.cartons),
  lights: list.flatMap((p) => p.lights),
  blinks: list.flatMap((p) => p.blinks),
  hits: list.flatMap((p) => p.hits),
  tips: list.flatMap((p) => p.tips),
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

type Box = [number, number, number, number, number, number];

const hitBox = (d: DevicePlacement, box: Box, label: string, action: Pick<Hit, "target" | "charger" | "pick">): Hit => {
  const [x, y, z, sx, sy, sz] = box;
  const top = new THREE.Vector3().setFromMatrixPosition(place(d, x, y + sy / 2 + 0.25, z));
  return { matrix: place(d, x, y, z, sx, sy, sz), label, top, ...action };
};

const addHit = (p: Parts, d: DevicePlacement, box: Box, label: string, action: Pick<Hit, "target" | "charger" | "pick">) => {
  p.hits.push(hitBox(d, box, label, action));
};

/** 只能整格選的設備 (堆疊、輸送帶、電梯、包膜線): 第 0 層, 名稱就是設備名稱 */
const wholePick = (locationId: string, name: string, load: boolean, offload: boolean): Selectable => ({
  load,
  offload,
  locationId,
  columnName: name,
  level: 0,
});

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
    // 取貨要有貨、放貨要是空的, 停用的層不能選 (同 2D 的 isLevelSelectable)
    addHit(p, d, [0, l.y + h / 2, 0, DEPTH, h, WIDTH], [info?.name, l.name].filter(Boolean).join(" "), {
      target: { type: "STORAGE", locationId: d.locationId, level: l.level },
      pick: {
        load: !l.disable && l.hasCargo,
        offload: !l.disable && !l.hasCargo,
        locationId: d.locationId,
        columnName: prefixLevelName(l.name),
        level: l.level,
      },
    });
  });
  if (!levels.length) addHit(p, d, [0, top / 2, 0, DEPTH, top, WIDTH], info?.name ?? d.locationId, { target: { type: "STORAGE", locationId: d.locationId } });
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
  addHit(p, d, [0, h / 2, 0, SIZE, h, SIZE], info?.name ?? d.locationId, {
    target: { type: "STACK", locationId: d.locationId },
    pick: info && wholePick(d.locationId, info.name, !info.disable && n > 0, !info.disable && n < STACK_MAX_LEVEL),
  });
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
  const cargo = info?.cargo?.length ?? 0;
  if (cargo > 0) addLoad(p, d, h);
  const light = info?.disable ? LIGHT.off : info?.activeLoad || info?.activeOffload ? LIGHT.busy : LIGHT.ok;
  p.lights.push({ matrix: place(d, cx - LENGTH / 2 + 0.1, h + 0.1, WIDTH / 2, 0.1, 0.1, 0.1), color: light });
  addHit(p, d, [cx, (h + 0.4) / 2, 0, LENGTH, h + 0.4, WIDTH], info?.name ?? d.locationId, {
    target: { type: "CONVEYOR", locationId: d.locationId },
    pick: info && wholePick(d.locationId, info.name, !info.disable && cargo > 0, !info.disable && cargo === 0),
  });
  return p;
};

/**
 * 電梯 (現場是一台滾筒台): 藍色側框、橫在上面一排滾筒, 台面在對接高度;
 * 四隻腳兩兩用橫撐連起來, 腳底有墊片。狀態燈在一個角上。
 *
 * 電梯的 IO (read-right-data / read-left-data, 後端轉成 elevator-info) 對應的零件會閃:
 * 滾筒在轉 (isRunning) 閃滾筒、手動模式 (isManualMode) 閃側框、
 * 滾筒旁的雷射感應到東西 (hasCargoSignal) 閃雷射頭和光束
 */
export const elevatorParts = (placement: DevicePlacement, info: Elevator_Info | undefined): Parts => {
  const p = emptyParts();
  // 整台轉 90 度 (繞著放貨的位置): 滾筒的方向跟叉車進來的方向一樣
  const d = { ...placement, yaw: placement.yaw + Math.PI / 2 };
  const LENGTH = 1.6;
  const WIDTH = 1.2;
  const h = info?.forkHeight && info.forkHeight > 0 ? info.forkHeight / 1000 : DEFAULT_CONVEYOR_HEIGHT;
  const frame = info?.disable ? DISABLED : ROLLER_TABLE;
  const legX = LENGTH / 2 - 0.12;
  const legZ = WIDTH / 2 - 0.05;
  // 側框 (滾筒架在兩條側框中間, 稍微低於滾筒頂)
  const running = !info?.disable && !!info?.isRunning;
  const manual = !info?.disable && !!info?.isManualMode;
  const sensed = !info?.disable && !!info?.hasCargoSignal;
  for (const z of [-WIDTH / 2, WIDTH / 2]) {
    p.frames.push({ matrix: place(d, 0, h - 0.06, z, LENGTH, 0.12, 0.05), color: frame });
    if (manual) p.blinks.push({ matrix: place(d, 0, h - 0.06, z, LENGTH + 0.02, 0.14, 0.07), color: BLINK.manual });
  }
  for (let x = -LENGTH / 2 + 0.08; x < LENGTH / 2; x += 0.16) {
    p.frames.push({ matrix: place(d, x, h - 0.03, 0, 0.06, 0.06, WIDTH - 0.05), color: ROLLER });
    if (running) p.blinks.push({ matrix: place(d, x, h - 0.03, 0, 0.07, 0.07, WIDTH - 0.04), color: BLINK.running });
  }
  // 雷射: 兩邊側框上各一顆頭, 光束橫過滾筒上方 (叉車那一端)
  const laserX = LENGTH / 2 - 0.1;
  for (const z of [-WIDTH / 2, WIDTH / 2]) {
    p.frames.push({ matrix: place(d, laserX, h + 0.05, z, 0.06, 0.1, 0.06), color: SENSOR });
    if (sensed) p.blinks.push({ matrix: place(d, laserX, h + 0.05, z, 0.08, 0.12, 0.08), color: BLINK.sensor });
  }
  if (sensed) p.blinks.push({ matrix: place(d, laserX, h + 0.06, 0, 0.015, 0.015, WIDTH), color: BLINK.sensor });
  const legH = h - 0.12;
  if (legH > 0.1) {
    for (const x of [-legX, legX]) {
      for (const z of [-legZ, legZ]) {
        p.frames.push({ matrix: place(d, x, legH / 2, z, 0.07, legH, 0.07), color: frame });
        p.frames.push({ matrix: place(d, x, 0.005, z, 0.14, 0.01, 0.14), color: STEEL });
      }
      // 同一端的兩隻腳用橫撐連起來, 側面上下各一根
      p.frames.push({ matrix: place(d, x, legH * 0.35, 0, 0.06, 0.08, legZ * 2), color: frame });
    }
    for (const z of [-legZ, legZ]) p.frames.push({ matrix: place(d, 0, legH * 0.35, z, legX * 2, 0.08, 0.05), color: frame });
  }
  const cargo = info?.cargo?.length ?? 0;
  if (cargo > 0 || info?.hasCargoSignal) addLoad(p, d, h);
  const light = info?.disable ? LIGHT.off : info?.isRunning ? LIGHT.busy : info?.isManualMode ? LIGHT.booked : LIGHT.ok;
  p.lights.push({ matrix: place(d, -LENGTH / 2 + 0.06, h + 0.06, WIDTH / 2, 0.1, 0.1, 0.1), color: light });
  addHit(p, d, [0, (h + 0.4) / 2, 0, LENGTH, h + 0.4, WIDTH], info?.name ?? d.locationId, {
    target: { type: "ELEVATOR", locationId: d.locationId },
    pick: info && wholePick(d.locationId, info.name || "", !info.disable && cargo > 0, !info.disable && cargo === 0),
  });
  return p;
};

/** 充電站: 車後面一個櫃子, 頂上的燈: 充電中綠、有車預約藍、連不上灰。點了打開充電站控制 (同 2D) */
export const chargerParts = (d: DevicePlacement, info: Charge_Status_Info | undefined): Parts => {
  const p = emptyParts();
  p.frames.push({ matrix: place(d, -0.75, 0.55, 0, 0.45, 1.1, 0.6), color: info?.disable ? DISABLED : CHARGER });
  const connected = !info || info.isTCPConnect || info.isMQTTConnect;
  const light = !connected ? LIGHT.off : info?.barOut === "1" ? LIGHT.ok : info?.booker ? LIGHT.booked : "#d9d9d9";
  p.lights.push({ matrix: place(d, -0.75, 1.13, 0, 0.14, 0.06, 0.14), color: light });
  addHit(p, d, [-0.75, 0.6, 0, 0.55, 1.2, 0.7], info?.name || d.locationId, { charger: d.locationId });
  return p;
};

/** 捲門的大小 (公尺): 橫跨整條路 */
const GATE_WIDTH = 3;
const GATE_HEIGHT = 3;
/** 門簾一片多高 */
const SLAT = 0.25;

/**
 * 捲門: 路兩邊各一根門柱, 上面是捲軸箱, 門簾一片一片的。關著放到底, 開著捲上去,
 * 開關中、異常時 (不知道停在哪) 畫一半。狀態燈在捲軸箱兩面 (同 2D 的顏色), 開關中燈會閃,
 * 急停 / 變頻器異常 / 系統異常整片門簾閃紅。label: 滑過去顯示的 (名稱、狀態)
 */
export const liftGateParts = (d: DevicePlacement, info: Lift_Gate_Info | undefined, label: string): Parts => {
  const p = emptyParts();
  const W = GATE_WIDTH;
  const H = GATE_HEIGHT;
  const frame = info?.disable ? DISABLED : STEEL;
  for (const z of [-W / 2, W / 2]) p.frames.push({ matrix: place(d, 0, H / 2, z, 0.16, H, 0.16), color: frame });
  p.frames.push({ matrix: place(d, 0, H + 0.18, 0, 0.4, 0.36, W + 0.16), color: frame });

  const status = info?.status;
  const fault = !!status && GATE_FAULTS.includes(status);
  const down = !status || status === Lift_Gate_Status.CLOSED ? 1 : status === Lift_Gate_Status.OPENED ? 0 : 0.5;
  const curtain = H * down;
  for (let top = H; top > H - curtain + 0.001; top -= SLAT) {
    const h = Math.min(SLAT, top - (H - curtain)) - 0.02;
    p.frames.push({ matrix: place(d, 0, top - 0.01 - h / 2, 0, 0.05, h, W - 0.16), color: CURTAIN });
  }
  if (fault && curtain > 0) p.blinks.push({ matrix: place(d, 0, H - curtain / 2, 0, 0.08, curtain, W - 0.12), color: GATE_LIGHT[status] });

  const light = !status || info?.disable ? LIGHT.off : GATE_LIGHT[status];
  const moving = status === Lift_Gate_Status.OPENING || status === Lift_Gate_Status.CLOSING;
  for (const x of [-0.21, 0.21]) {
    p.lights.push({ matrix: place(d, x, H + 0.18, W / 2 - 0.25, 0.04, 0.14, 0.14), color: light });
    if (moving || fault) p.blinks.push({ matrix: place(d, x, H + 0.18, W / 2 - 0.25, 0.06, 0.18, 0.18), color: light });
  }
  p.tips.push(hitBox(d, [0, H / 2, 0, 0.5, H, W], label, {}));
  return p;
};

/** 門前等待點: 一根旗桿 (同 2D 的旗子圖示); 點位本身的點擊照舊 (直接移動) */
export const gateWaitParts = (d: DevicePlacement): Parts => {
  const p = emptyParts();
  p.frames.push({ matrix: place(d, 0, 0.8, 0, 0.04, 1.6, 0.04), color: STEEL });
  p.frames.push({ matrix: place(d, 0, 1.45, 0.2, 0.02, 0.28, 0.4), color: FLAG });
  p.frames.push({ matrix: place(d, 0, 0.005, 0, 0.3, 0.01, 0.3), color: FLAG });
  return p;
};

/** 包膜線沒配對時 (只有入口或只有出口) 畫多長 */
const PACKAGE_STUB = 1.6;
const PACKAGE_WIDTH = 1.1;

/** 包膜線滑過去的文字 (外面翻好給進來) */
export type PackageText = { entry: (name: string) => string; exit: (name: string) => string; registered: (n: number) => string };

/**
 * 包膜線: 從入口放貨的位置到出口取貨的位置一整條滾筒線, 台面在對接高度。
 * 線上每顆感測燈 (lamps, 沿線平均排) 亮著代表那個位置現在有東西, 就在那裡畫一板貨;
 * 燈本身畫在線的側邊 (亮綠、暗灰、沒接訊號淺灰)。兩端各一個點選盒子:
 * 入口可以當放貨點 (登記還沒滿), 出口可以當取貨點 (線上有登記的貨), 跟 2D 一樣。
 * 只有入口或只有出口 (還沒配對) 時畫一小段。
 */
export const packageParts = (
  entry: DevicePlacement | null,
  exit: DevicePlacement | null,
  info: Package_Info | undefined,
  exitInfo: Package_Info | undefined,
  text: PackageText,
): Parts => {
  const p = emptyParts();
  const from = entry ?? exit;
  if (!from) return p;
  const shared = info ?? exitInfo;
  const h = shared?.forkHeight && shared.forkHeight > 0 ? shared.forkHeight / 1000 : DEFAULT_CONVEYOR_HEIGHT;
  // 線的兩端 (貨放的位置): 沒配對時從那一端往路的反方向延伸一小段
  const a = { x: from.x, y: from.y };
  const b =
    entry && exit
      ? { x: exit.x, y: exit.y }
      : { x: from.x - Math.cos(from.yaw) * PACKAGE_STUB, y: from.y - Math.sin(from.yaw) * PACKAGE_STUB };
  const length = Math.max(0.1, Math.hypot(b.x - a.x, b.y - a.y));
  // 線自己的座標: 原點在中間, +x 從入口指向出口
  const line: DevicePlacement = { ...from, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, yaw: Math.atan2(b.y - a.y, b.x - a.x) };
  const total = length + 1.2;
  const frame = shared?.disable ? DISABLED : STEEL;
  for (const z of [-PACKAGE_WIDTH / 2, PACKAGE_WIDTH / 2]) {
    p.frames.push({ matrix: place(line, 0, h - 0.08, z, total, 0.12, 0.06), color: frame });
    if (h > 0.25) {
      const legs = Math.max(2, Math.ceil(total / 2) + 1);
      for (let i = 0; i < legs; i++) {
        const x = -total / 2 + 0.05 + (i * (total - 0.1)) / (legs - 1);
        p.frames.push({ matrix: place(line, x, (h - 0.14) / 2, z, 0.06, h - 0.14, 0.06), color: frame });
      }
    }
  }
  for (let x = -total / 2 + 0.09; x < total / 2; x += 0.18) {
    p.frames.push({ matrix: place(line, x, h - 0.04, 0, 0.06, 0.06, PACKAGE_WIDTH - 0.06), color: ROLLER });
  }

  // 感測燈 (配對好的線才有意義)
  const lamps = entry && exit ? (info?.lamps ?? []) : [];
  const spacing = lamps.length > 1 ? length / (lamps.length - 1) : length;
  lamps.forEach((on, i) => {
    const x = lamps.length > 1 ? -length / 2 + i * spacing : 0;
    p.lights.push({
      matrix: place(line, x, h + 0.02, PACKAGE_WIDTH / 2 + 0.06, 0.08, 0.08, 0.06),
      color: on === null ? LAMP.none : on ? LAMP.on : LAMP.off,
    });
    if (!on) return;
    // 位置之間太近 (燈比棧板密) 時只畫紙箱, 不然會疊在一起
    if (spacing >= 1.05) {
      p.pallets.push({ matrix: place(line, x, h, 0) });
      p.cartons.push({ matrix: place(line, x, h + PALLET_HEIGHT + CARTON_SIZE[1] / 2, 0, ...CARTON_SIZE) });
    } else {
      const s = Math.max(0.2, spacing * 0.85);
      p.cartons.push({ matrix: place(line, x, h + CARTON_SIZE[1] / 2, 0, s, CARTON_SIZE[1], Math.min(s, CARTON_SIZE[2])) });
    }
  });

  // 兩端的狀態燈和點選盒子 (同 2D 的入口 / 出口按鈕)
  const count = shared?.cargo.length ?? 0;
  const ends: [DevicePlacement | null, Package_Info | undefined, number][] = [
    [entry, info, entry && exit ? -1 : 0],
    [exit, exitInfo, entry && exit ? 1 : 0],
  ];
  for (const [end, endInfo, side] of ends) {
    if (!end) continue;
    const isEntry = end === entry;
    const name = endInfo?.name || end.locationId;
    const full = !!info && info.capacity > 0 && count >= info.capacity;
    const disabled = !!endInfo?.disable;
    const light = disabled ? LIGHT.off : endInfo?.booker ? LIGHT.booked : isEntry ? (full ? LIGHT.busy : LIGHT.ok) : count > 0 ? LIGHT.ok : "#d9d9d9";
    // 沒配對的那一小段整段都是這一端; 配對好的線一端一半
    const cx = side === 0 ? 0 : (side * total) / 4;
    const sx = side === 0 ? total : total / 2;
    p.lights.push({ matrix: place(line, side === 0 ? -total / 2 + 0.1 : side * (total / 2 - 0.1), h + 0.1, -PACKAGE_WIDTH / 2, 0.1, 0.1, 0.1), color: light });
    addHit(p, line, [cx, (h + 0.4) / 2, 0, sx, h + 0.4, PACKAGE_WIDTH], `${isEntry ? text.entry(name) : text.exit(name)} · ${text.registered(count)}`, {
      target: { type: "PACKAGE", locationId: end.locationId },
      pick: endInfo && wholePick(end.locationId, endInfo.name, !isEntry && !disabled && count > 0, isEntry && !disabled && !full),
    });
  }
  return p;
};
