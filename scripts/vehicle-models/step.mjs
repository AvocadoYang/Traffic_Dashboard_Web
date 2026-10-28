/**
 * STEP (CAD 的實體格式) 用 OpenCascade (occt-import-js, WebAssembly 版) 網格化,
 * 加進 gltf-transform 的 Document: 保留零件的層級和名稱, 顏色變成材質。
 * 記憶體大約是檔案大小的十幾倍, 大檔先用 stepPrune 拿掉不要的零件再進來。
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const occtimportjs = require("occt-import-js");

/**
 * 網格化一份 STEP, 結果加進 doc (第一個場景底下); 分批網格化時同一個 doc 呼叫好幾次
 * @param {Document} doc
 * @param {Uint8Array} content STEP 檔的內容
 * @param {number} deflection 網格化的誤差 (公尺): 曲面切成平面時最多差多少
 */
export async function readStepInto(doc, content, deflection) {
  const occt = await occtimportjs();
  const result = occt.ReadStepFile(content, {
    linearUnit: "meter",
    linearDeflectionType: "absolute_value",
    linearDeflection: deflection,
    angularDeflection: 0.5,
  });
  if (!result.success) throw new Error("OpenCascade 讀不了這個 STEP");

  const root = doc.getRoot();
  const buffer = root.listBuffers()[0] ?? doc.createBuffer();
  const scene = root.listScenes()[0] ?? doc.createScene();
  const materials = new Map();
  const materialOf = (color) => {
    const key = color ? color.join(",") : "none";
    if (!materials.has(key)) materials.set(key, doc.createMaterial(key).setBaseColorFactor(color ? [...color, 1] : [0.7, 0.7, 0.7, 1]));
    return materials.get(key);
  };
  const meshes = result.meshes.map((m) => {
    const mesh = doc.createMesh(m.name);
    // 同一個零件的面可能各有顏色: 照顏色拆成幾個 primitive
    const groups = new Map();
    const faces = m.brep_faces?.length ? m.brep_faces : [{ first: 0, last: m.index.array.length / 3 - 1, color: null }];
    for (const f of faces) {
      const color = f.color ?? m.color ?? null;
      const key = color ? color.join(",") : "none";
      if (!groups.has(key)) groups.set(key, { color, index: [] });
      const g = groups.get(key);
      for (let t = f.first; t <= f.last; t++) g.index.push(m.index.array[t * 3], m.index.array[t * 3 + 1], m.index.array[t * 3 + 2]);
    }
    const position = doc.createAccessor().setType("VEC3").setArray(new Float32Array(m.attributes.position.array)).setBuffer(buffer);
    for (const { color, index } of groups.values()) {
      mesh.addPrimitive(
        doc
          .createPrimitive()
          .setAttribute("POSITION", position)
          .setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint32Array(index)).setBuffer(buffer))
          .setMaterial(materialOf(color)),
      );
    }
    return mesh;
  });
  const build = (n) => {
    const node = doc.createNode(n.name || "");
    for (const i of n.meshes ?? []) node.addChild(doc.createNode(result.meshes[i].name || "").setMesh(meshes[i]));
    for (const c of n.children ?? []) node.addChild(build(c));
    return node;
  };
  scene.addChild(build(result.root));
  return doc;
}
