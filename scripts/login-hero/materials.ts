import * as THREE from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";

/** 頂點色分群 (調材質對應時用): 每種顏色有幾個頂點、在模型座標的範圍 */
export function colorClusters(model: THREE.Object3D) {
  model.updateMatrixWorld(true);
  const groups = new Map<string, { mesh: string; hex: string; n: number; min: number[]; max: number[] }>();
  const p = new THREE.Vector3(), c = new THREE.Color();
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const pos = m.geometry.getAttribute("position"), col = m.geometry.getAttribute("color");
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      if (col) c.fromBufferAttribute(col as THREE.BufferAttribute, i); else c.setRGB(1, 1, 1);
      const hex = "#" + c.clone().convertLinearToSRGB().getHexString();
      const key = m.name + hex;
      let g = groups.get(key);
      if (!g) groups.set(key, (g = { mesh: m.name, hex, n: 0, min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9] }));
      g.n++;
      p.toArray().forEach((v, k) => { g!.min[k] = Math.min(g!.min[k], v); g!.max[k] = Math.max(g!.max[k], v); });
    }
  });
  return [...groups.values()].sort((a, b) => b.n - a.n).map((g) => ({ ...g, min: g.min.map((v) => +v.toFixed(2)), max: g.max.map((v) => +v.toFixed(2)) }));
}

/** 檢查用: 複製一份模型, 指定的顏色群塗成洋紅、其他塗灰 (hexes 空的話保留原色) */
export function highlightClone(model: THREE.Object3D, hexes: string[]) {
  const copy = model.clone(true);
  const want = new Set(hexes.map((h) => h.toLowerCase()));
  const c = new THREE.Color();
  copy.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const g = m.geometry.clone();
    const col = g.getAttribute("color") as THREE.BufferAttribute;
    const out = new Float32Array(col.count * 3);
    for (let i = 0; i < col.count; i++) {
      c.fromBufferAttribute(col, i);
      const hex = "#" + c.clone().convertLinearToSRGB().getHexString();
      if (!want.size) c.toArray(out, i * 3);
      else if (want.has(m.name + hex) || want.has(hex)) out.set([1, 0, 0.8], i * 3);
      else out.set([0.12, 0.12, 0.12], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(out, 3));
    m.geometry = g;
    m.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0, flatShading: true });
  });
  return copy;
}

// ======================================================================
// 擬真材質: 依實車照片 (KENMEC 叉車 / SW15 滾筒車) 與 MiR250 官方產品圖
// 模型只有頂點色 (CAD 零件色, 多半是隨便給的白灰色), 這裡照顏色群換成實際材質
// ======================================================================

