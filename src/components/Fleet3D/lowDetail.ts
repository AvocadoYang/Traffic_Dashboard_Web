import * as THREE from "three";
import { MeshoptSimplifier } from "meshoptimizer";

/**
 * 車在遠處用的簡化版網格 (LOD): 叉車一台 3 萬多個三角形, 二十台在慢的電腦 (沒有獨立顯示卡) 上每一幀要畫六十幾萬個,
 * 拉遠看整張地圖時車只有幾個像素, 用一成左右的三角形就看不出差別。
 *
 * 只換索引 (哪幾個頂點組成三角形), 頂點資料跟原本的共用, 不多佔記憶體。meshoptimizer 是 wasm, 第一次要等它載好,
 * 所以是非同步的: 第一次問的時候開始算, 算好之前先用原本的。同一個幾何 (每台車共用模型的幾何) 只算一次。
 */

/** 留多少三角形 */
const TARGET_RATIO = 0.12;
/** 容許的誤差 (相對於網格大小) */
const TARGET_ERROR = 0.04;
/** 簡化完還留超過這個比例就不值得換, 照用原本的 */
const WORTH_RATIO = 0.7;
/** 太小的網格不用簡化 */
const MIN_TRIANGLES = 300;

const ready = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry | null>();
const started = new WeakSet<THREE.BufferGeometry>();

/** 位置轉成連續的 Float32 (壓縮過的模型是量化、交錯存的) */
const positionsOf = (g: THREE.BufferGeometry) => {
  const pos = g.getAttribute("position");
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    out[i * 3] = pos.getX(i);
    out[i * 3 + 1] = pos.getY(i);
    out[i * 3 + 2] = pos.getZ(i);
  }
  return out;
};

/** 算簡化版 (MeshoptSimplifier 要先 ready); 不值得簡化回傳 null。測試也用 */
export const simplifyGeometry = (g: THREE.BufferGeometry): THREE.BufferGeometry | null => {
  const index = g.getIndex();
  if (!index || !g.getAttribute("position") || g.groups.length > 1) return null;
  if (index.count / 3 < MIN_TRIANGLES) return null;
  const indices = new Uint32Array(index.count);
  for (let i = 0; i < index.count; i++) indices[i] = index.getX(i);
  const positions = positionsOf(g);
  const target = Math.floor((index.count * TARGET_RATIO) / 3) * 3;
  let [out] = MeshoptSimplifier.simplify(indices, positions, 3, target, TARGET_ERROR, ["Prune"]);
  // CAD 轉出來的模型常常是一塊一塊沒接起來的, 一般的簡化減不下去就用比較粗的方法
  if (out.length > index.count * WORTH_RATIO) [out] = MeshoptSimplifier.simplifySloppy(indices, positions, 3, null, target, TARGET_ERROR);
  if (!out.length || out.length > index.count * WORTH_RATIO) return null;
  const low = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(g.attributes)) low.setAttribute(name, attr);
  const vertexCount = g.getAttribute("position").count;
  low.setIndex(new THREE.BufferAttribute(vertexCount < 65536 ? Uint16Array.from(out) : out, 1));
  if (!g.boundingSphere) g.computeBoundingSphere();
  low.boundingSphere = g.boundingSphere!.clone();
  if (!g.boundingBox) g.computeBoundingBox();
  low.boundingBox = g.boundingBox!.clone();
  return low;
};

/**
 * 這個幾何的遠距離版本: 算好了回傳 (不值得簡化回傳原本的), 還沒好回傳 null 並開始算。
 * onReady: 算好時呼叫 (要求重畫)
 */
export const lowDetailOf = (g: THREE.BufferGeometry, onReady?: () => void): THREE.BufferGeometry | null => {
  if (ready.has(g)) return ready.get(g) ?? g;
  if (!started.has(g)) {
    started.add(g);
    void MeshoptSimplifier.ready
      .then(() => {
        ready.set(g, simplifyGeometry(g));
        onReady?.();
      })
      .catch(() => ready.set(g, null));
  }
  return null;
};
