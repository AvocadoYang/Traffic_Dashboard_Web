import { Document, Logger, Node, Primitive, WebIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import { dedup, join, prune, quantize, reorder, simplify, transformPrimitive, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

/**
 * 車型上傳的 3D 模型在瀏覽器裡先減面壓縮再上傳 (做法同 scripts/vehicle-models/common.mjs):
 * CAD 匯出的模型常常幾十 MB、上百萬個面, 一台車就畫不動。
 *
 * 顏色烤進頂點色、整台共用一個材質 (貼圖不留), 會動的組件 (節點名稱或 glb-editor 分群是
 * fork / mast_inner / mast_middle / guard) 各合併成一個節點, 其他合併成 body; 拿掉法線再簡化, 最後壓縮。
 * 只換結構, 不動方向和單位: 方向在車型設定轉, 大小照車型的長度縮放 (見 Fleet3D/vehicleModels)。
 */

export const MOVING_PARTS = ["fork", "mast_inner", "mast_middle", "guard"] as const;

/** 簡化的誤差上限 (網格大小的比例): 先試小的, 還是太多面再放寬 */
const SIMPLIFY_STEPS = [0.002, 0.006, 0.02];
/** 一台車最多這麼多面 (首頁可能同時好幾十台) */
const MAX_TRIANGLES = 60_000;

export type OptimizeResult = {
  file: File;
  /** 原本 / 處理後的面數 */
  trianglesBefore: number;
  trianglesAfter: number;
  /** 有牙叉 (牙叉會升降、貨放牙叉上) */
  hasForks: boolean;
  /** 處理後的範圍 (原檔單位) */
  size: [number, number, number];
};

export class ModelFormatError extends Error {}

const partName = (node: Node) => {
  const group = (node.getExtras() as { group?: unknown }).group;
  const key = typeof group === "string" ? group : node.getName();
  return (MOVING_PARTS as readonly string[]).includes(key) ? key : null;
};

/** 這個節點屬於哪一組: 由下往上找第一個會動的組件, 都不是算 body */
const partOf = (node: Node) => {
  for (let n: Node | null = node; n; n = n.getParentNode()) {
    const part = partName(n);
    if (part) return part;
  }
  return "body";
};

const triangles = (prims: Primitive[]) =>
  prims.reduce((sum, p) => sum + (p.getIndices()?.getCount() ?? p.getAttribute("POSITION")?.getCount() ?? 0) / 3, 0);

const createIO = async () => {
  await MeshoptDecoder.ready;
  await MeshoptEncoder.ready;
  return new WebIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
};

export async function optimizeModel(input: File, onStep?: (step: "read" | "simplify" | "write") => void): Promise<OptimizeResult> {
  onStep?.("read");
  const io = await createIO();
  let doc: Document;
  try {
    doc = await io.readBinary(new Uint8Array(await input.arrayBuffer()));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Draco 解碼器要另外下載, 工廠內網常常連不到, 不支援
    if (/draco/i.test(message)) throw new ModelFormatError("draco");
    throw new ModelFormatError(message);
  }
  doc.setLogger(new Logger(Logger.Verbosity.ERROR));
  const root = doc.getRoot();
  const scene = root.getDefaultScene() ?? root.listScenes()[0];
  if (!scene) throw new ModelFormatError("empty");
  const trianglesBefore = triangles(root.listMeshes().flatMap((m) => m.listPrimitives()));
  if (!trianglesBefore) throw new ModelFormatError("empty");

  // 牙叉自由升高的高度 (glb-editor / 內建叉車的根節點 extras), 留著
  let freeLift: number | null = null;
  scene.traverse((n) => {
    const v = (n.getExtras() as { freeLift?: unknown }).freeLift;
    if (typeof v === "number") freeLift = v;
  });

  onStep?.("simplify");
  const buffer = root.listBuffers()[0] ?? doc.createBuffer();
  const material = doc
    .createMaterial("paint")
    .setBaseColorFactor([1, 1, 1, 1])
    .setMetallicFactor(0.1)
    .setRoughnessFactor(0.7)
    .setDoubleSided(true);
  const rig = doc.createNode("model");
  const meshes = new Map<string, ReturnType<Document["createMesh"]>>();
  const meshOf = (part: string) => {
    let mesh = meshes.get(part);
    if (!mesh) {
      mesh = doc.createMesh(part);
      rig.addChild(doc.createNode(part).addChild(doc.createNode(`${part}_mesh`).setMesh(mesh)));
      meshes.set(part, mesh);
    }
    return mesh;
  };

  const sourceNodes: Node[] = [];
  scene.traverse((n) => sourceNodes.push(n));
  for (const node of sourceNodes) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const matrix = node.getWorldMatrix();
    const target = meshOf(partOf(node));
    for (const prim of mesh.listPrimitives()) {
      // 線、點不要 (CAD 有時候會帶邊線)
      if (prim.getMode() !== Primitive.Mode.TRIANGLES) continue;
      // 網格可能被好幾個節點共用, 先複製一份再變換, 才不會被轉兩次
      const copy = prim.clone();
      for (const semantic of copy.listSemantics()) {
        copy.setAttribute(semantic, semantic === "POSITION" ? copy.getAttribute(semantic)!.clone() : null);
      }
      if (copy.getIndices()) copy.setIndices(copy.getIndices()!.clone());
      transformPrimitive(copy, matrix);

      const [r, g, b] = prim.getMaterial()?.getBaseColorFactor() ?? [0.6, 0.6, 0.6, 1];
      const count = copy.getAttribute("POSITION")!.getCount();
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) colors.set([r, g, b], i * 3);
      copy.setAttribute("COLOR_0", doc.createAccessor().setType("VEC3").setArray(colors).setBuffer(buffer));
      copy.setMaterial(material);
      target.addPrimitive(copy);
    }
  }
  for (const child of scene.listChildren()) scene.removeChild(child);
  for (const node of sourceNodes) node.dispose();
  scene.addChild(rig);
  if (freeLift !== null) rig.setExtras({ freeLift });

  await doc.transform(prune(), dedup(), join({ keepMeshes: true, keepNamed: true }), weld());
  for (const error of SIMPLIFY_STEPS) {
    await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: 0, error }), prune());
    if (triangles(root.listMeshes().flatMap((m) => m.listPrimitives())) <= MAX_TRIANGLES) break;
  }
  const trianglesAfter = triangles(root.listMeshes().flatMap((m) => m.listPrimitives()));

  onStep?.("write");
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION")!;
      const lo = pos.getMin([0, 0, 0]);
      const hi = pos.getMax([0, 0, 0]);
      min = min.map((v, i) => Math.min(v, lo[i]));
      max = max.map((v, i) => Math.max(v, hi[i]));
    }
  }
  await doc.transform(reorder({ encoder: MeshoptEncoder }), quantize());
  doc
    .createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  const bytes = await io.writeBinary(doc);
  const name = input.name.replace(/\.(glb|gltf)$/i, "") + ".glb";
  return {
    file: new File([bytes], name, { type: "model/gltf-binary" }),
    trianglesBefore: Math.round(trianglesBefore),
    trianglesAfter: Math.round(trianglesAfter),
    hasForks: meshes.has("fork"),
    size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]],
  };
}
