/**
 * 把 M68-A01 滾筒 AGV (車名含 SW15 的車) 原廠 CAD 匯出的 GLB 轉成前端 3D 檢視用的輕量版 (public/models/m68.glb)。
 *
 *   cd scripts/vehicle-models && npm install
 *   node m68.mjs "<M68-A01-AGV.glb>" [輸出路徑, 預設 ../../public/models/m68.glb]
 *
 * 原檔 (同事 glb-editor 那包) 11MB、約 23 萬個面。車頂一排滾筒 (滾筒軸沿著長邊, 貨往短邊的方向送),
 * 兩端有翻起來擋貨的擋塊 (Stopper), 滾筒兩側有綠色側導。兩個舵輪、兩個光達都在對角,
 * 從外型看不出車頭: 這裡把長邊當行進方向, 原點那一端 (原檔 z = 0) 當車頭;
 * 方向不對的話在車型設定的 3D 模型轉 90 / 180 度就好, 不用重轉。
 *
 * 輸出的約定 (前端 Fleet3D/Vehicle3D.tsx 照這個讀):
 *  - 單位公尺、y 朝上; 原點在車身中心的地面; 車頭朝 +x
 *  - guard: 擋塊和側導 (擋板相關的告警閃這組); 其他是 body
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getBounds } from "@gltf-transform/functions";
import { buildParts, createIO, partByAncestors, reportTriangles, writeCompressed } from "./common.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const [input, output = path.resolve(here, "../../public/models/m68.glb")] = process.argv.slice(2);
if (!input) {
  console.error('usage: node m68.mjs "<M68-A01-AGV.glb>" [輸出路徑]');
  process.exit(1);
}

const PARTS = [
  // 車身裡面的電池、接頭、舵輪 (外殼包著, 從上面看不到)
  [null, (name) => /高達電池|安德森|電池|電磁側導|舵機/.test(name)],
  ["guard", (name) => /Stopper|擋塊|側導/.test(name)],
];

/** 原檔座標 (公尺, y 朝上, 長邊沿 z) 裡的車身中心和地面 (輪子底) */
const CENTER_X = 0.08;
const CENTER_Z = -0.885;
const FLOOR_Y = -0.12;

const io = createIO();
const doc = await io.read(input);
const { rig, kept, dropped } = await buildParts(doc, {
  rootName: "m68",
  parts: ["body", "guard"],
  partOf: partByAncestors(PARTS, "body"),
  // 先平移 (車身中心、地面到原點), 再繞 y 轉 90 度 (+z -> +x): (x, y, z) -> (z, y, -x)
  toOutput: [0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, -CENTER_Z, -FLOOR_Y, CENTER_X, 1],
  simplifyError: 0.003,
});

const b = getBounds(rig);
console.log("輸出範圍", b.min.map((v) => v.toFixed(3)), b.max.map((v) => v.toFixed(3)));
const total = reportTriangles(rig);
console.log(`共 ${total} 面 (保留 ${kept} 個零件, 丟掉 ${dropped} 個)`);
await writeCompressed(io, doc, output);
