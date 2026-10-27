import type * as THREE from "three";

/**
 * 點選的優先順序: 車 > 設備 > 點位。點位是固定螢幕大小的點, 射線的容許範圍有 1 公尺,
 * 車停在點位上時常常比車還先被打到; 所以後面的人看到前面的也被點到, 就把這次點擊讓出去。
 * 點選用的物件在 userData.pick 標自己是哪一種。
 */
export type PickKind = "vehicle" | "device" | "point";
const PICK_ORDER: PickKind[] = ["vehicle", "device", "point"];
export const yieldsTo = (mine: PickKind, hits: { object: THREE.Object3D }[]) =>
  hits.some((h) => {
    const other = h.object.userData.pick as PickKind | undefined;
    return other !== undefined && PICK_ORDER.indexOf(other) < PICK_ORDER.indexOf(mine);
  });
