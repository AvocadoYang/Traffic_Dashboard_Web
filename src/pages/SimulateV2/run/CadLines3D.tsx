import { FC, useEffect, useMemo } from "react";
import * as THREE from "three";
import type { CadBackground } from "../model/types";
import type { CadGeometry } from "../io/dxf/types";

/** CAD 線離地多高 (公尺): 在底圖上面、路線下面 */
const CAD_Y = 0.01;

/**
 * 看得到的圖層的線攤成線段 (x, 高度, -y 一組, 兩組一段)。
 * 座標換算同 2D (cadDraw): 地圖 = origin + 圖面座標 x metersPerUnit
 */
export function cadSegments(
  cad: Pick<CadBackground, "metersPerUnit" | "originX" | "originY">,
  geometry: Pick<CadGeometry, "coords" | "polyStart" | "polyLayer">,
  hidden: Uint8Array,
) {
  const { coords, polyStart, polyLayer } = geometry;
  const s = cad.metersPerUnit;
  let segments = 0;
  for (let p = 0; p < polyLayer.length; p++) {
    if (!hidden[polyLayer[p]]) segments += Math.max(0, polyStart[p + 1] - polyStart[p] - 1);
  }
  const pos = new Float32Array(segments * 6);
  let k = 0;
  for (let p = 0; p < polyLayer.length; p++) {
    if (hidden[polyLayer[p]]) continue;
    for (let i = polyStart[p]; i < polyStart[p + 1] - 1; i++) {
      pos[k++] = cad.originX + coords[i * 2] * s;
      pos[k++] = CAD_Y;
      pos[k++] = -(cad.originY + coords[i * 2 + 1] * s);
      pos[k++] = cad.originX + coords[i * 2 + 2] * s;
      pos[k++] = CAD_Y;
      pos[k++] = -(cad.originY + coords[i * 2 + 3] * s);
    }
  }
  return pos;
}

/**
 * 3D 回放的 CAD 底圖: 看得到的圖層的線全部攤成線段, 一次畫完 (CAD 圖動輒幾萬到幾十萬條線)。
 * 文字不畫 (3D 的文字要另外載字型)。
 */
const CadLines3D: FC<{ cad: CadBackground; geometry: CadGeometry; hidden: Uint8Array; color: string }> = ({
  cad,
  geometry,
  hidden,
  color,
}) => {
  const lines = useMemo(() => {
    const pos = cadSegments(cad, geometry, hidden);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return new THREE.LineSegments(
      g,
      new THREE.LineBasicMaterial({ transparent: cad.opacity < 1, opacity: cad.opacity, depthWrite: false }),
    );
  }, [cad, geometry, hidden]);
  useEffect(
    () => () => {
      lines.geometry.dispose();
      (lines.material as THREE.Material).dispose();
    },
    [lines],
  );
  useEffect(() => {
    (lines.material as THREE.LineBasicMaterial).color.set(color);
  }, [lines, color]);
  return <primitive object={lines} renderOrder={2} />;
};

export default CadLines3D;
