/**
 * DXF 讀取的自動測試: 單位、圖層、圖塊展開 (位移、旋轉、縮放、陣列、0 層跟著插入的圖層)、
 * 有弧度的聚合線、鏡射的弧、文字、圖紙空間、Big5 編碼、二進位 DXF、交點和吸附. yarn test:sim
 */
import { describe, expect, it } from "vitest";
import { findCadSnap } from "../../../editor/cadSnap";
import type { CadBackground } from "../../../model/types";
import { flattenDxf } from "../flatten";
import { BinaryDxfError, cleanMtext, decodeDxf, decodeDxfString, readDxf } from "../reader";
import { SNAP_CENTER, SNAP_CROSS, SNAP_END, hiddenMaskOf } from "../types";

type G = [number, string | number];

/** 群組碼 + 值 -> DXF 文字 */
const groups = (gs: G[]) => gs.map(([c, v]) => `${String(c).padStart(3, " ")}\n${v}`).join("\n");

function dxf(opts: { header?: G[]; layers?: { name: string; color?: number; flags?: number }[]; blocks?: string[]; entities: G[][] }) {
  const parts: G[] = [];
  parts.push([0, "SECTION"], [2, "HEADER"], ...(opts.header ?? []), [0, "ENDSEC"]);
  parts.push([0, "SECTION"], [2, "TABLES"], [0, "TABLE"], [2, "LAYER"]);
  for (const l of opts.layers ?? []) parts.push([0, "LAYER"], [2, l.name], [62, l.color ?? 7], [70, l.flags ?? 0]);
  parts.push([0, "ENDTAB"], [0, "ENDSEC"]);
  let text = groups(parts);
  text += `\n${groups([[0, "SECTION"], [2, "BLOCKS"]])}`;
  for (const b of opts.blocks ?? []) text += `\n${b}`;
  text += `\n${groups([[0, "ENDSEC"], [0, "SECTION"], [2, "ENTITIES"]])}`;
  for (const e of opts.entities) text += `\n${groups(e)}`;
  text += `\n${groups([[0, "ENDSEC"], [0, "EOF"]])}\n`;
  return text;
}

const block = (name: string, x: number, y: number, entities: G[][]) =>
  [groups([[0, "BLOCK"], [8, "0"], [2, name], [70, 0], [10, x], [20, y]]), ...entities.map(groups), groups([[0, "ENDBLK"], [8, "0"]])].join("\n");

const line = (layer: string, x1: number, y1: number, x2: number, y2: number, extra: G[] = []): G[] => [
  [0, "LINE"],
  [8, layer],
  ...extra,
  [10, x1],
  [20, y1],
  [11, x2],
  [21, y2],
];

const square = (layer: string, r: number): G[] => [
  [0, "LWPOLYLINE"],
  [8, layer],
  [90, 4],
  [70, 1],
  [10, -r],
  [20, -r],
  [10, r],
  [20, -r],
  [10, r],
  [20, r],
  [10, -r],
  [20, r],
];

const flatten = (text: string) => flattenDxf(readDxf(text), { base: { x: 0, y: 0 } });

/** 第 i 條線的頂點 */
function verts(g: ReturnType<typeof flatten>, i: number) {
  const out: [number, number][] = [];
  for (let k = g.polyStart[i]; k < g.polyStart[i + 1]; k++) out.push([g.coords[k * 2], g.coords[k * 2 + 1]]);
  return out;
}

const close = (a: number, b: number, eps = 1e-3) => Math.abs(a - b) < eps;

