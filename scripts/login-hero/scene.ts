import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { Muxer, ArrayBufferTarget } from "webm-muxer";
import { colorClusters, highlightClone, realize, stamp, lightBand, MAT, kenmecTexture, numberTexture, screenTexture, cartonMaterials } from "./materials";
import { rigForklift } from "../../src/components/Fleet3D/forkliftRig";
import forkliftGlb from "../../public/models/forklift.glb";
import mirGlb from "../../public/models/mir250.glb";
import m68Glb from "../../public/models/m68.glb";
import palletGlb from "../../public/models/pallet.glb";

const q = new URLSearchParams(location.search);
const W = +(q.get("w") || 1920), H = +(q.get("h") || 1080);
const canvas = document.createElement("canvas");
canvas.width = W; canvas.height = H;
document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const BG = new THREE.Color(0x05070b);
scene.background = BG;
scene.fog = new THREE.FogExp2(0x05070b, 0.028);
const pmrem = new THREE.PMREMGenerator(renderer);
// 反射用的環境: 暗的倉庫 + 天花板長條燈 + 兩側柔光箱, 烤漆和金屬上才會有車廠廣告那種長條反光
{
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x05070a);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const panel = (c: THREE.Color, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    const m = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); m.scale.set(sx, sy, sz); env.add(m);
  };
  for (const z of [-3.6, -1.2, 1.2, 3.6]) panel(new THREE.Color(6, 6.2, 6.8), 0, 6, z, 40, 0.15, 0.45); // 天花板燈條
  panel(new THREE.Color(1.2, 1.35, 1.7), 0, 2.4, -9, 18, 3.2, 0.2); // 冷色柔光箱
  panel(new THREE.Color(1.1, 1.2, 1.5), 0, 2.4, 9, 18, 3.2, 0.2);
  panel(new THREE.Color(1.7, 0.45, 0.32), -10, 1.6, 0, 0.2, 2.6, 12); // 暖色 (跟紅色輪廓光同側)
  panel(new THREE.Color(0.8, 0.9, 1.1), 10, 2, 0, 0.2, 2.2, 10);
  scene.environment = pmrem.fromScene(env, 0.02).texture;
  scene.environmentIntensity = 0.75;
}

const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 200);

// ---------- 地板 (鏡面反射 + 一層深色半透明壓暗) ----------
const mirror = new Reflector(new THREE.PlaneGeometry(160, 60), { textureWidth: W, textureHeight: H, color: 0x8c949c });
mirror.rotation.x = -Math.PI / 2;
scene.add(mirror);
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(160, 60),
  new THREE.MeshStandardMaterial({ color: 0x0b0e13, roughness: 0.55, metalness: 0.2, transparent: true, opacity: 0.8 }),
);
floor.rotation.x = -Math.PI / 2; floor.position.y = 0.003; floor.receiveShadow = true;
scene.add(floor);
// 行駛道標線
const lineMat = new THREE.MeshBasicMaterial({ color: 0xd9a514 });
for (const z of [-1.9, 1.9]) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(160, 0.09), lineMat);
  m.rotation.x = -Math.PI / 2; m.position.set(0, 0.006, z); scene.add(m);
}
const dashMat = new THREE.MeshBasicMaterial({ color: 0x3a4250 });
for (let x = -60; x < 60; x += 2.4) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.06), dashMat);
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.006, 0); scene.add(m);
}

// ---------- 貨架 ----------
const rackMat = new THREE.MeshStandardMaterial({ color: 0x1c2f52, roughness: 0.5, metalness: 0.6 });
const beamMat = new THREE.MeshStandardMaterial({ color: 0xc8541a, roughness: 0.5, metalness: 0.5 });
// 紙箱印 KENMEC 廣運、塑膠棧板綠 / 藍 (照展場照片)
const carton = cartonMaterials();
const whiteBox = new THREE.MeshStandardMaterial({ color: 0xc9ccd0, roughness: 0.8 });
const boxMats: (THREE.Material | THREE.Material[])[] = [carton, carton, carton, whiteBox];
const palGreen = new THREE.MeshStandardMaterial({ color: 0x35b04a, roughness: 0.5 });
const palBlue = new THREE.MeshStandardMaterial({ color: 0x1f4fa8, roughness: 0.5 });
const unit = new THREE.BoxGeometry(1, 1, 1);
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const addBox = (mat: THREE.Material | THREE.Material[], x: number, y: number, z: number, sx: number, sy: number, sz: number, shadow = false) => {
  const m = new THREE.Mesh(unit, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = shadow; m.receiveShadow = true; scene.add(m); return m;
};
for (const side of [-1, 1]) {
  const z0 = side * 4.6;
  for (let x = -54; x <= 54; x += 2.7) {
    for (const dz of [-0.55, 0.55]) addBox(rackMat, x, 3.2, z0 + dz, 0.1, 6.4, 0.1);
    if (x < 54) for (const y of [1.6, 3.2, 4.8, 6.3]) {
      for (const dz of [-0.55, 0.55]) addBox(beamMat, x + 1.35, y, z0 + dz, 2.7, 0.12, 0.06);
      for (const k of [0, 1]) {
        if (rnd() < 0.18) continue;
        const cx = x + 0.7 + k * 1.3, h = 0.55 + rnd() * 0.5;
        addBox(rnd() < 0.6 ? palGreen : palBlue, cx, y + 0.13, z0, 1.05, 0.13, 1.05);
        addBox(boxMats[Math.floor(rnd() * 4)], cx, y + 0.2 + h / 2, z0, 0.95, h, 0.95);
      }
    }
    // 地面層
    if (x < 54) for (const k of [0, 1]) {
      if (rnd() < 0.3) continue;
      const cx = x + 0.7 + k * 1.3, h = 0.6 + rnd() * 0.5;
      addBox(rnd() < 0.6 ? palGreen : palBlue, cx, 0.07, z0, 1.05, 0.13, 1.05);
      addBox(boxMats[Math.floor(rnd() * 4)], cx, 0.14 + h / 2, z0, 0.95, h, 0.95);
    }
  }
}
// ---------- 天花板燈條 ----------
const stripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.8, 3.2) });
const STRIP_X: number[] = [];
for (let x = -56; x <= 56; x += 7) {
  const m = new THREE.Mesh(unit, stripMat); m.position.set(x, 8.2, 0); m.scale.set(0.16, 0.05, 5.5); scene.add(m);
  STRIP_X.push(x);
}
const redMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 0.25, 0.2) });
for (const z of [-3.9, 3.9]) { const m = new THREE.Mesh(unit, redMat); m.position.set(0, 0.03, z); m.scale.set(160, 0.03, 0.04); scene.add(m); }

