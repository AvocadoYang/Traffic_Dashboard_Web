import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { Line2, LineGeometry, LineMaterial } from "three-stdlib";
import { writeAttribute, writeLine2, writeSegmentDistances } from "../buffers";

describe("buffers", () => {
  it("長度一樣原地改 (同一個屬性), 不一樣才換新的", () => {
    const g = new THREE.BufferGeometry();
    const a = writeAttribute(g, "position", [0, 0, 0, 1, 1, 1], 3);
    const b = writeAttribute(g, "position", [2, 2, 2, 3, 3, 3], 3);
    expect(b).toBe(a);
    expect(Array.from(g.getAttribute("position").array)).toEqual([2, 2, 2, 3, 3, 3]);
    let disposed = 0;
    g.addEventListener("dispose", () => disposed++);
    const c = writeAttribute(g, "position", [0, 0, 0], 3);
    expect(c).not.toBe(a);
    expect(disposed).toBe(1);
  });

  it("線段的虛線距離跟 three 自己算的一樣", () => {
    const pos = [0, 0, 0, 3, 4, 0, 3, 4, 0, 3, 4, 2];
    const mine = new THREE.LineSegments(new THREE.BufferGeometry());
    writeAttribute(mine.geometry, "position", pos, 3);
    writeSegmentDistances(mine.geometry);
    const theirs = new THREE.LineSegments(new THREE.BufferGeometry());
    theirs.geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    theirs.computeLineDistances();
    expect(Array.from(mine.geometry.getAttribute("lineDistance").array)).toEqual(Array.from(theirs.geometry.getAttribute("lineDistance").array));
  });

  it("Line2 點數一樣原地改, 結果跟 setPositions + computeLineDistances 一樣", () => {
    const a = new Float32Array([0, 0, 0, 1, 0, 0, 1, 2, 0]);
    const b = new Float32Array([0, 0, 0, 0, 3, 0, 4, 3, 0]);
    const line = new Line2(new LineGeometry(), new LineMaterial());
    writeLine2(line, a);
    const buffer = (line.geometry.getAttribute("instanceStart") as THREE.InterleavedBufferAttribute).data;
    writeLine2(line, b);
    expect((line.geometry.getAttribute("instanceStart") as THREE.InterleavedBufferAttribute).data).toBe(buffer);
    const ref = new Line2(new LineGeometry(), new LineMaterial());
    ref.geometry.setPositions(b);
    ref.computeLineDistances();
    const arr = (l: Line2, n: string) => Array.from((l.geometry.getAttribute(n) as THREE.InterleavedBufferAttribute).data.array);
    expect(arr(line, "instanceStart")).toEqual(arr(ref, "instanceStart"));
    expect(arr(line, "instanceDistanceStart")).toEqual(arr(ref, "instanceDistanceStart"));
  });
});