const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
const phys = (o: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(o);
const glow = (r: number, g: number, b: number, k: number) =>
  std({ color: 0x0a0a0a, emissive: new THREE.Color(r, g, b), emissiveIntensity: k, roughness: 0.25 });

export const MAT = {
  /** 叉車外殼: 亮面紅, 有清漆層 (照片上反光很強) */
  redGloss: phys({ color: "#cf2a1f", roughness: 0.34, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.15 }),
  /** SW15 鈑金烤漆: 比叉車深一點的紅 */
  redSteel: phys({ color: "#b3161d", roughness: 0.36, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.08 }),
  /** 叉車側板、底盤、塔柱: 黑色烤漆 */
  black: phys({ color: "#121316", roughness: 0.46, metalness: 0.2, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
  /** 門架、牙叉: 黑色鋼材 */
  blackSteel: std({ color: "#17181b", roughness: 0.4, metalness: 0.65 }),
  glossBlack: phys({ color: "#07080a", roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03 }),
  rubber: std({ color: "#0b0b0c", roughness: 0.9 }),
  /** PU 輪 (米黃) */
  pu: std({ color: "#d6c07a", roughness: 0.55 }),
  /** 滾筒: 不鏽鋼 */
  roller: std({ color: "#b4b9be", roughness: 0.34, metalness: 1, envMapIntensity: 0.4 }), // 環境反光壓低, 不然燈條反射整排過曝
  /** 側擋: 鋁合金 */
  alu: std({ color: "#c4c8cd", roughness: 0.32, metalness: 1 }),
  steel: std({ color: "#8f9399", roughness: 0.4, metalness: 0.9 }),
  /** 充電板: 綠色塑膠 + 銅觸點 */
  plate: std({ color: "#2fae4e", roughness: 0.42 }),
  copper: std({ color: "#d38c58", roughness: 0.28, metalness: 1 }),
  /** MiR250: RAL 7011 鐵灰外殼 (聚碳酸酯) + 陽極處理鋁頂板 */
  mirGray: phys({ color: "#434b4d", roughness: 0.5, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.45 }),
  mirTop: std({ color: "#b8bcc0", roughness: 0.36, metalness: 1 }),
  amber: glow(1, 0.5, 0.05, 3),
  green: glow(0.1, 1, 0.3, 2.5),
  white: glow(1, 1, 1, 1.4),
  ledBlue: glow(0.1, 0.55, 1, 2.6),
};
export type MatKey = keyof typeof MAT;
export type Kind = "forklift" | "m68" | "mir";

type Rules = { byMesh?: Record<string, MatKey>; byHex: Record<string, MatKey>; meshFallback?: Record<string, MatKey>; fallback: MatKey };
// 顏色群 → 材質 (用 HERO.inspect 一群一群標出來對照照片得到的)
const RULES: Record<Kind, Rules> = {
  forklift: {
    byHex: {
      "#ff0000": "redGloss", "#f10000": "redGloss", "#f46c66": "redGloss", // 外殼
      "#ffff00": "pu", // 驅動輪 / 承載輪
      "#bdbdbd": "plate", "#f4fd00": "copper", // 側面充電板
      "#ffd500": "amber", "#ffe700": "amber", "#f4ffb9": "amber", "#00ff00": "green", "#00e7ff": "white", // 塔柱頂的燈
      "#00ffff": "rubber", // 車尾下緣防撞條
    },
    meshFallback: { fork_mesh: "blackSteel", mast_inner_mesh: "blackSteel", mast_middle_mesh: "blackSteel" },
    fallback: "black", // 照片上側板、底盤、塔柱、門架都是黑的
  },
  m68: {
    byMesh: { guard_mesh: "alu" }, // 兩條側擋整個是鋁
    byHex: {
      "#ec5e52": "redSteel", "#ffffff": "redSteel", "#666666": "redSteel", // 車身、兩端的櫃門 (模型裡是白的, 實車是紅的)、滾筒下的底板
      "#a0a6aa": "roller", "#fafafa": "roller",
      "#767676": "rubber", // 底部防撞條
      "#000000": "glossBlack",
      "#00ff00": "green", "#ffda3f": "amber", "#f0ba3f": "amber", "#fffe6c": "amber", // 側面按鈕燈
      "#ffd0cb": "black", "#f9e100": "black", "#66666c": "black", "#bcbcbc": "black", "#d8d8d8": "black",
      "#fbf1db": "black", "#ffff00": "black", "#00d48e": "black",
    },
    fallback: "steel", // 剩下的是螺絲、支架
  },
  mir: {
    byHex: {
      "#a0a6aa": "mirGray", // 上下兩層外殼
      "#fafafa": "mirTop", "#8e8e8e": "mirTop", // 頂板
      "#898989": "rubber", // 頂板四角護角、輪子
      "#ffffff": "white", // 四角信號燈
      "#000000": "glossBlack", "#3f3f3f": "rubber", "#523fec": "rubber", "#da0000": "black",
    },
    fallback: "mirGray",
  },
};

/** 換成擬真材質: 依頂點色把三角形分到各材質, 並重算法線 (轉角 36 度以內抹平, 曲面外殼才有烤漆的連續反光) */
export function realize(model: THREE.Object3D, kind: Kind, crease = Math.PI / 5) {
  const rules = RULES[kind];
  const c = new THREE.Color(), p = new THREE.Vector3();
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const src = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
    const pos = src.getAttribute("position"), col = src.getAttribute("color") as THREE.BufferAttribute;
    const keyOf = (v: number): MatKey => {
      c.fromBufferAttribute(col, v);
      const hex = "#" + c.clone().convertLinearToSRGB().getHexString();
      return rules.byMesh?.[m.name] ?? rules.byHex[hex] ?? rules.meshFallback?.[m.name] ?? rules.fallback;
    };
    const buckets = new Map<MatKey, number[]>();
    for (let t = 0; t < pos.count / 3; t++) {
      const k = keyOf(t * 3);
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k)!.push(t);
    }
    const out = new Float32Array(pos.count * 3);
    const g = new THREE.BufferGeometry(), mats: THREE.Material[] = [];
    let w = 0;
    [...buckets].forEach(([k, tris], mi) => {
      const start = w;
      for (const t of tris) for (let v = 0; v < 3; v++) { p.fromBufferAttribute(pos, t * 3 + v); p.toArray(out, w * 3); w++; }
      g.addGroup(start, w - start, mi);
      mats.push(MAT[k]);
    });
    g.setAttribute("position", new THREE.BufferAttribute(out, 3));
    m.geometry = toCreasedNormals(g, crease); // 非 indexed 的幾何會原地加法線, groups 保留
    m.material = mats;
    m.castShadow = m.receiveShadow = true;
  });
}

