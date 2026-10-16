import { dist, roundPoint } from "../model/geometry";
import type { Point, SimDoc } from "../model/types";

const scaleAbout = (doc: SimDoc, a: Point, factor: number) =>
  doc.nodes.map((n) => ({ ...n, ...roundPoint({ x: a.x + (n.x - a.x) * factor, y: a.y + (n.y - a.y) * factor }) }));

/**
 * 比例校正: 在底圖上點了兩個點, 輸入它們實際相距幾公尺, 算出一個像素 (DXF 是一個圖面單位) 幾公尺.
 * 第一個點的位置不動, 圖以它為中心縮放. 校正前就畫好的點位可以選擇跟著一起縮放.
 */
export function calibrate(doc: SimDoc, a: Point, b: Point, realMeters: number, scaleNodes: boolean, target: "image" | "cad" = "image"): SimDoc {
  if (target === "cad") {
    const cad = doc.cad;
    if (!cad) return doc;
    const unitA = { x: (a.x - cad.originX) / cad.metersPerUnit, y: (a.y - cad.originY) / cad.metersPerUnit };
    const units = dist(a, b) / cad.metersPerUnit;
    if (units <= 0 || realMeters <= 0) return doc;
    const mpu = realMeters / units;
    return {
      ...doc,
      cad: { ...cad, metersPerUnit: mpu, originX: a.x - unitA.x * mpu, originY: a.y - unitA.y * mpu, calibrated: true, locked: true },
      nodes: scaleNodes ? scaleAbout(doc, a, mpu / cad.metersPerUnit) : doc.nodes,
    };
  }
  const bg = doc.background;
  if (!bg) return doc;
  const pixA = { x: (a.x - bg.originX) / bg.metersPerPx, y: (a.y - bg.originY) / bg.metersPerPx };
  const pixDist = dist(a, b) / bg.metersPerPx;
  if (pixDist <= 0 || realMeters <= 0) return doc;
  const mpp = realMeters / pixDist;
  const factor = mpp / bg.metersPerPx;
  return {
    ...doc,
    background: {
      ...bg,
      metersPerPx: mpp,
      originX: a.x - pixA.x * mpp,
      originY: a.y - pixA.y * mpp,
      calibrated: true,
      locked: true,
    },
    nodes: scaleNodes ? scaleAbout(doc, a, factor) : doc.nodes,
  };
}
