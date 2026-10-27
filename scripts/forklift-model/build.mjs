/**
 * 把原廠 CAD 匯出的叉車 GLB 轉成前端 3D 檢視用的輕量版 (public/models/forklift.glb)。
 *
 *   cd scripts/forklift-model && npm install
 *   node build.mjs "<原廠 GLB 路徑>" [輸出路徑, 預設 ../../public/models/forklift.glb]
 *
 * 原檔 (MBV1540F993 AGV平衡重叉车, 同事 glb-editor 那包) 有 40MB、約 100 萬個面、4525 個材質,
 * 直接放進網頁太重。這裡做的事:
 *  1. 照組件名稱把零件分成會動的幾組 (PARTS), 鏈條、螺絲這類看不到又很多面的直接丟掉
 *  2. 材質都只是純色 (CAD 預設的金屬度 1.0 在網頁上會變很黑), 顏色烤進頂點色, 整台共用一個材質
 *  3. 每一組合併成一個網格、拿掉法線再簡化 (前端用平面著色), 壓縮 (meshopt + 量化)
 *
 * 輸出的約定 (前端 Fleet3D/forkliftRig.ts 照這個讀):
 *  - 單位公尺、y 朝上; 原點 = 牙叉根部、地面高度 (同 2D 地圖: 車的位置就是叉臂根部)
 *  - 車頭 (車身那一側) 朝 +x, 牙叉朝 -x
 *  - 會動的組件是名為 fork / mast_inner / mast_middle 的節點, 本身不帶變換 (網格掛在子節點上,
 *    量化產生的位移縮放在子節點), 前端直接往上推就好
 *  - 根節點 extras.freeLift: 牙叉自由升高 (內門架開始跟著升之前) 的高度
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Logger, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import { dedup, getBounds, join, prune, quantize, reorder, simplify, transformPrimitive, weld } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

const here = path.dirname(fileURLToPath(import.meta.url));
const [input, output = path.resolve(here, "../../public/models/forklift.glb")] = process.argv.slice(2);
if (!input) {
  console.error('usage: node build.mjs "<原廠 GLB>" [輸出路徑]');
  process.exit(1);
}

/**
 * 零件 -> 組別, 由下往上找祖先的名稱, 第一個對到的規則為準; 都沒對到算車身 (body)。
 * 名稱是原廠的料號開頭 (原檔名稱是 GBK 被當成 Big5 讀的亂碼, 料號部分是正常的)。
 */
const PARTS = [
  // 提升鏈條: 四組共 35 萬個面, 門架伸縮時也沒辦法跟著拉長
  [null, (name) => name.startsWith("LH12")],
  // 叉尖光電 (E3Z): 模型多帶一條 1 公尺長的光束
  [null, (name) => name.startsWith("E3Z")],
  // GB 開頭是國標件 (螺絲、螺帽、墊圈、軸承), 都很小、大多在裡面
  [null, (name) => name.startsWith("GB")],
  ["mast_middle", (name) => name.startsWith("1BV815S-C0000")], // 中門架
  ["mast_inner", (name) => name.startsWith("1BV815S-D0000")], // 內門架
  ["fork", (name) => name.startsWith("1BV815S-F0000")], // 貨叉架 (含牙叉、擋貨架)
];

/** 原檔座標 (公尺, y 朝上, 牙叉朝 +z) 裡的地面高度與牙叉根部 */
const FLOOR_Y = -0.07;
const FORK_ROOT_Z = -0.2;

/** 簡化的誤差上限 (網格半徑的比例) */
const SIMPLIFY_ERROR = 0.002;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
const doc = await io.read(input);
doc.setLogger(new Logger(Logger.Verbosity.WARN));
const root = doc.getRoot();
const scene = root.listScenes()[0];
const sourceNodes = root.listNodes();

const partOf = (node) => {
  for (let n = node; n; n = n.getParentNode()) {
    for (const [part, test] of PARTS) if (test(n.getName())) return part;
  }
  return "body";
};

// 原檔 -> 輸出: 先平移 (牙叉根部、地面到原點), 再繞 y 轉 -90 度 (+z -> -x): (x, y, z) -> (-z, y, x)
// gl-matrix 的格式 (直行優先)
const toOutput = [0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, FORK_ROOT_Z, -FLOOR_Y, 0, 1];
const multiply = (a, b) => {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    }
  }
  return out;
};

const buffer = root.listBuffers()[0];
const material = doc
  .createMaterial("paint")
  .setBaseColorFactor([1, 1, 1, 1])
  .setMetallicFactor(0.1)
  .setRoughnessFactor(0.7)
  .setDoubleSided(true);
const rig = doc.createNode("forklift");
const meshes = new Map();
for (const name of ["body", "mast_middle", "mast_inner", "fork"]) {
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
  simplify({ simplifier: MeshoptSimplifier, ratio: 0, error: SIMPLIFY_ERROR }),
  prune(),
);

const top = (name) => getBounds(rig.listChildren().find((n) => n.getName() === name)).max[1];
const freeLift = Math.max(0, Math.round((top("mast_inner") - top("fork")) * 100) / 100);
rig.setExtras({ freeLift });

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
console.log(`共 ${total} 面 (保留 ${kept} 個零件, 丟掉 ${dropped} 個), freeLift ${freeLift} m`);

await doc.transform(reorder({ encoder: MeshoptEncoder }), quantize());
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
await io.write(output, doc);
console.log(`-> ${output}`);