// ---------------------------------------------------------------- 貼花 (印字)

/** 從 origin 往 dir 打一條射線, 打到 target 的地方貼一張貼花; 回傳的 mesh 座標跟 root 一樣 (root 要在原點) */
export function stamp(target: THREE.Object3D, origin: THREE.Vector3, dir: THREE.Vector3, size: THREE.Vector3, material: THREE.Material) {
  target.updateMatrixWorld(true);
  const d = dir.clone().normalize();
  const hits = new THREE.Raycaster(origin, d).intersectObject(target, true);
  const hit = hits[0];
  if (!hit) throw new Error(`stamp: 沒打到 (${origin.toArray()} → ${d.toArray()})`);
  const helper = new THREE.Object3D();
  helper.position.copy(hit.point);
  helper.lookAt(hit.point.clone().sub(d)); // 貼花 +z = 射線反方向 (朝外), 文字正著讀
  const mesh = new THREE.Mesh(new DecalGeometry(hit.object as THREE.Mesh, hit.point, helper.rotation, size), material);
  mesh.renderOrder = 2;
  return { mesh, point: hit.point.clone() };
}

const canvas = (w: number, h: number) => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  return [cv, cv.getContext("2d")!] as const;
};
const tex = (cv: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};
const SANS = '"Liberation Sans", Arial, Helvetica, sans-serif';

/** 白色 KENMEC 字樣 (寬:高 = 5:1) */
export function kenmecTexture(color = "#ffffff") {
  const [cv, g] = canvas(1280, 256);
  g.fillStyle = color;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `700 196px ${SANS}`;
  (g as any).letterSpacing = "10px";
  g.fillText("KENMEC", 640, 136);
  return tex(cv);
}

/** 車號: 粗體窄字, 下半部有三條橫向鏤空 (照片上的樣式); 寬:高 = 4:3 */
export function numberTexture(n: string) {
  const [cv, g] = canvas(512, 384);
  g.fillStyle = "#ffffff";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `700 330px "Liberation Sans Narrow", "Arial Narrow", ${SANS}`;
  g.fillText(n, 256, 205);
  g.globalCompositeOperation = "destination-out";
  for (const y of [0.6, 0.71, 0.82]) g.fillRect(0, 384 * y, 512, 384 * 0.04);
  return tex(cv);
}