// ---------- 空氣感: 燈條下的光束 + 飄在空中的微塵 ----------
const gradTex = (draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number) => {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  draw(cv.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
};
// 光束: 上亮下淡、兩端淡出的直立薄片, 每條燈下兩片微微張開成 V 形, 才有體積感
const shaftTex = gradTex((g, w, h) => {
  const v = g.createLinearGradient(0, 0, 0, h);
  v.addColorStop(0, "rgba(255,255,255,1)"); v.addColorStop(0.35, "rgba(255,255,255,0.35)"); v.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = v; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = "destination-in";
  const u = g.createLinearGradient(0, 0, w, 0);
  u.addColorStop(0, "rgba(0,0,0,0)"); u.addColorStop(0.2, "rgba(0,0,0,1)"); u.addColorStop(0.8, "rgba(0,0,0,1)"); u.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = u; g.fillRect(0, 0, w, h);
}, 64, 256);
const shaftMat = new THREE.MeshBasicMaterial({
  map: shaftTex, color: new THREE.Color(1, 0.97, 0.92), transparent: true, opacity: 0.075,
  blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
});
const SHAFT_OPACITY = shaftMat.opacity;
const shaftGeo = new THREE.PlaneGeometry(5.2, 7.6); shaftGeo.translate(0, -3.8, 0); shaftGeo.rotateY(Math.PI / 2);
const shafts: THREE.Mesh[] = [];
for (const x of STRIP_X) for (const tilt of [-0.13, 0.13]) {
  const m = new THREE.Mesh(shaftGeo, shaftMat); m.position.set(x, 8.15, 0); m.rotation.z = tilt; m.renderOrder = 5; scene.add(m); shafts.push(m);
}
// 微塵: 位置照時間算 (同一個時間點每次算出來一樣, 動態模糊的子影格才對得上)
const DUST = 2600;
const dustBase = new Float32Array(DUST * 4);
for (let i = 0; i < DUST; i++) dustBase.set([-30 + rnd() * 70, 0.2 + rnd() * 7.3, -3.8 + rnd() * 7.6, rnd() * 100], i * 4);
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(DUST * 3), 3));
const dustMat = new THREE.PointsMaterial({
  size: 0.032, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  color: new THREE.Color(1, 0.95, 0.88), opacity: 0.6,
  map: gradTex((g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, w, w); }, 32, 32),
});
const DUST_OPACITY = dustMat.opacity;
const dust = new THREE.Points(dustGeo, dustMat); dust.frustumCulled = false; scene.add(dust);
const moveDust = (time: number) => {
  const p = dustGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < DUST; i++) {
    const [x, y, z, ph] = [dustBase[i * 4], dustBase[i * 4 + 1], dustBase[i * 4 + 2], dustBase[i * 4 + 3]];
    const yy = 0.2 + ((((y - 0.2 - time * 0.035) % 7.3) + 7.3) % 7.3); // 很慢地往下飄, 落到底從上面再出現
    p.setXYZ(i, x + Math.sin(time * 0.31 + ph) * 0.18, yy + Math.sin(time * 0.53 + ph * 1.7) * 0.05, z + Math.cos(time * 0.27 + ph) * 0.18);
  }
  p.needsUpdate = true;
};

// ---------- 燈 ----------
const hemi = new THREE.HemisphereLight(0x8fa6c8, 0x0a0c10, 0.35); scene.add(hemi);
const key = new THREE.DirectionalLight(0xdfe9ff, 1.7);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.radius = 4;
Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
scene.add(key, key.target);
const rim = new THREE.DirectionalLight(0xff5a3c, 0.9); scene.add(rim, rim.target);
const fill = new THREE.DirectionalLight(0x4f8cff, 1.1); scene.add(fill, fill.target);
// 開場揭幕用的長條柔光 (面光源): 平常關著, 開場時掃過叉車外殼拉出一道移動的反光
RectAreaLightUniformsLib.init();
const sweep = new THREE.RectAreaLight(0xfff4ea, 0, 0.14, 3.4); scene.add(sweep);
// 開燈時要調亮的東西: 原本的亮度
const LIT = {
  hemi: hemi.intensity, key: key.intensity, rim: rim.intensity, fill: fill.intensity, env: 0.75,
  strip: stripMat.color.clone(), red: redMat.color.clone(), line: lineMat.color.clone(), dash: dashMat.color.clone(),
};
const aim = (x: number, z: number) => {
  key.target.position.set(x, 0, z); key.position.set(x - 5, 11, z + 3);
  rim.target.position.set(x, 0.6, z); fill.target.position.set(x, 0.6, z);
};

