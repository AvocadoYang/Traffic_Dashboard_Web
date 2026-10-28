import { describe, expect, it } from "vitest";
import { cadSegments } from "../CadLines3D";

describe("cadSegments", () => {
  // 兩條線: 圖層 0 是三個頂點的折線 (兩段), 圖層 1 是一段
  const geometry = {
    coords: Float32Array.from([0, 0, 1000, 0, 1000, 500, 0, 0, 0, 2000]),
    polyStart: Uint32Array.from([0, 3, 5]),
    polyLayer: Uint16Array.from([0, 1]),
  };
  // 圖面單位 mm, 原點放在地圖 (10, 20)
  const cad = { metersPerUnit: 0.001, originX: 10, originY: 20 };

  it("折線拆成一段一段, 換成地圖公尺, y 翻成 three.js 的 -z", () => {
    const pos = Array.from(cadSegments(cad, geometry, Uint8Array.from([0, 0])));
    expect(pos.length).toBe(3 * 6);
    // 第一段 (0,0) -> (1000,0): 地圖 (10,20) -> (11,20)
    expect(pos.slice(0, 6)).toEqual([10, 0.01, -20, 11, 0.01, -20].map((v) => expect.closeTo(v, 5)));
    // 第三段是圖層 1 的 (0,0) -> (0,2000): 地圖 (10,20) -> (10,22)
    expect(pos.slice(12, 18)).toEqual([10, 0.01, -20, 10, 0.01, -22].map((v) => expect.closeTo(v, 5)));
  });

  it("隱藏的圖層不畫", () => {
    expect(cadSegments(cad, geometry, Uint8Array.from([1, 0])).length).toBe(6);
    expect(cadSegments(cad, geometry, Uint8Array.from([1, 1])).length).toBe(0);
  });
});
