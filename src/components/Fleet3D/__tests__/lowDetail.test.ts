import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { MeshoptSimplifier } from "meshoptimizer";
import { simplifyGeometry } from "../lowDetail";

describe("lowDetail", () => {
  it("密的網格減到一成多, 頂點資料跟原本共用", async () => {
    await MeshoptSimplifier.ready;
    const g = new THREE.SphereGeometry(1, 96, 64);
    const low = simplifyGeometry(g)!;
    expect(low).not.toBeNull();
    expect(low.getIndex()!.count).toBeLessThan(g.getIndex()!.count * 0.3);
    expect(low.getAttribute("position")).toBe(g.getAttribute("position"));
    expect(low.getAttribute("normal")).toBe(g.getAttribute("normal"));
  });

  it("三角形很少的不用簡化", async () => {
    await MeshoptSimplifier.ready;
    expect(simplifyGeometry(new THREE.BoxGeometry(1, 1, 1))).toBeNull();
  });
});