// ---------- 車 ----------
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const load = (u8: Uint8Array) => new Promise<THREE.Object3D>((res, rej) =>
  loader.parse(u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength), "", (g) => {
    g.scene.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    res(g.scene);
  }, rej));

type Car = { root: THREE.Group };
const mkCar = (model: THREE.Object3D): Car => {
  const root = new THREE.Group(); root.add(model);
  scene.add(root); return { root };
};

// 印在車上的字: 白字印在清漆底下 (跟車漆一樣有反光)
const decalMat = (map: THREE.Texture, extra: THREE.MeshPhysicalMaterialParameters = {}) => new THREE.MeshPhysicalMaterial({
  map, transparent: true, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.15,
  polygonOffset: true, polygonOffsetFactor: -4, depthWrite: false, ...extra,
});
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const NUMBERS = ["15", "7", "1", "9"]; // 每台叉車的車號 (照片上有 15、7、1)

const S: any = {};
export const ready = (async () => {
  const [fk, mir, m68, pal] = await Promise.all([load(forkliftGlb), load(mirGlb), load(m68Glb), load(palletGlb)]);
  S.models = { fk: fk.clone(true), mir: mir.clone(true), m68: m68.clone(true) }; // 原本的頂點色 (HERO.inspect 用)
  S.clusters = { fk: colorClusters(fk), mir: colorClusters(mir), m68: colorClusters(m68) };
  S.info = [fk, mir, m68, pal].map((o) => { const b = new THREE.Box3().setFromObject(o); return [b.min.toArray().map((n) => +n.toFixed(2)), b.max.toArray().map((n) => +n.toFixed(2))]; });
  realize(fk, "forklift"); realize(m68, "m68"); realize(mir, "mir");
  // 印字: 叉車外殼車尾、SW15 兩側長邊、MiR 兩側長邊
  const kenmec = decalMat(kenmecTexture());
  fk.add(stamp(fk, V(2.5, 0.98, 0), V(-1, 0, 0), V(0.46, 0.092, 0.4), kenmec).mesh);
  for (const s of [1, -1]) {
    m68.add(stamp(m68, V(0, 0.33, 2 * s), V(0, 0, -s), V(0.5, 0.1, 0.3), kenmec).mesh);
    mir.add(stamp(mir, V(0.08, 0.252, 2 * s), V(0, 0, -s), V(0.2, 0.04, 0.2), kenmec).mesh);
  }
  // 叉車塔柱上的螢幕
  const scr = screenTexture();
  S.screen = new THREE.MeshStandardMaterial({ map: scr, emissiveMap: scr, emissive: 0xffffff, emissiveIntensity: 0.8, roughness: 0.12, transparent: true, polygonOffset: true, polygonOffsetFactor: -4, depthWrite: false });
  fk.add(stamp(fk, V(2.5, 1.68, 0), V(-1, 0, 0), V(0.2, 0.15, 0.3), S.screen).mesh);
  // 車號貼花: 形狀每台一樣, 字不一樣
  const numSides = [1, -1].map((s) => stamp(fk, V(0.58, 0.76, 2 * s), V(0, 0, -s), V(0.2, 0.15, 0.4), MAT.white).mesh.geometry);
  // MiR 的 LED 燈帶
  const band = lightBand(mir, MAT.ledBlue); mir.add(band.mesh); S.band = band.found;
  S.mir = mkCar(mir); S.m68 = mkCar(m68);
  S.mir2 = mkCar(mir.clone(true));
  const pb = new THREE.Box3().setFromObject(pal); const ps = pb.getSize(new THREE.Vector3());
  S.palSize = ps.toArray();
  pal.position.sub(pb.getCenter(new THREE.Vector3())); pal.position.y += ps.y / 2;
  const palWrap = new THREE.Group(); palWrap.add(pal);
  const palOf = (m: THREE.Material) => { const w = palWrap.clone(true); w.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = m; }); return w; };
  // 四台叉車 (最後一個鏡頭要多車), 每台有自己的牙叉和貨
  S.F = [0, 1, 2, 3].map((i) => {
    const model = i ? fk.clone(true) : fk;
    const car = mkCar(model);
    const num = decalMat(numberTexture(NUMBERS[i]), { clearcoat: 0.35, clearcoatRoughness: 0.3, roughness: 0.45 });
    for (const g of numSides) model.add(new THREE.Mesh(g, num));
    const cargo = new THREE.Group(); cargo.add(palOf(i % 2 ? palBlue : palGreen));
    const box = new THREE.Mesh(unit, carton); box.scale.set(0.9, 0.7, 0.9); box.position.y = ps.y + 0.35; box.castShadow = true; cargo.add(box);
    car.root.add(cargo);
    return { ...car, rig: rigForklift(model), cargo };
  });
  S.fk = S.F[0];
})();

