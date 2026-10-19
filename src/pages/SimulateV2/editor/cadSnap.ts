/**
 * 吸附到 CAD 圖上的點: 線的端點和頂點、弧和圓的圓心、圖塊的插入點、直線的交點.
 * 只找看得到的圖層; 交點要兩條線的圖層都看得到.
 */
import type { CadBackground, Point } from "../model/types";
import type { CadGeometry } from "../io/dxf/types";
import { SNAP_CROSS } from "../io/dxf/types";

export interface CadSnapHit {
  point: Point;
  /** SNAP_END / SNAP_CROSS / SNAP_CENTER */
  kind: number;
}

export function findCadSnap(g: CadGeometry, cad: CadBackground, hidden: Uint8Array, p: Point, radius: number): CadSnapHit | null {
  const mpu = cad.metersPerUnit;
  if (!(mpu > 0)) return null;
  const lx = (p.x - cad.originX) / mpu;
  const ly = (p.y - cad.originY) / mpu;
  const r = radius / mpu;
  const sn = g.snap;
  const clampX = (v: number) => Math.min(sn.cols - 1, Math.max(0, Math.floor((v - sn.minX) / sn.cell)));
  const clampY = (v: number) => Math.min(sn.rows - 1, Math.max(0, Math.floor((v - sn.minY) / sn.cell)));
  const cx0 = clampX(lx - r);
  const cx1 = clampX(lx + r);
  const cy0 = clampY(ly - r);
  const cy1 = clampY(ly + r);
  let best = -1;
  let bestD = Infinity;
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const k = cy * sn.cols + cx;
      for (let j = sn.start[k]; j < sn.start[k + 1]; j++) {
        const i = sn.idx[j];
        if (hidden[sn.layerA[i]] || hidden[sn.layerB[i]]) continue;
        let d = Math.hypot(sn.pts[i * 2] - lx, sn.pts[i * 2 + 1] - ly);
        if (d > r) continue;
        // 差不多一樣近時, 端點、圓心比交點優先
        if (sn.kind[i] === SNAP_CROSS) d += r * 0.05;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
    }
  }
  if (best < 0) return null;
  return {
    point: { x: cad.originX + sn.pts[best * 2] * mpu, y: cad.originY + sn.pts[best * 2 + 1] * mpu },
    kind: sn.kind[best],
  };
}
