import * as THREE from "three";
import type { Line2 } from "three-stdlib";

/**
 * 一直在變的幾何 (車框、點雲、等待箭頭) 原地改資料, 不要每次都換一個新的屬性:
 * three 換掉的舊屬性不會馬上還 GPU 的 buffer, 要等瀏覽器回收, 中控室整天開著時一秒好幾百個在堆。
 * 長度一樣就直接改內容; 不一樣時先 dispose (還掉現在的 buffer, geometry 之後照樣可以用) 再換。
 */

const ensure = (geometry: THREE.BufferGeometry, name: string, length: number, itemSize: number) => {
  const attr = geometry.getAttribute(name) as THREE.BufferAttribute | undefined;
  if (attr && !(attr instanceof THREE.InterleavedBufferAttribute) && attr.array.length === length) return attr;
  if (attr) geometry.dispose();
  const next = new THREE.Float32BufferAttribute(new Float32Array(length), itemSize);
  geometry.setAttribute(name, next);
  return next;
};

/** 換一個屬性的內容 */
export const writeAttribute = (geometry: THREE.BufferGeometry, name: string, values: ArrayLike<number>, itemSize: number) => {
  const attr = ensure(geometry, name, values.length, itemSize);
  (attr.array as Float32Array).set(values);
  attr.needsUpdate = true;
  return attr;
};

/** LineSegments 的虛線距離 (同 three 的 LineSegments.computeLineDistances, 但原地改) */
export const writeSegmentDistances = (geometry: THREE.BufferGeometry) => {
  const pos = geometry.getAttribute("position");
  if (!pos) return;
  const attr = ensure(geometry, "lineDistance", pos.count, 1);
  const d = attr.array as Float32Array;
  for (let i = 0; i + 1 < pos.count; i += 2) {
    const len = Math.hypot(pos.getX(i + 1) - pos.getX(i), pos.getY(i + 1) - pos.getY(i), pos.getZ(i + 1) - pos.getZ(i));
    d[i] = i === 0 ? 0 : d[i - 1];
    d[i + 1] = d[i] + len;
  }
  attr.needsUpdate = true;
};

/**
 * drei Line (Line2) 換折線的點 (x, y, z 連著放), 順便算虛線距離。
 * 點數跟現在一樣就原地改 three-stdlib 放線段的 buffer; 不一樣才交給 setPositions / computeLineDistances 重建
 */
export const writeLine2 = (line: Line2, points: Float32Array) => {
  const geometry = line.geometry;
  const segments = points.length / 3 - 1;
  const start = geometry.getAttribute("instanceStart") as THREE.InterleavedBufferAttribute | undefined;
  const dist = geometry.getAttribute("instanceDistanceStart") as THREE.InterleavedBufferAttribute | undefined;
  if (!start || !dist || start.data.array.length !== segments * 6 || dist.data.array.length !== segments * 2) {
    geometry.dispose();
    geometry.setPositions(points);
    line.computeLineDistances();
    return;
  }
  const seg = start.data.array as Float32Array;
  const d = dist.data.array as Float32Array;
  for (let i = 0; i < segments; i++) {
    const a = i * 3;
    seg.set(points.subarray(a, a + 6), i * 6);
    const len = Math.hypot(points[a + 3] - points[a], points[a + 4] - points[a + 1], points[a + 5] - points[a + 2]);
    d[i * 2] = i === 0 ? 0 : d[i * 2 - 1];
    d[i * 2 + 1] = d[i * 2] + len;
  }
  start.data.needsUpdate = true;
  dist.data.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
};