// ---------- 分鏡 ----------
const ease = (x: number) => x * x * (3 - 2 * x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const place = (c: Car, x: number, z: number, yaw = 0) => { c.root.position.set(x, 0, z); c.root.rotation.y = yaw; };
const cfg: any = (window as any).CFG = { forkDir: -1, cargoX: -0.55, m68Yaw: 0 };
/** 每個鏡頭自己設: 景深對焦距離 (沿視線的深度, m) 與強度 (無限遠處的模糊半徑, px @1600 寬), 暗場程度, 車燈是否亮 */
const shotState = { focus: 5, blur: 0, dark: 0, lamps: 1, gloss: 0 };
const lookDir = new THREE.Vector3();
const look = (px: number, py: number, pz: number, tx: number, ty: number, tz: number, fov: number) => {
  camera.position.set(px, py, pz); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(tx, ty, tz);
  lookDir.set(tx - px, ty - py, tz - pz).normalize();
};
/** 對焦在某一點 (呼叫前先 look) */
const focusOn = (x: number, y: number, z: number, blur: number) => {
  shotState.focus = Math.max(0.3, new THREE.Vector3(x, y, z).sub(camera.position).dot(lookDir));
  shotState.blur = blur;
};
const lift = (f: any, h: number, loaded = true) => { f.rig.setLift(h); f.cargo.visible = loaded; f.cargo.position.set(cfg.cargoX, h + 0.05, 0); };
const setLift = (h: number) => lift(S.F[0], h);
const park = (...cs: Car[]) => cs.forEach((c, i) => place(c, 300 + i * 5, 0));
const lights = (x: number, z: number, rx: number, ry: number, rz: number, fx: number, fy: number, fz: number) => {
  aim(x, z); rim.position.set(x + rx, ry, z + rz); fill.position.set(x + fx, fy, z + fz);
};

// ---------- 最後一個鏡頭用的地面號誌: 路權虛線、等待光圈 ----------
const CYAN = new THREE.Color(0.5, 2.6, 3.4), AMBER = new THREE.Color(3.6, 1.9, 0.25);
const mkDash = () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.15), new THREE.MeshBasicMaterial({ color: CYAN.clone(), transparent: true })); m.rotation.order = "YXZ"; m.rotation.x = -Math.PI / 2; m.position.y = 0.012; scene.add(m); return m; };
const dashesA = Array.from({ length: 26 }, mkDash), dashesB = Array.from({ length: 22 }, mkDash);
const waitRing = new THREE.Mesh(new THREE.RingGeometry(1.75, 1.87, 64), new THREE.MeshBasicMaterial({ color: AMBER.clone(), transparent: true }));
waitRing.rotation.x = -Math.PI / 2; waitRing.position.y = 0.012; scene.add(waitRing);
const stopBar = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 1.5), new THREE.MeshBasicMaterial({ color: AMBER.clone(), transparent: true }));
stopBar.rotation.x = -Math.PI / 2; stopBar.position.y = 0.012; scene.add(stopBar);
const signals = [...dashesA, ...dashesB, waitRing, stopBar];
for (const m of signals) { m.material.depthWrite = false; m.renderOrder = 10; }
const sat = (x: number) => Math.max(0, Math.min(1, x));

// 叉車 B 從貨架退出來併入車道的路徑: 先直走離開貨架、四分之一圓轉進車道、再沿車道直走
const LANE = 0.95, BX = 8, BZ = 2.55, R = 1.6;
const pathB = (d: number): [number, number, number] => {
  const arc = (Math.PI / 2) * R;
  if (d < arc) { const p = d / R; return [BX + R - R * Math.cos(p), BZ - R * Math.sin(p), Math.PI / 2 - p]; }
  return [BX + R + (d - arc), LANE, 0];
};
// 速度曲線積分成距離: 分段等加速
const dist = (t: number, segs: [number, number, number][]) => { // [開始時間, 結束時間, 結束時的速度], 起始速度是上一段的結束速度
  let d = 0, v = segs[0][2], prev = segs[0][0];
  for (const [t0, t1, v1] of segs.slice(1)) { const dt = sat((t - t0) / (t1 - t0)) * (t1 - t0); d += v * dt + ((v1 - v) * dt * dt) / (2 * (t1 - t0)); v = v1; prev = t1; if (t <= t1) return d; }
  return d + v * Math.max(0, t - prev);
};

