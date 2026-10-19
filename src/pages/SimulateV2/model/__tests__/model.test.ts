/**
 * 專案格式的自動測試: 第 2 版升到第 3 版補預設值、DXF 欄位讀檔容錯、指紋不受 key 順序影響、
 * DXF 兩點校正. yarn test:sim
 */
import { describe, expect, it } from "vitest";
import { calibrate } from "../../editor/calibrate";
import { createEmptyDoc } from "../defaults";
import { hashOf, stableStringify } from "../hash";
import { parseDoc } from "../migrate";
import { updateSweep } from "../setupOps";
import type { CadBackground } from "../types";

const cad = (patch: Partial<CadBackground> = {}): CadBackground => ({
  kind: "dxf",
  fileId: "fabc",
  fileName: "plan.dxf",
  unit: "mm",
  metersPerUnit: 0.001,
  baseX: 1000,
  baseY: 2000,
  extent: { minX: 0, minY: 0, maxX: 80000, maxY: 50000 },
  originX: 0,
  originY: 0,
  hiddenLayers: [],
  opacity: 0.7,
  locked: true,
  calibrated: false,
  ...patch,
});

describe("專案格式", () => {
  it("第 2 版的專案打開時補上 DXF 和車數掃描的預設值", () => {
    const v2 = { ...createEmptyDoc(), schemaVersion: 2 } as Record<string, unknown>;
    delete v2.cad;
    delete v2.sweep;
    const doc = parseDoc(v2);
    expect(doc.schemaVersion).toBe(3);
    expect(doc.cad).toBeNull();
    expect(doc.sweep).toMatchObject({ min: 1, max: 10, seeds: 3, minAchievement: 0.99, maxWaitP95Min: 5, maxUtilization: 0.85, availability: 0.85 });
    expect(doc.editor.snapCad).toBe(true);
  });

  it("DXF 欄位容錯: 單位不認得用 mm, 比例不對照單位算, 重複的隱藏圖層合併", () => {
    const doc = parseDoc({ ...createEmptyDoc(), cad: { ...cad(), unit: "yard", metersPerUnit: -1, hiddenLayers: ["A", "A", 3, "B"] } });
    expect(doc.cad?.unit).toBe("mm");
    expect(doc.cad?.metersPerUnit).toBe(0.001);
    expect(doc.cad?.hiddenLayers).toEqual(["A", "B"]);
    expect(parseDoc({ ...createEmptyDoc(), cad: { kind: "dxf" } }).cad).toBeNull();
  });

  it("掃描範圍: 下限超過上限時一起推", () => {
    let doc = createEmptyDoc();
    doc = updateSweep(doc, { min: 12 });
    expect(doc.sweep.max).toBe(12);
    doc = updateSweep(doc, { max: 5 });
    expect(doc.sweep.min).toBe(5);
    expect(updateSweep(doc, { max: 5 })).toBe(doc);
  });

  it("指紋: key 的順序不影響 (資料庫的 JSON 會換順序)", () => {
    expect(stableStringify({ b: 1, a: [2, { d: 1, c: null }] })).toBe(stableStringify({ a: [2, { c: null, d: 1 }], b: 1 }));
    expect(hashOf({ x: 1, y: 2 })).toBe(hashOf({ y: 2, x: 1 }));
    expect(hashOf({ x: 1 })).not.toBe(hashOf({ x: 2 }));
  });

  it("DXF 兩點校正: 第一點不動, 比例照實際距離, 點位可以一起縮放", () => {
    const doc = { ...createEmptyDoc(), cad: cad({ originX: 5, originY: 5 }), nodes: [{ id: "n", name: "1", x: 15, y: 5, kind: "point" as const }] };
    // 圖上量到 10 公尺, 實際是 20 公尺: 比例變兩倍
    const a = { x: 5, y: 5 };
    const b = { x: 15, y: 5 };
    const next = calibrate(doc, a, b, 20, true, "cad");
    expect(next.cad?.metersPerUnit).toBeCloseTo(0.002, 9);
    expect(next.cad?.calibrated).toBe(true);
    // a 對到的圖面位置還在 a
    expect(next.cad?.originX).toBeCloseTo(5, 9);
    expect(next.nodes[0].x).toBeCloseTo(25, 6);
  });
});
