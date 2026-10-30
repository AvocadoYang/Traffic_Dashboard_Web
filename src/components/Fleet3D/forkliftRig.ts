import * as THREE from "three";

/**
 * 叉車模型裡會動的組件。
 *
 * 模型 (public/models/forklift.glb, 由 scripts/vehicle-models/forklift.mjs 產生) 的約定: 單位公尺、y 朝上、
 * 車頭朝 +x、原點在牙叉根部的地面 (跟 2D 地圖一樣, 車的位置就是叉臂根部)。
 * 會動的組件用節點名稱標出來, 也可以用同事 glb-editor 的「分群」(存在 userData.group):
 *  - fork: 貨叉架 + 牙叉, 升多少就移多少
 *  - mast_inner / mast_middle: 三節門架的內、中門架。牙叉先在內門架裡自由升高 freeLift,
 *    再往上時內門架跟著升, 中門架升一半
 * 沒有這些組件的模型照樣能顯示, 只是牙叉不會動。
 */
const PARTS = ["fork", "mast_inner", "mast_middle"] as const;
type Part = (typeof PARTS)[number];

/**
 * 載著貨行駛時牙叉的高度 (公尺): 模擬、沒回報牙叉高度的車照這個演。
 * 比實際常見的 10 ~ 20 公分高一點, 遠遠看也看得出取放貨時牙叉有在動 (還在自由升高內, 門架不會伸)
 */
export const CARRY_LIFT = 0.3;

/** 模型沒寫 freeLift 時用的值 (公尺) */
const DEFAULT_FREE_LIFT = 0.75;

type Mover = { node: THREE.Object3D; rest: THREE.Vector3; up: THREE.Vector3 };

export type ForkliftRig = {
  /** 牙叉升高到幾公尺 (0 = 最低) */
  setLift: (height: number) => void;
  /** 牙叉 (貨叉架) 的節點, 告警時閃它 */
  forks: THREE.Object3D[];
};

const partOf = (o: THREE.Object3D): Part | null => {
  const key: unknown = typeof o.userData.group === "string" ? o.userData.group : o.name;
  return PARTS.find((p) => p === key) ?? null;
};

export function rigForklift(model: THREE.Object3D): ForkliftRig {
  model.updateMatrixWorld(true);
  const toModel = model.matrixWorld.clone().invert();
  const movers: Record<Part, Mover[]> = { fork: [], mast_inner: [], mast_middle: [] };
  let freeLift = DEFAULT_FREE_LIFT;

  const visit = (o: THREE.Object3D) => {
    if (typeof o.userData.freeLift === "number") freeLift = o.userData.freeLift;
    const part = o === model ? null : partOf(o);
    if (part && o.parent) {
      // 模型的「上」換到父節點的座標 (父節點可能有縮放、旋轉, 例如 CAD 匯出的公分單位)
      const parentToModel = new THREE.Matrix4().multiplyMatrices(toModel, o.parent.matrixWorld);
      const up = new THREE.Vector3(0, 1, 0).applyMatrix3(new THREE.Matrix3().setFromMatrix4(parentToModel.invert()));
      movers[part].push({ node: o, rest: o.position.clone(), up });
      // 底下的節點跟著它動
      return;
    }
    o.children.forEach(visit);
  };
  visit(model);

  const move = (list: Mover[], offset: number) => {
    for (const m of list) m.node.position.copy(m.rest).addScaledVector(m.up, offset);
  };
  return {
    forks: movers.fork.map((m) => m.node),
    setLift: (height) => {
      const extend = Math.max(0, height - freeLift);
      move(movers.fork, height);
      move(movers.mast_inner, extend);
      move(movers.mast_middle, extend / 2);
    },
  };
}