export const SHOTS: { dur: number; run: (u: number, t: number) => void }[] = [
  // 0. 光影揭幕: 全黑, 一道長條柔光從左掃到右, 在紅色外殼上拉出移動的反光、勾出車身輪廓;
  //    掃完倉庫的燈才亮起來, 叉車塔柱的燈和螢幕跟著點亮
  { dur: 4.2, run: (u, t) => {
    place(S.fk, 0, 0.9, 0); lift(S.F[0], 0.05, false);
    park(S.mir, S.mir2, S.m68, S.F[1], S.F[2], S.F[3]);
    const on = ease(sat((t - 2.75) / 0.9));
    shotState.dark = 1 - on; shotState.lamps = sat((t - 2.55) / 0.25);
    // 柔光在車尾外殼正前方平行移動 (背對兩側貨架, 只照得到車), 外殼上的反光帶跟著滑過去
    const k = ease(sat((t - 0.15) / 2.7)), z = lerp(-1.3, 3.1, k);
    sweep.position.set(3.0, 1.2, z);
    sweep.lookAt(1.0, 0.85, 0.9 + (z - 0.9) * 0.35);
    sweep.intensity = 24 * sat(t / 0.35) * (1 - 0.75 * on);
    shotState.gloss = 1 - on; // 揭幕時外殼底漆調亮面, 面光源的反光才會收成一道
    lights(0.5, 0.9, -6, 3.5, -5, 6, 2.5, 5);
    look(lerp(4.3, 3.7, ease(u)), 0.5, lerp(3.0, 2.6, ease(u)), 0.75, 0.82, 0.85, 30);
    focusOn(1.3, 0.9, 1.0, 11);
  } },
  // 1. 貼地低角度: 叉車迎面開過來, 鏡頭慢慢後退
  { dur: 4.2, run: (u, t) => {
    const x = -7 + t * 1.5;
    place(S.fk, x, 0.9, 0); setLift(0.3);
    place(S.mir, x - 9, 0.9, 0); place(S.m68, x + 16 - t * 2.6, -1.0, Math.PI + cfg.m68Yaw);
    park(S.mir2, S.F[1], S.F[2], S.F[3]);
    lights(x, 0.9, -6, 3.5, -5, 6, 2.5, 5);
    look(x + 5.6 + t * 0.35, 0.28, 2.6 - t * 0.12, x + 0.6, 0.95, 0.75, 30);
    focusOn(x + 1.3, 0.9, 0.9, 9);
  } },
  // 2. MiR 側面特寫: 長焦平移跟拍
  { dur: 3.6, run: (u, t) => {
    const x = -4 + t * 1.3;
    place(S.mir, x, 0, 0); place(S.mir2, x + 7.5, 1.2, 0);
    place(S.fk, x - 14, 0.9, 0); setLift(0.3); park(S.m68, S.F[1], S.F[2], S.F[3]);
    lights(x, 0, 5, 2.2, -6, -5, 2, 6);
    look(x + 0.9 + t * 0.25, 0.42, 4.6, x + 0.35 + t * 0.2, 0.26, 0, 20);
    focusOn(x + 0.2, 0.2, 0.25, 13);
  } },
  // 3. M68 滾筒車: 3/4 環繞
  { dur: 3.8, run: (u, t) => {
    const x = 2 + t * 1.0, a = lerp(0.5, 1.25, ease(u));
    place(S.m68, x, 0, cfg.m68Yaw); place(S.mir, x - 7, 1.4, 0); place(S.mir2, 16 - t * 1.3, -1.4, Math.PI);
    place(S.fk, 24 - t * 1.3, -1.4, Math.PI); setLift(0.3); park(S.F[1], S.F[2], S.F[3]);
    lights(x, 0, -5, 2.6, -5, 5, 2.4, 5);
    look(x + Math.cos(a) * 4.4, lerp(1.9, 1.05, ease(u)), Math.sin(a) * 4.4, x, 0.38, 0, 28);
    focusOn(x, 0.35, 0, 9);
  } },
  // 4. 叉車在貨架前把貨舉起來: 仰角慢推
  { dur: 4.0, run: (u, t) => {
    place(S.fk, 2.0, 2.55, Math.PI / 2);
    setLift(lerp(0.25, 1.75, ease(Math.min(1, u * 1.15))));
    place(S.mir, -9 + t * 1.3, -0.9, 0); park(S.mir2, S.m68, S.F[1], S.F[2], S.F[3]);
    lights(2, 2.5, -6, 4, -3, 6, 2, -4);
    look(lerp(-3.4, -2.6, u), lerp(0.5, 0.75, u), lerp(-1.6, -1.1, u), 1.9, lerp(1.2, 1.7, u), 2.9, 32);
    focusOn(1.9, 1.2, 2.6, 8);
  } },
  // 5. 多車節奏: B 從貨架退出來併入車道, 後面的 A 減速、停在停止線等它 (琥珀色光圈), B 走了路權放行 (虛線變青色) A 才跟上;
  //    對向車道兩台叉車保持固定車距通過
  { dur: 7.6, run: (u, t) => {
    const [A, B, C, D] = S.F;
    park(S.mir, S.mir2, S.m68);
    // B: 0.4s 起步, 1.0 m/s 轉出來, 進車道後加速到 1.5
    const dB = dist(t, [[0, 0, 0], [0.4, 1.2, 1.0], [1.2, 2.9, 1.0], [2.9, 4.4, 1.5]]);
    const [bx, bz, byaw] = pathB(dB); place(B, bx, bz, byaw); lift(B, 0.3);
    // A: 1.5 m/s 開過來, 1.0 ~ 3.0s 減速到停 (停在 x = 4.3), 等到 4.3s 放行再加速
    const STOP = 4.3, GO = 4.3;
    const ax = STOP - 3.0 + dist(t, [[0, 0, 1.5], [0, 1.0, 1.5], [1.0, 3.0, 0], [3.0, GO, 0], [GO, GO + 2.0, 1.5]]);
    place(A, ax, LANE, 0); lift(A, 0.3);
    // 對向: C、D 固定車距 6.5m, 等速
    place(C, 19 - t * 1.5, -LANE, Math.PI); lift(C, 0.3);
    place(D, 25.5 - t * 1.5, -LANE, Math.PI); lift(D, 0.3, false);
    // 地面號誌
    const waiting = sat((t - 1.0) / 0.5) * sat((GO + 0.25 - t) / 0.4), go = sat((t - GO) / 0.4);
    waitRing.position.set(ax + 0.2, 0.012, LANE); waitRing.scale.setScalar(1 + 0.06 * Math.sin(t * 5)); waitRing.material.opacity = waiting * (0.6 + 0.4 * Math.sin(t * 5) ** 2);
    stopBar.position.set(STOP + 1.75, 0.012, LANE); stopBar.material.opacity = sat(t / 0.5) * (1 - go);
    dashesB.forEach((m, i) => { const d = 0.6 + i * 0.75; const [x, z, yaw] = pathB(d); m.position.set(x, 0.012, z); m.rotation.y = yaw; m.material.opacity = sat(t / 0.4) * sat((d - dB - 1.3) / 0.5) * sat((dB + 9 - d) / 2); });
    dashesA.forEach((m, i) => { const x = STOP - 2 + i * 0.75; m.position.set(x, 0.012, LANE); m.rotation.y = 0;
      const ahead = sat((x - ax - 1.6) / 0.5) * sat((ax + 9 - x) / 2);
      const own = x < STOP + 1.6 ? 1 : go * sat((bx - 1.4 - x) / 0.5); // 停止線以後的路權在 B 手上, 放行後才亮
      m.material.color.copy(x < STOP + 1.6 && go < 1 ? AMBER : CYAN).lerp(CYAN, x < STOP + 1.6 ? go : 1); m.material.opacity = ahead * own * 0.9; });
    lights(6.5, 1, -7, 5, -5, 7, 3, 5);
    const e = ease(u);
    look(lerp(-3.6, -1.4, e), lerp(7.0, 6.0, e), -3.3, lerp(7.4, 9.4, e), 0.3, 1.0, 38);
    focusOn(ax, 0.8, LANE, 3); // 高角度全景只輕微景深, 太淺會變成微縮模型的感覺
  } },
];
export const TOTAL = SHOTS.reduce((a, s) => a + s.dur, 0);