describe("DXF 讀取", () => {
  it("檔頭的單位、圖層表 (關閉、凍結的圖層預設不顯示)", () => {
    const g = flatten(
      dxf({
        header: [
          [9, "$ACADVER"],
          [1, "AC1015"],
          [9, "$INSUNITS"],
          [70, 4],
        ],
        layers: [{ name: "WALL" }, { name: "OLD", flags: 1 }, { name: "OFF", color: -3 }],
        entities: [line("WALL", 0, 0, 10, 0), line("OLD", 0, 0, 0, 10), line("OFF", 1, 1, 2, 2)],
      }),
    );
    expect(g.header.insunits).toBe(4);
    expect(g.header.acadver).toBe("AC1015");
    const byName = new Map(g.layers.map((l) => [l.name, l]));
    expect(byName.get("WALL")?.hiddenInFile).toBe(false);
    expect(byName.get("OLD")?.hiddenInFile).toBe(true);
    expect(byName.get("OFF")?.hiddenInFile).toBe(true);
    expect(g.stats.polylines).toBe(3);
  });

  it("有弧度的聚合線: bulge 1 是半圓, 往行進方向的右邊凸", () => {
    const g = flatten(
      dxf({
        entities: [
          [
            [0, "LWPOLYLINE"],
            [8, "A"],
            [90, 2],
            [70, 0],
            [10, 0],
            [20, 0],
            [42, 1],
            [10, 2],
            [20, 0],
          ],
        ],
      }),
    );
    const v = verts(g, 0);
    expect(v.length).toBeGreaterThan(10);
    const mid = v[Math.floor(v.length / 2)];
    expect(close(mid[0], 1, 0.05)).toBe(true);
    expect(close(mid[1], -1, 0.05)).toBe(true);
    for (const [x, y] of v) expect(close(Math.hypot(x - 1, y), 1, 1e-3)).toBe(true);
  });

  it("圖塊: 位移、旋轉、縮放; 0 層的圖元跟著插入的圖層; 陣列插入", () => {
    const blocks = [block("COL", 0, 0, [square("0", 1)]), block("BOX", 5, 5, [square("INNER", 1)])];
    const g = flatten(
      dxf({
        blocks,
        entities: [
          [
            [0, "INSERT"],
            [8, "COLS"],
            [2, "COL"],
            [10, 50],
            [20, 50],
            [41, 2],
            [42, 3],
            [50, 90],
          ],
          [
            [0, "INSERT"],
            [8, "ARR"],
            [2, "BOX"],
            [10, 0],
            [20, 0],
            [70, 3],
            [44, 10],
          ],
        ],
      }),
    );
    const layerName = (i: number) => g.layers[g.polyLayer[i]].name;
    // 第一個: 2 x 3 倍再轉 90 度 -> x 方向 ±3, y 方向 ±2
    expect(layerName(0)).toBe("COLS");
    const v = verts(g, 0);
    const xs = v.map((p) => p[0]);
    const ys = v.map((p) => p[1]);
    expect(close(Math.min(...xs), 47)).toBe(true);
    expect(close(Math.max(...xs), 53)).toBe(true);
    expect(close(Math.min(...ys), 48)).toBe(true);
    expect(close(Math.max(...ys), 52)).toBe(true);
    // 陣列: 3 欄, 每欄 10; 圖塊基準點 (5, 5) 對到插入點; 自己有圖層的圖元不跟插入的圖層
    const arr = [1, 2, 3].map((i) => verts(g, i));
    const minX = arr.map((p) => Math.min(...p.map((q) => q[0])));
    expect(minX.map((x) => Math.round(x))).toEqual([-6, 4, 14]);
    expect(layerName(1)).toBe("INNER");
    // 插入點可以吸附
    const centers = [...g.snap.kind].filter((k) => k === SNAP_CENTER).length;
    expect(centers).toBeGreaterThanOrEqual(2);
  });

  it("擠出方向 (0,0,-1) 的弧: x 反過來", () => {
    const g = flatten(
      dxf({
        entities: [
          [
            [0, "ARC"],
            [8, "A"],
            [10, -20],
            [20, 2],
            [40, 1],
            [50, 0],
            [51, 90],
            [210, 0],
            [220, 0],
            [230, -1],
          ],
        ],
      }),
    );
    let found = false;
    for (let i = 0; i < g.snap.kind.length; i++) {
      if (g.snap.kind[i] === SNAP_CENTER && close(g.snap.pts[i * 2], 20) && close(g.snap.pts[i * 2 + 1], 2)) found = true;
    }
    expect(found).toBe(true);
    // 弧在 x > 20 這一側的反面 (OCS 的第一象限 -> WCS 的第二象限)
    const v = verts(g, 0);
    for (const [x, y] of v) {
      expect(x).toBeLessThanOrEqual(20 + 1e-6);
      expect(y).toBeGreaterThanOrEqual(2 - 1e-6);
    }
  });

  it("POLYLINE + VERTEX + SEQEND, 圖紙空間和看不見的圖元不讀, 不認得的圖元記下來", () => {
    const g = flatten(
      dxf({
        entities: [
          [
            [0, "POLYLINE"],
            [8, "P"],
            [66, 1],
            [70, 1],
            [0, "VERTEX"],
            [8, "P"],
            [10, 0],
            [20, 0],
            [0, "VERTEX"],
            [8, "P"],
            [10, 4],
            [20, 0],
            [0, "VERTEX"],
            [8, "P"],
            [10, 4],
            [20, 3],
            [0, "SEQEND"],
            [8, "P"],
          ],
          line("P", 0, 0, 100, 100, [[67, 1]]),
          line("P", 0, 0, 100, 100, [[60, 1]]),
          [
            [0, "MLINE"],
            [8, "P"],
          ],
          [
            [0, "LWPOLYLINE"],
            [8, "P"],
            [90, 0],
          ],
        ],
      }),
    );
    expect(g.stats.polylines).toBe(1);
    // 封閉: 回到第一個點
    expect(verts(g, 0)).toEqual([
      [0, 0],
      [4, 0],
      [4, 3],
      [0, 0],
    ]);
    expect(g.stats.skipped.MLINE).toBe(1);
    expect(g.stats.skipped["LWPOLYLINE (empty)"]).toBe(1);
  });

  it("文字: 多行文字的格式碼拿掉, \\U+ 和 %% 控制碼換成字", () => {
    expect(cleanMtext("{\\fArial|b1;包裝線}\\P\\C1;Line 2")).toBe("包裝線\nLine 2");
    expect(cleanMtext("\\A1;1\\S1/2;\"")).toBe('11/2"');
    expect(decodeDxfString("\\U+4E2D%%c50")).toBe("中⌀50");
    const g = flatten(
      dxf({
        entities: [
          [
            [0, "TEXT"],
            [8, "T"],
            [10, 5],
            [20, 6],
            [40, 2],
            [1, "A-1"],
          ],
          [
            [0, "MTEXT"],
            [8, "T"],
            [10, 1],
            [20, 1],
            [40, 1],
            [71, 5],
            [1, "{\\fArial;Hi}\\PThere"],
          ],
        ],
      }),
    );
    expect(g.texts.map((t) => t.text)).toEqual(["A-1", "Hi\nThere"]);
    expect(g.texts[1].ha).toBe(1);
    expect(g.texts[1].va).toBe(2);
  });

  it("Big5 (ANSI_950) 的舊版 DXF 解得出中文; 二進位 DXF 擋下來", () => {
    const head = "  0\nSECTION\n  2\nHEADER\n  9\n$ACADVER\n  1\nAC1015\n  9\n$DWGCODEPAGE\n  3\nANSI_950\n  0\nENDSEC\n  0\nSECTION\n  2\nENTITIES\n  0\nTEXT\n  8\nT\n 10\n0\n 20\n0\n 40\n1\n  1\n";
    const tail = "\n  0\nENDSEC\n  0\nEOF\n";
    // 「中文」的 Big5: A4 A4 A4 E5
    const bytes = new Uint8Array([...new TextEncoder().encode(head), 0xa4, 0xa4, 0xa4, 0xe5, ...new TextEncoder().encode(tail)]);
    const { text, encoding } = decodeDxf(bytes.buffer as ArrayBuffer);
    expect(encoding).toBe("big5");
    expect(readDxf(text).entities[0]).toMatchObject({ type: "TEXT", text: "中文" });
    const bin = new TextEncoder().encode("AutoCAD Binary DXF\r\n\u001a\u0000");
    expect(() => decodeDxf(bin.buffer as ArrayBuffer)).toThrow(BinaryDxfError);
  });

  it("主要範圍不算很遠的零星線; 交點可以吸附, 隱藏的圖層吸不到", () => {
    const g = flattenDxf(
      readDxf(
        dxf({
          entities: [
            line("A", 0, 50, 100, 50),
            line("B", 50, 0, 50, 100),
            // T 字形的接點是端點, 不算交點
            line("A", 0, 0, 100, 0),
            line("B", 20, 0, 20, 30),
            ...Array.from({ length: 600 }, (_, i) => line("C", i / 6, 90, i / 6 + 0.1, 90)),
            line("FAR", 100000, 100000, 100001, 100000),
          ],
        }),
      ),
    );
    expect(g.mainBounds.maxX - g.mainBounds.minX).toBeLessThan(200);
    expect(g.bounds.maxX - g.bounds.minX).toBeGreaterThan(90000);
    expect(g.stats.outliers).toBe(2);
    expect(g.stats.intersections).toBe(1);
    const cad: CadBackground = {
      kind: "dxf",
      fileId: "f",
      fileName: "t.dxf",
      unit: "mm",
      metersPerUnit: 0.001,
      baseX: g.base.x,
      baseY: g.base.y,
      extent: g.mainBounds,
      originX: 10,
      originY: 20,
      hiddenLayers: [],
      opacity: 1,
      locked: true,
      calibrated: false,
    };
    // 交點 (50, 50) 在地圖上: origin + (50 - base) x 0.001
    const at = { x: 10 + (50 - g.base.x) * 0.001, y: 20 + (50 - g.base.y) * 0.001 };
    const hit = findCadSnap(g, cad, hiddenMaskOf(g, []), { x: at.x + 0.002, y: at.y - 0.001 }, 0.005);
    expect(hit?.kind).toBe(SNAP_CROSS);
    expect(close(hit!.point.x, at.x, 1e-6)).toBe(true);
    expect(close(hit!.point.y, at.y, 1e-6)).toBe(true);
    // 隱藏 B: 交點 (A、B 各一條) 吸不到
    expect(findCadSnap(g, cad, hiddenMaskOf(g, ["B"]), { x: at.x + 0.002, y: at.y - 0.001 }, 0.005)).toBeNull();
    // 端點
    const end = { x: 10 + (100 - g.base.x) * 0.001, y: 20 + (0 - g.base.y) * 0.001 };
    expect(findCadSnap(g, cad, hiddenMaskOf(g, []), end, 0.003)?.kind).toBe(SNAP_END);
  });
});
