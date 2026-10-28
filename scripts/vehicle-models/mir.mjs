/**
 * 把 MiR 原廠的 STEP 模型轉成前端 3D 檢視用的輕量版 (public/models/mir250.glb)。
 *
 *   cd scripts/vehicle-models && npm install
 *   node --max-old-space-size=1500 --expose-gc mir.mjs "<MiR250.stp 或先轉好的 .glb>" [輸出路徑] [--raw 網格化結果.glb]
 *
 * 原檔是整台車的完整組件 (Autodesk Inventor 匯出, 161MB, 191 個零件)。螺絲、電路板、相機內部這些
 * 外面看不到又很多面的零件 (DROP) 先在 STEP 文字裡拿掉 (stepPrune.mjs), 不然 OpenCascade
 * 網格化 (step.mjs) 要超過 2GB 記憶體; 拿掉之後還有 80MB, 所以再分批 (每批 25MB 以內) 網格化。反覆調後面的處理時
 * 可以加 --raw 把網格化的結果存下來, 下次直接拿那個 .glb 當輸入。其餘處理見 common.mjs。
 *
 * 輸出的約定 (前端 Fleet3D/Vehicle3D.tsx 的 MirVehicle 照這個讀):
 *  單位公尺、y 朝上; 原點在車身中心的地面 (MiR 的位置是車的中心); 車頭朝 +x
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getBounds } from "@gltf-transform/functions";
import { buildParts, createIO, reportTriangles, writeCompressed } from "./common.mjs";
import { Document } from "@gltf-transform/core";
import { readStepInto } from "./step.mjs";
import { pruneStep, topLevelParts } from "./stepPrune.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const rawAt = args.indexOf("--raw");
const raw = rawAt >= 0 ? args.splice(rawAt, 2)[1] : null;
const [input, output = path.resolve(here, "../../public/models/mir250.glb")] = args;
if (!input) {
  console.error('usage: node mir.mjs "<MiR250.stp 或 .glb>" [輸出路徑] [--raw 網格化結果.glb]');
  process.exit(1);
}

/** 外面看不到又很多面的零件 (STEP 的零件名稱; 組件丟掉的話底下全部一起丟) */
const DROP = [
  // 螺絲、螺帽、墊圈、鉚釘
  /^BN \d|^DIN|^KVT|Emhart|^KM \d|^MB \d|screw|washer|rivet|O-ring|MAGNET|PIN_STEEL|threaded pin/i,
  // 電路板、接頭、天線、線槽
  /PCBA|Shrinkwrap|Molex|^2070[89]|ID_50_PIN|SMA9105|antenna|1053101104|MCB-11|DIN rail|DG-PVC/i,
  // 前面蓋板後面的 RealSense 相機 (含一個「視野範圍」的錐體)
  /D435|DS5|AWG|RealSense|CAMERA|LENS|BARCODE|ADHESIVE|FOAM|HEATSINK|B2B_BRACKET|PASTE_THERMAL|FPC_|Optical filter/i,
  // 馬達、軸承、標籤
  /Motor_not_AB|shaft_nidec|Igus_bearing|^Label$|LABEL/i,
];

/** 一批最多多大的 STEP (位元組): OpenCascade 讀進來大概要十幾倍的記憶體, WebAssembly 最多 2GB */
const CHUNK_BYTES = 25 << 20;
const dropPart = (id) => DROP.some((re) => re.test(id));

/** 讀 STEP、只留這一批的零件; 原檔的文字和解析的結果出了這個函式就可以回收, 網格化時記憶體才夠 */
const chunkStep = (file, root, chunk) => {
  const text = fs.readFileSync(file, "latin1");
  const pruned = pruneStep(text, (id, parent) => dropPart(id) || (parent === root && !chunk.has(id)));
  return Buffer.from(pruned.text, "latin1");
};

const io = createIO();
let doc;
if (/\.(stp|step)$/i.test(input)) {
  const t0 = Date.now();
  // 最上層組件底下的子件分成幾批 (每批都保留最上層組件, 位置才對), 一批一批網格化
  const { root, parts } = topLevelParts(fs.readFileSync(input, "latin1"), dropPart);
  const chunks = [];
  for (const p of [...parts].sort((x, y) => y.bytes - x.bytes)) {
    const fit = chunks.find((c) => c.bytes + p.bytes <= CHUNK_BYTES);
    if (fit) {
      fit.ids.add(p.id);
      fit.bytes += p.bytes;
    } else chunks.push({ ids: new Set([p.id]), bytes: p.bytes });
  }
  console.log(`${parts.length} 個子件分成 ${chunks.length} 批`);
  doc = new Document();
  for (const [i, c] of chunks.entries()) {
    globalThis.gc?.();
    await readStepInto(doc, chunkStep(input, root, c.ids), 0.002);
    console.log(`第 ${i + 1} 批 (${c.bytes >> 20}MB) 網格化完, ${Math.round((Date.now() - t0) / 1000)} 秒`);
  }
  if (raw) {
    await io.write(raw, doc);
    console.log(`網格化的結果存在 ${raw}`);
  }
} else {
  doc = await io.read(input);
}

// 原檔座標 -> 輸出: 先算原檔裡車的範圍, 再決定怎麼轉
const scene = doc.getRoot().listScenes()[0];
const b = getBounds(scene);
console.log("原檔範圍", b.min.map((v) => v.toFixed(3)), b.max.map((v) => v.toFixed(3)));

// 原檔: 公尺, z 朝上, 中心已經在原點、地面 z = 0, 長邊是 x。轉成 y 朝上: (x, y, z) -> (x, z, -y)
const toOutput = [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1];

const { rig, kept, dropped } = await buildParts(doc, {
  rootName: "mir",
  parts: ["body"],
  partOf: () => "body",
  toOutput,
  simplifyError: 0.006,
});
const total = reportTriangles(rig);
console.log(`共 ${total} 面 (保留 ${kept} 個零件, 丟掉 ${dropped} 個)`);
await writeCompressed(io, doc, output);
