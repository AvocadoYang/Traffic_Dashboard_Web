import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { rigForklift } from "../forkliftRig";

const worldY = (o: THREE.Object3D) => {
  o.updateWorldMatrix(true, false);
  return new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).y;
};

/** 跟 scripts/vehicle-models/forklift.mjs 產生的模型一樣: 根節點帶 freeLift, 組件本身不帶變換 */
const model = (freeLift: number) => {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  rig.userData.freeLift = freeLift;
  root.add(rig);
  for (const name of ["body", "mast_middle", "mast_inner", "fork"]) {
    const part = new THREE.Group();
    part.name = name;
    rig.add(part);
  }
  return root;
};

describe("rigForklift", () => {
  it("牙叉升多少就移多少; 超過自由升高後內門架跟著升, 中門架升一半", () => {
    const root = model(0.8);
    const rig = rigForklift(root);
    const part = (name: string) => root.getObjectByName(name)!;

    rig.setLift(0.5);
    expect(worldY(part("fork"))).toBeCloseTo(0.5);
    expect(worldY(part("mast_inner"))).toBeCloseTo(0);
    expect(worldY(part("mast_middle"))).toBeCloseTo(0);

    rig.setLift(2);
    expect(worldY(part("fork"))).toBeCloseTo(2);
    expect(worldY(part("mast_inner"))).toBeCloseTo(1.2);
    expect(worldY(part("mast_middle"))).toBeCloseTo(0.6);
    expect(worldY(part("body"))).toBeCloseTo(0);

    rig.setLift(0);
    expect(worldY(part("fork"))).toBeCloseTo(0);
    expect(worldY(part("mast_inner"))).toBeCloseTo(0);
  });

  it("組件原本的位置、父節點的縮放旋轉 (CAD 的公分單位) 都照算, 升的是模型的上方", () => {
    const root = new THREE.Group();
    const cad = new THREE.Group();
    cad.scale.setScalar(0.01);
    cad.rotation.x = Math.PI / 2;
    root.add(cad);
    const fork = new THREE.Group();
    fork.userData.group = "fork";
    fork.position.set(10, 20, 30);
    cad.add(fork);
    fork.updateWorldMatrix(true, false);
    const before = new THREE.Vector3().setFromMatrixPosition(fork.matrixWorld);

    rigForklift(root).setLift(1.5);
    fork.updateWorldMatrix(true, false);
    const after = new THREE.Vector3().setFromMatrixPosition(fork.matrixWorld);
    expect(after.x - before.x).toBeCloseTo(0);
    expect(after.y - before.y).toBeCloseTo(1.5);
    expect(after.z - before.z).toBeCloseTo(0);
  });

  it("標了組件的節點底下不再找 (整組一起動, 不會移兩次)", () => {
    const root = model(0.8);
    const inner = new THREE.Group();
    inner.name = "fork";
    root.getObjectByName("fork")!.add(inner);
    rigForklift(root).setLift(1);
    expect(worldY(inner)).toBeCloseTo(1);
  });
});
