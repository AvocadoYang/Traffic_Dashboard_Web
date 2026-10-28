/**
 * 車輛模型 (叉車、MiR) 共用的處理: CAD 匯出的模型零件很多、面很多, 材質都只是純色,
 * 直接放進網頁太重。這裡把零件照規則分組 (或丟掉), 顏色烤進頂點色、整台共用一個材質,
 * 每一組合併成一個網格、拿掉法線再簡化 (前端用平面著色), 最後壓縮 (meshopt + 量化)。
 *
 * 輸出: 根節點底下每一組一個節點 (本身不帶變換, 網格掛在子節點上, 量化產生的位移縮放在子節點),
 * 前端要動哪一組直接移那個節點就好。
 */
import { Logger, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import { dedup, join, prune, quantize, reorder, simplify, transformPrimitive, weld } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

export const createIO = () =>
  new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });

/**
 * 零件 -> 組別: 由下往上找祖先的名稱, 第一個對到的規則為準 (組別是 null 就丟掉); 都沒對到算 fallback
 * @param {[string | null, (name: string) => boolean][]} rules
 */
export const partByAncestors = (rules, fallback) => (node) => {
  for (let n = node; n; n = n.getParentNode()) {
    for (const [part, test] of rules) if (test(n.getName())) return part;
  }
  return fallback;
};

/** 4x4 矩陣相乘 (gl-matrix 的格式, 直行優先) */
export const multiply = (a, b) => {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    }
  }
  return out;
};

/**
 * 零件分組、合併、簡化 (還沒壓縮, 呼叫的人可以先看範圍、寫 extras)。
 * @param {import("@gltf-transform/core").Document} doc
 * @param {{ rootName: string; parts: string[]; partOf: (node) => string | null; toOutput: number[]; simplifyError: number }} options
 *   toOutput: 原檔座標 -> 輸出座標; simplifyError: 簡化的誤差上限 (網格半徑的比例)
 */
export async function buildParts(doc, { rootName, parts, partOf, toOutput, simplifyError }) {
  doc.setLogger(new Logger(Logger.Verbosity.WARN));
  const root = doc.getRoot();
  const scene = root.listScenes()[0];
  const sourceNodes = root.listNodes();
  const buffer = root.listBuffers()[0];
  const material = doc
    .createMaterial("paint")
    .setBaseColorFactor([1, 1, 1, 1])
    .setMetallicFactor(0.1)
    .setRoughnessFactor(0.7)
    .setDoubleSided(true);
  const rig = doc.createNode(rootName);
  const meshes = new Map();
  for (const name of parts) {
    const mesh = doc.createMesh(name);
    rig.addChild(doc.createNode(name).addChild(doc.createNode(`${name}_mesh`).setMesh(mesh)));
    meshes.set(name, mesh);
  }

  let kept = 0;
  let dropped = 0;
  for (const node of sourceNodes) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const part = partOf(node);
    if (!part) {
      dropped++;
      continue;
    }
    kept++;
    const matrix = multiply(toOutput, node.getWorldMatrix());
    for (const prim of mesh.listPrimitives()) {
      // 原檔有些網格共用同一份頂點資料, 先複製一份再變換, 才不會被轉兩次
      const copy = prim.clone();
      copy.setAttribute("NORMAL", null);
      for (const semantic of copy.listSemantics()) copy.setAttribute(semantic, copy.getAttribute(semantic).clone());
      if (copy.getIndices()) copy.setIndices(copy.getIndices().clone());
      transformPrimitive(copy, matrix);

      const [r, g, b] = prim.getMaterial()?.getBaseColorFactor() ?? [0.6, 0.6, 0.6, 1];
      const count = copy.getAttribute("POSITION").getCount();
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) colors.set([r, g, b], i * 3);
      copy.setAttribute("COLOR_0", doc.createAccessor().setType("VEC3").setArray(colors).setBuffer(buffer));
      copy.setMaterial(material);
      meshes.get(part).addPrimitive(copy);
    }
  }
  for (const child of scene.listChildren()) scene.removeChild(child);
  for (const node of sourceNodes) node.dispose();
  scene.addChild(rig);

  await doc.transform(
    prune(),
    dedup(),
    join({ keepMeshes: true, keepNamed: true }),
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: 0, error: simplifyError }),
    prune(),
  );
  return { rig, kept, dropped };
}

/** 每一組幾個面, 印出來對一下 */
export function reportTriangles(rig) {
  let total = 0;
  for (const node of rig.listChildren()) {
    const triangles = node
      .listChildren()[0]
      .getMesh()
      .listPrimitives()
      .reduce((sum, p) => sum + p.getIndices().getCount() / 3, 0);
    total += triangles;
    console.log(`${node.getName().padEnd(12)} ${String(triangles).padStart(7)} 面`);
  }
  return total;
}

export async function writeCompressed(io, doc, output) {
  await doc.transform(reorder({ encoder: MeshoptEncoder }), quantize());
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  await io.write(output, doc);
  console.log(`-> ${output}`);
}