/** 叉車塔柱上的觸控螢幕畫面 (寬:高 = 4:3) */
export function screenTexture() {
  const [cv, g] = canvas(512, 384);
  g.fillStyle = "#0c1a2c"; g.fillRect(0, 0, 512, 384);
  g.fillStyle = "#1d6fbf"; g.fillRect(0, 0, 512, 56);
  g.fillStyle = "#ffffff"; g.font = `700 30px ${SANS}`; g.textBaseline = "middle"; g.fillText("KENMEC AGV", 20, 29);
  g.fillStyle = "#38d36b"; g.beginPath(); g.arc(470, 28, 12, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(255,255,255,0.85)";
  [100, 150, 200, 250].forEach((y, i) => g.fillRect(24, y, [300, 220, 260, 180][i], 18));
  g.fillStyle = "#1d6fbf"; g.fillRect(24, 300, 220, 56);
  g.fillStyle = "#2c3e55"; g.fillRect(268, 300, 220, 56);
  return tex(cv);
}

/** 紙箱: 牛皮紙色, 側面印 KENMEC 廣運 (照片上展場的箱子) */
export function cartonMaterials() {
  const kraft = "#c39a68";
  const [cv, g] = canvas(512, 400);
  g.fillStyle = kraft; g.fillRect(0, 0, 512, 400);
  for (let i = 0; i < 2500; i++) { // 紙纖維的雜訊
    g.fillStyle = `rgba(${Math.random() < 0.5 ? "90,60,30" : "255,240,210"},${Math.random() * 0.06})`;
    g.fillRect(Math.random() * 512, Math.random() * 400, 1 + Math.random() * 3, 1);
  }
  g.fillStyle = "#2a2522"; g.textBaseline = "alphabetic";
  g.font = `700 64px ${SANS}`; (g as any).letterSpacing = "3px"; g.fillText("KENMEC", 48, 196);
  g.font = `700 50px "Noto Sans CJK TC", sans-serif`; (g as any).letterSpacing = "0px"; g.fillText("廣運", 352, 194);
  g.font = `400 20px ${SANS}`; (g as any).letterSpacing = "4px"; g.fillText("AUTOMATION TECHNOLOGY", 50, 236);
  const side = std({ map: tex(cv), roughness: 0.85 });
  const [cv2, g2] = canvas(256, 256);
  g2.fillStyle = kraft; g2.fillRect(0, 0, 256, 256);
  g2.fillStyle = "rgba(225,200,160,0.9)"; g2.fillRect(104, 0, 48, 256); // 封箱膠帶
  const top = std({ map: tex(cv2), roughness: 0.6 });
  const plain = std({ color: kraft, roughness: 0.85 });
  return [side, side, top, plain, side, side]; // BoxGeometry 面順序: +x -x +y -y +z -z
}

// ---------------------------------------------------------------- MiR250 的 LED 燈帶

const roundRect = (hx: number, hz: number, r: number) => {
  const s = new THREE.Shape();
  s.moveTo(-hx + r, -hz); s.lineTo(hx - r, -hz); s.quadraticCurveTo(hx, -hz, hx, -hz + r);
  s.lineTo(hx, hz - r); s.quadraticCurveTo(hx, hz, hx - r, hz); s.lineTo(-hx + r, hz);
  s.quadraticCurveTo(-hx, hz, -hx, hz - r); s.lineTo(-hx, -hz + r); s.quadraticCurveTo(-hx, -hz, -hx + r, -hz);
  return s;
};

/**
 * 官方產品圖上下兩層外殼中間有一圈藍色 LED, 模型裡沒有這個零件: 從側面往內打射線找出縫 (打最深的高度),
 * 在縫裡補一圈發光條。回傳 mesh (座標跟 model 一樣) 和找到的位置 (檢查用)。
 */
export function lightBand(model: THREE.Object3D, material: THREE.Material) {
  model.updateMatrixWorld(true);
  const rc = new THREE.Raycaster();
  const depth = (o: THREE.Vector3, d: THREE.Vector3) => { rc.set(o, d); return rc.intersectObject(model, true)[0]?.distance ?? Infinity; };
  // 外殼在 0.1 ~ 0.29 m; 縫 = 長邊、短邊都打得比外殼深 3 cm 以上的那一段高度
  const rows: { y: number; dz: number; dx: number }[] = [];
  for (let y = 0.1; y <= 0.29; y += 0.0025) {
    rows.push({ y, dz: depth(new THREE.Vector3(0.25, y, 1), new THREE.Vector3(0, 0, -1)), dx: depth(new THREE.Vector3(1, y, 0.12), new THREE.Vector3(-1, 0, 0)) });
  }
  const shellZ = Math.min(...rows.map((r) => r.dz)), shellX = Math.min(...rows.map((r) => r.dx));
  const gap = rows.filter((r) => r.dz < 0.95 && r.dx < 0.95 && r.dz > shellZ + 0.03 && r.dx > shellX + 0.03);
  if (!gap.length) throw new Error("lightBand: 找不到上下外殼中間的縫");
  const y0 = Math.min(...gap.map((r) => r.y)), y1 = Math.max(...gap.map((r) => r.y));
  const hx = 1 - Math.max(...gap.map((r) => r.dx)) + 0.003, hz = 1 - Math.max(...gap.map((r) => r.dz)) + 0.003, t = 0.006;
  const shape = roundRect(hx, hz, 0.05);
  shape.holes.push(roundRect(hx - t, hz - t, 0.05 - t));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false, curveSegments: 6 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, y0, 0);
  return { mesh: new THREE.Mesh(geo, material), found: { y0: +y0.toFixed(3), y1: +y1.toFixed(3), hx: +hx.toFixed(3), hz: +hz.toFixed(3) } };
}
