import { PALLET_OFFSET } from "./dimensions";

/**
 * 3D 設備 (貨架、堆疊、輸送帶、電梯、充電站) 擺在哪、朝哪。
 *
 * 地點上的 rotate / translateX 那些是 2D 小圖示的顯示參數, 不是實體方向; 這裡改看路網:
 * 取放貨站通常是路線的盡頭, 叉車沿路開過來、倒車把牙叉伸進去, 所以「從相連的點指向站點」
 * 就是牙叉伸進去的方向。車停在站點時 (車的位置 = 叉臂根部) 棧板在後面 PALLET_OFFSET,
 * 設備就以那裡為中心、開口朝路。沒接路線的站點開口朝南 (預設鏡頭看得到)。
 * 捲門、門前等待點是車會開過去的地方, 直接放在點位上, yaw 是路的方向。
 */

export type DeviceKind =
  | "STORAGE"
  | "STACK"
  | "CONVEYOR"
  | "ELEVATOR"
  | "CHARGING"
  | "PACKAGE_IN"
  | "PACKAGE_OUT"
  | "LIFT_GATE"
  | "GATE_WAIT_POINT";
export const DEVICE_KINDS: DeviceKind[] = [
  "STORAGE",
  "STACK",
  "CONVEYOR",
  "ELEVATOR",
  "CHARGING",
  "PACKAGE_IN",
  "PACKAGE_OUT",
  "LIFT_GATE",
  "GATE_WAIT_POINT",
];
/** 在路上的 (車開過去, 不是倒車進去取放貨): 不用往後退一個棧板 */
const ON_ROAD: DeviceKind[] = ["LIFT_GATE", "GATE_WAIT_POINT"];

export type DevicePlacement = {
  locationId: string;
  kind: DeviceKind;
  /** 貨放的位置 (ROS 座標, 公尺) */
  x: number;
  y: number;
  /** 開口 (朝路那一面) 的方向, 弧度, 逆時針為正 */
  yaw: number;
};

type Loc = { locationId: string; x: number; y: number; areaType: string };
type Road = { x1: number; y1: number; x2: number; y2: number };

/** 座標差這麼多以內算同一個點 (公尺) */
const SAME_POINT = 0.01;

export function devicePlacements(locations: Loc[], roads: Road[]): DevicePlacement[] {
  const out: DevicePlacement[] = [];
  for (const loc of locations) {
    const kind = DEVICE_KINDS.find((k) => k === loc.areaType);
    if (!kind) continue;
    let face: [number, number] | null = null;
    for (const r of roads) {
      const at1 = Math.abs(r.x1 - loc.x) < SAME_POINT && Math.abs(r.y1 - loc.y) < SAME_POINT;
      const at2 = Math.abs(r.x2 - loc.x) < SAME_POINT && Math.abs(r.y2 - loc.y) < SAME_POINT;
      if (at1 === at2) continue;
      const dx = at1 ? r.x2 - loc.x : r.x1 - loc.x;
      const dy = at1 ? r.y2 - loc.y : r.y1 - loc.y;
      const len = Math.hypot(dx, dy);
      if (len < SAME_POINT) continue;
      face = [dx / len, dy / len];
      break;
    }
    if (!face) {
      out.push({ locationId: loc.locationId, kind, x: loc.x, y: loc.y, yaw: -Math.PI / 2 });
      continue;
    }
    const offset = ON_ROAD.includes(kind) ? 0 : PALLET_OFFSET;
    out.push({
      locationId: loc.locationId,
      kind,
      x: loc.x - face[0] * offset,
      y: loc.y - face[1] * offset,
      yaw: Math.atan2(face[1], face[0]),
    });
  }
  return out;
}
