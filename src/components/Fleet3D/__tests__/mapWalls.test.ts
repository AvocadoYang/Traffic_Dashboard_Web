import { describe, expect, it } from "vitest";
import { mergeDarkPixels } from "../MapWalls3D";
import { parsePgm } from "@/utils/pgm";

const img = (rows: string[]) => {
  const h = rows.length;
  const w = rows[0].length;
  const d = new Uint8ClampedArray(w * h * 4);
  rows.forEach((r, y) =>
    [...r].forEach((c, x) => {
      const v = c === "#" ? 0 : 255;
      d.set([v, v, v, 255], (y * w + x) * 4);
    }),
  );
  return { d, w, h };
};

describe("mergeDarkPixels", () => {
  it("同範圍的上下列合成一塊", () => {
    const { d, w, h } = img(["..##..", "..##..", "......", "#....#"]);
    const boxes = mergeDarkPixels(d, w, h);
    expect(boxes).toContainEqual({ x0: 2, x1: 4, y0: 0, y1: 2 });
    expect(boxes).toHaveLength(3);
  });
  it("沒有黑色就沒有牆", () => {
    const { d, w, h } = img(["....", "...."]);
    expect(mergeDarkPixels(d, w, h)).toEqual([]);
  });
});

describe("parsePgm", () => {
  it("P5 二進位, 檔頭有註解", () => {
    const head = new TextEncoder().encode("P5\n# CREATOR: map_saver\n3 2\n255\n");
    const buf = new Uint8Array([...head, 0, 205, 254, 254, 205, 0]);
    const p = parsePgm(buf.buffer);
    expect([p.width, p.height, p.maxVal]).toEqual([3, 2, 255]);
    expect([...p.pixels]).toEqual([0, 205, 254, 254, 205, 0]);
  });
  it("P2 文字", () => {
    const p = parsePgm(new TextEncoder().encode("P2 2 1 255 0 255").buffer);
    expect([...p.pixels]).toEqual([0, 255]);
  });
  it("不是 PGM 就報錯", () => {
    expect(() => parsePgm(new TextEncoder().encode("PNG").buffer)).toThrow();
  });
});
