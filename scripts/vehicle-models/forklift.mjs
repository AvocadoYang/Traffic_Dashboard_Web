/**
 * 把原廠 CAD 匯出的叉車 GLB 轉成前端 3D 檢視用的輕量版 (public/models/forklift.glb)。
 *
 *   cd scripts/vehicle-models && npm install
 *   node forklift.mjs "<原廠 GLB 路徑>" [輸出路徑, 預設 ../../public/models/forklift.glb]
 *
 * 原檔 (MBV1540F993 AGV平衡重叉车, 同事 glb-editor 那包) 有 40MB、約 100 萬個面、4525 個材質。
 * 照組件名稱把零件分成會動的幾組 (PARTS), 鏈條、螺絲這類看不到又很多面的直接丟掉,
 * 其餘處理見 common.mjs。
 *
 * 輸出的約定 (前端 Fleet3D/forkliftRig.ts 照這個讀):
 *  - 單位公尺、y 朝上; 原點 = 牙叉根部、地面高度 (同 2D 地圖: 車的位置就是叉臂根部)
 *  - 車頭 (車身那一側) 朝 +x, 牙叉朝 -x
 *  - 會動的組件是名為 fork / mast_inner / mast_middle 的節點
 *  - 根節點 extras.freeLift: 牙叉自由升高 (內門架開始跟著升之前) 的高度
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getBounds } from "@gltf-transform/functions";
import { buildParts, createIO, partByAncestors, reportTriangles, writeCompressed } from "./common.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const [input, output = path.resolve(here, "../../public/models/forklift.glb")] = process.argv.slice(2);
if (!input) {
  console.error('usage: node forklift.mjs "<原廠 GLB>" [輸出路徑]');
  process.exit(1);
}

/** 名稱是原廠的料號開頭 (原檔名稱是 GBK 被當成 Big5 讀的亂碼, 料號部分是正常的); 都沒對到算車身 */
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

const io = createIO();
const doc = await io.read(input);
const { rig, kept, dropped } = await buildParts(doc, {
  rootName: "forklift",
  parts: ["body", "mast_middle", "mast_inner", "fork"],
  partOf: partByAncestors(PARTS, "body"),
  // 先平移 (牙叉根部、地面到原點), 再繞 y 轉 -90 度 (+z -> -x): (x, y, z) -> (-z, y, x)
  toOutput: [0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, FORK_ROOT_Z, -FLOOR_Y, 0, 1],
  simplifyError: 0.002,
});

const top = (name) => getBounds(rig.listChildren().find((n) => n.getName() === name)).max[1];
const freeLift = Math.max(0, Math.round((top("mast_inner") - top("fork")) * 100) / 100);
rig.setExtras({ freeLift });

const total = reportTriangles(rig);
console.log(`共 ${total} 面 (保留 ${kept} 個零件, 丟掉 ${dropped} 個), freeLift ${freeLift} m`);
await writeCompressed(io, doc, output);
