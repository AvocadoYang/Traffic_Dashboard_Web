import { describe, expect, it } from "vitest";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { optimizeModel } from "../optimizeModel";

/** 一個方塊網格 (中心在原點, 邊長 size) */
const box = (doc: Document, size: number, color: [number, number, number]) => {
  const h = size / 2;
  const p = [
    [-h, -h, -h], [h, -h, -h], [h, h, -h], [-h, h, -h],
    [-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h],
  ].flat();
  const idx = [0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0];
  const buffer = doc.getRoot().listBuffers()[0] ?? doc.createBuffer();
  const prim = doc
    .createPrimitive()
    .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(p)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint16Array(idx)).setBuffer(buffer))
    .setMaterial(doc.createMaterial().setBaseColorFactor([...color, 1]));
  return doc.createMesh().addPrimitive(prim);
};

describe("optimizeModel", () => {
  it("會動的組件 (glb-editor 分群) 留成自己的節點, 其他合成 body; 位置烤進頂點, 顏色變頂點色", async () => {
    const doc = new Document();
    const scene = doc.createScene();
    const truck = doc.createNode("truck").setTranslation([10, 0, 0]);
    truck.addChild(doc.createNode("cab").setMesh(box(doc, 2, [1, 0, 0])));
    // glb-editor 的分群存在節點 extras.group
    truck.addChild(doc.createNode("tines").setExtras({ group: "fork" }).setTranslation([-2, 0, 0]).setMesh(box(doc, 1, [0, 0, 1])));
    scene.addChild(truck);
    const bytes = await new NodeIO().writeBinary(doc);

    const out = await optimizeModel(new File([bytes], "truck.glb"));
    expect(out.hasForks).toBe(true);
    expect(out.trianglesBefore).toBe(24);
    expect(out.file.name).toBe("truck.glb");
    // 整台的範圍: x 從 7.5 (牙叉) 到 11 (車身)
    expect(out.size[0]).toBeCloseTo(3.5, 2);

    await MeshoptDecoder.ready;
    const back = await new NodeIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({ "meshopt.decoder": MeshoptDecoder })
      .readBinary(new Uint8Array(await out.file.arrayBuffer()));
    const names = back.getRoot().listNodes().map((n) => n.getName());
    expect(names).toEqual(expect.arrayContaining(["model", "body", "fork"]));
    const fork = back.getRoot().listNodes().find((n) => n.getName() === "fork")!;
    const prim = fork.listChildren()[0].getMesh()!.listPrimitives()[0];
    expect(prim.getAttribute("COLOR_0")).toBeTruthy();
    expect(prim.getAttribute("NORMAL")).toBeNull();
  });

  it("不是 glb 的檔案丟出格式錯誤", async () => {
    await expect(optimizeModel(new File([new Uint8Array([1, 2, 3, 4])], "x.glb"))).rejects.toThrow();
  });
});