// ---------- 後製: 動態模糊 (快門時間內算好幾次平均) → 景深 → 光暈 → 調色 ----------
const MB = +(q.get("mb") || 5); // 每格算幾個子影格 (1 = 不做動態模糊, 預覽用)
const FPS = 30;
const SHUTTER = 0.5; // 180 度快門: 曝光時間是半格

// 子影格 (多重取樣抗鋸齒) 與累加結果, 都是 HDR, 調色前不會爆掉
const subRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const accRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: false });
const quadVS = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const accQuad = new FullScreenQuad(new THREE.ShaderMaterial({
  uniforms: { tSrc: { value: null }, w: { value: 1 } },
  vertexShader: quadVS,
  fragmentShader: "uniform sampler2D tSrc; uniform float w; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tSrc, vUv).rgb * w, w); }",
  blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  depthTest: false, depthWrite: false,
}));

// 景深用的深度 (只畫深度, 不畫鏡面地板、光束、微塵、地面號誌)
const depthRT = new THREE.WebGLRenderTarget(W, H);
depthRT.depthTexture = new THREE.DepthTexture(W, H, THREE.FloatType);
const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false });
const renderDepth = () => {
  const hide = [mirror, dust, ...shafts, ...signals].filter((o) => o.visible);
  hide.forEach((o) => (o.visible = false));
  scene.overrideMaterial = depthOnly;
  renderer.shadowMap.autoUpdate = false;
  renderer.setRenderTarget(depthRT); renderer.clear(); renderer.render(scene, camera);
  renderer.shadowMap.autoUpdate = true;
  scene.overrideMaterial = null;
  hide.forEach((o) => (o.visible = true));
};

// 景深: 每個取樣點用「自己的」模糊半徑決定有沒有糊到這個像素 (前景會糊開蓋到背景上,
// 背景不會滲到清楚的前景上), 取樣點排成黃金角螺旋; 在 HDR 上做, 亮的燈會變成散景光斑
const dof = new ShaderPass({
  uniforms: {
    tColor: { value: accRT.texture }, tDepth: { value: depthRT.depthTexture },
    cameraNear: { value: camera.near }, cameraFar: { value: camera.far },
    focus: { value: 5 }, blur: { value: 0 }, maxR: { value: 16 * (W / 1600) }, res: { value: new THREE.Vector2(W, H) },
  },
  vertexShader: quadVS,
  fragmentShader: `#include <packing>
    uniform sampler2D tColor; uniform sampler2D tDepth;
    uniform float cameraNear, cameraFar, focus, blur, maxR; uniform vec2 res;
    varying vec2 vUv;
    float viewZ(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cameraNear, cameraFar); }
    float coc(float z) { return clamp(blur * abs(z - focus) / max(z, 0.01), 0.0, maxR); }
    void main() {
      vec3 c0 = texture2D(tColor, vUv).rgb;
      if (blur <= 0.0) { gl_FragColor = vec4(c0, 1.0); return; }
      float zc = viewZ(vUv), cc = coc(zc);
      vec3 acc = c0; float ws = 1.0;
      for (int i = 0; i < 56; i++) {
        float r = sqrt((float(i) + 0.5) / 56.0) * maxR;
        float a = float(i) * 2.39996323;
        vec2 uv = vUv + vec2(cos(a), sin(a)) * r / res;
        float zs = viewZ(uv), cs = coc(zs);
        float c = zs > zc ? min(cs, cc) : cs;
        float w = smoothstep(r - 1.5, r + 0.5, c);
        acc += texture2D(tColor, uv).rgb * w; ws += w;
      }
      gl_FragColor = vec4(acc / ws, 1.0);
    }`,
}, "tColorUnused");
// ShaderPass 會複製 uniforms, 而渲染目標的貼圖不能複製 (會變成 null), 建好之後再接上
dof.uniforms.tColor.value = accRT.texture;
dof.uniforms.tDepth.value = depthRT.depthTexture;

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType }));
composer.addPass(dof);
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.5, 0.7, 1.0));
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, fade: { value: 1 }, time: { value: 0 } },
  vertexShader: quadVS,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float fade; uniform float time; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + time) * 43758.5453); }
    void main(){ vec2 d = vUv - 0.5;
      vec2 ca = d * 0.0022; // 鏡頭色差: 越靠邊紅藍分得越開 (很輕微)
      vec4 c = texture2D(tDiffuse, vUv);
      c.r = texture2D(tDiffuse, vUv + ca).r; c.b = texture2D(tDiffuse, vUv - ca).b;
      float v = smoothstep(0.85, 0.25, length(d * vec2(1.0, 0.85)));
      c.rgb *= mix(0.35, 1.0, v);
      c.rgb = mix(c.rgb, c.rgb * vec3(0.92, 1.0, 1.1), 0.5);
      c.rgb += (h(vUv * 900.0) - 0.5) * 0.012;
      float bar = step(0.0, 0.5 - abs(d.y));
      gl_FragColor = vec4(c.rgb * fade * bar, 1.0); }`,
});
composer.addPass(grade);
composer.addPass(new OutputPass());

const RED_ROUGH = MAT.redGloss.roughness;
const LAMPS: [THREE.MeshStandardMaterial, number][] = [MAT.amber, MAT.green, MAT.white, MAT.ledBlue].map((m) => [m, m.emissiveIntensity]);
const locate = (time: number) => {
  let t = ((time % TOTAL) + TOTAL) % TOTAL, i = 0, start = time - t;
  while (t >= SHOTS[i].dur) { t -= SHOTS[i].dur; start += SHOTS[i].dur; i++; }
  return { i, t, start, dur: SHOTS[i].dur };
};

/** 把場景擺成某個時間點的樣子 (車、鏡頭、燈、號誌、微塵), 不畫 */
function stage(time: number) {
  const { i, t, dur } = locate(time);
  const s = SHOTS[i];
  for (const m of signals) (m.material as THREE.MeshBasicMaterial).opacity = 0;
  shotState.dark = 0; shotState.lamps = 1; shotState.blur = 0; shotState.gloss = 0; sweep.intensity = 0;
  s.run(t / dur, t);
  // 暗場 (開場揭幕): 燈、環境反光、燈條、地面線一起調暗, 留一點點才看得到倉庫的輪廓
  const lit = 1 - 0.96 * shotState.dark;
  hemi.intensity = LIT.hemi * lit; key.intensity = LIT.key * lit; rim.intensity = LIT.rim * lit; fill.intensity = LIT.fill * lit;
  scene.environmentIntensity = LIT.env * lit;
  stripMat.color.copy(LIT.strip).multiplyScalar(lit); redMat.color.copy(LIT.red).multiplyScalar(lit);
  lineMat.color.copy(LIT.line).multiplyScalar(lit); dashMat.color.copy(LIT.dash).multiplyScalar(lit);
  shaftMat.opacity = SHAFT_OPACITY * lit; dustMat.opacity = DUST_OPACITY * (0.25 + 0.75 * lit);
  for (const [m, base] of LAMPS) m.emissiveIntensity = base * shotState.lamps;
  MAT.redGloss.roughness = lerp(RED_ROUGH, 0.16, shotState.gloss);
  if (S.screen) S.screen.emissiveIntensity = 0.8 * shotState.lamps;
  moveDust(time);
  for (const m of signals) m.visible = (m.material as THREE.MeshBasicMaterial).opacity > 0.01;
  // 開頭 / 結尾淡入淡出 (循環接縫), 每個鏡頭切換處很短的壓暗
  const g = Math.min(1, time / 0.7, (TOTAL - time) / 0.7);
  const cut = Math.min(1, t / 0.18 + 0.25, (dur - t) / 0.18 + 0.25);
  grade.uniforms.fade.value = Math.max(0, Math.min(g, cut));
  grade.uniforms.time.value = time;
}

/** 算一格: setup(dt) 把場景擺到快門開著的某個時刻, 子影格平均起來就是動態模糊; 景深用中間那一刻 */
function capture(setup: (dt: number) => void, mb: number) {
  renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 0); renderer.clear();
  for (let k = 0; k < mb; k++) {
    setup(mb > 1 ? ((k + 0.5) / mb - 0.5) * (SHUTTER / FPS) : 0);
    renderer.setClearColor(BG, 1);
    renderer.setRenderTarget(subRT); renderer.clear(); renderer.render(scene, camera);
    (accQuad.material as THREE.ShaderMaterial).uniforms.tSrc.value = subRT.texture;
    (accQuad.material as THREE.ShaderMaterial).uniforms.w.value = 1 / mb;
    renderer.autoClear = false; renderer.setRenderTarget(accRT); accQuad.render(renderer); renderer.autoClear = true;
  }
  setup(0);
  renderDepth();
  dof.uniforms.focus.value = shotState.focus;
  dof.uniforms.blur.value = shotState.blur * (W / 1600);
  composer.render();
}

export function frame(time: number, mb = MB) {
  const { start, dur } = locate(time);
  // 子影格不跨鏡頭, 切換處才不會有前後兩個鏡頭疊在一起的殘影
  capture((dt) => stage(Math.min(start + dur - 1e-4, Math.max(start, time + dt))), mb);
}

const b64 = (u8: Uint8Array) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
const api: any = ((window as any).HERO = { TOTAL, S, cfg });
api.ready = () => ready.then(() => JSON.stringify({ info: S.info, pal: S.palSize, total: TOTAL }));
api.still = async (time: number, quality = 0.9, mb = MB) => { await ready; frame(time, mb); return canvas.toDataURL("image/jpeg", quality).split(",")[1]; };
api.video = async (fps: number, bitrate: number) => {
  await ready;
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({ target, video: { codec: "V_VP9", width: W, height: H, frameRate: fps } });
  let err: any = null;
  const enc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => (err = e) });
  enc.configure({ codec: "vp09.00.40.08", width: W, height: H, bitrate, framerate: fps, latencyMode: "quality" });
  const n = Math.round(TOTAL * fps);
  for (let i = 0; i < n; i++) {
    frame(i / fps);
    const vf = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
    enc.encode(vf, { keyFrame: i % (fps * 2) === 0 }); vf.close();
    while (enc.encodeQueueSize > 4) await new Promise((r) => setTimeout(r, 2));
    api.progress = i + 1;
    if (err) throw err;
  }
  await enc.flush(); muxer.finalize();
  api.out = new Uint8Array(target.buffer);
  return api.out.length;
};
// 檢查用: 單獨拍一台車 (kind = fk / mir / m68), 指定顏色群標成洋紅
api.inspect = async (kind: string, yaw: number, pitch: number, hexes: string[] = [], dist = 4.2) => {
  await ready;
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x30343a);
  sc.environment = scene.environment;
  sc.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.2));
  const dl = new THREE.DirectionalLight(0xffffff, 1.5); dl.position.set(3, 5, 4); sc.add(dl);
  const m = highlightClone(S.models[kind], hexes); m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); sc.add(m);
  const b = new THREE.Box3().setFromObject(m), c = b.getCenter(new THREE.Vector3());
  const cam = new THREE.PerspectiveCamera(35, W / H, 0.05, 50);
  cam.position.set(c.x + dist * Math.cos(pitch) * Math.cos(yaw), c.y + dist * Math.sin(pitch), c.z + dist * Math.cos(pitch) * Math.sin(yaw));
  cam.lookAt(c);
  const tm = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping;
  renderer.setRenderTarget(null); renderer.render(sc, cam); renderer.toneMapping = tm;
  return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
};
// 檢查用: 把一台車 (fk / mir / m68) 單獨放在走道中央, 用正式的燈光和後製從指定角度拍
api.view = async (which: string, yaw: number, pitch: number, dist: number, ty = 0.5, fov = 30) => {
  await ready;
  const cars = [S.mir, S.mir2, S.m68, ...S.F];
  cars.forEach((c: Car, i: number) => place(c, 300 + i * 5, 0));
  for (const m of signals) (m.material as THREE.MeshBasicMaterial).opacity = 0, (m.visible = false);
  const car = which === "fk" ? S.F[0] : which === "mir" ? S.mir : S.m68;
  place(car, 0, 0, 0); if (which === "fk") lift(S.F[0], 0.3);
  lights(0, 0, -6, 3.5, -5, 6, 2.5, 5);
  look(dist * Math.cos(pitch) * Math.cos(yaw), ty + dist * Math.sin(pitch), dist * Math.cos(pitch) * Math.sin(yaw), 0, ty, 0, fov);
  shotState.blur = 0;
  grade.uniforms.fade.value = 1;
  capture(() => {}, 1);
  return canvas.toDataURL("image/jpeg", 0.88).split(",")[1];
};
// 檢查用: 從側面往內打射線, 各高度打到多深 (找 MiR 上下外殼中間的縫)
api.profile = async (which: string, x: number, z: number, dirx: number, dirz: number) => {
  await ready;
  const m = S.models[which];
  m.updateMatrixWorld(true);
  const rc = new THREE.Raycaster(); const out: string[] = [];
  for (let y = 0.02; y <= 0.3; y += 0.005) {
    rc.set(new THREE.Vector3(x, y, z), new THREE.Vector3(dirx, 0, dirz).normalize());
    const h = rc.intersectObject(m, true)[0];
    out.push(`${y.toFixed(3)}:${h ? (h.distance).toFixed(3) : "-"}`);
  }
  return out.join(" ");
};
api.chunk = (i: number, size = 1 << 20) => b64(api.out.subarray(i * size, (i + 1) * size));
