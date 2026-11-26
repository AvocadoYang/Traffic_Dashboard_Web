/**
 * 「後端無法連線」頁的背景影片: 傍晚的廣運頂坪廠區 (照街景做的: 淡綠色鐵皮廠房、門口磁磚門柱和招牌、棕櫚樹、辦公大樓、後面的山),
 * 車隊停在廠房裡充電休息, 鏡頭很慢地移動、鏡頭之間淡入淡出。想要的感覺是輕鬆、安靜 (不是告警):
 * 夕陽從廠房開口的柱子之間照進來, 空氣裡有微塵。
 *
 * 跟登入頁影片 (scene.ts) 共用車的模型與擬真材質 (materials.ts) 和錄影方式 (run.mjs, PAGE=rest.html)。
 * 會動的東西 (微塵、充電燈) 週期都是整支影片長度的整數分之一, 頭尾接得起來 (無縫循環)。
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { Muxer, ArrayBufferTarget } from "webm-muxer";
import { realize, stamp, lightBand, MAT, kenmecTexture, numberTexture, screenTexture } from "./materials";
import { rigForklift } from "../../src/components/Fleet3D/forkliftRig";
import forkliftGlb from "../../public/models/forklift.glb";
import mirGlb from "../../public/models/mir250.glb";
import m68Glb from "../../public/models/m68.glb";

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
renderer.toneMappingExposure = 1.0;

// ---------- 分鏡長度 (先定, 循環週期要用) ----------
const DURS = [7.5, 6.5, 6.5, 7, 7.5, 7];
export const TOTAL = DURS.reduce((a, b) => a + b, 0);
/** 鏡頭之間淡入淡出多久 (秒) */
const XF = 1.8;
const TAU = Math.PI * 2;
/** 整支影片轉 k 圈的角速度: 用這個當速度的動畫頭尾接得起來 */
const loopW = (k: number) => (TAU * k) / TOTAL;

const scene = new THREE.Scene();
const BG = new THREE.Color(0x000000);
// 暖色的空氣 (室內也有一點霧, 光比較柔)
scene.fog = new THREE.FogExp2(new THREE.Color(0.36, 0.25, 0.3), 0.0034);

/** 太陽方向 (從場景指向太陽): 很低 (約 10 度), 在廣場盡頭的山後面 (照片上的夕陽), 光從廠房開口斜斜地照進去 */
const SUN = new THREE.Vector3(0.3, 0.19, -1).normalize();

// ---------- 天空 (漸層 + 太陽 + 薄雲) ----------
const SKY_GLSL = /* glsl */ `
  uniform vec3 sunDir;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
  vec3 skyCol(vec3 d, bool clouds) {
    float h = d.y;
    float s = max(dot(d, sunDir), 0.0);
    vec3 zenith = vec3(0.07, 0.11, 0.26), upper = vec3(0.26, 0.2, 0.36), low = vec3(0.78, 0.3, 0.24), hor = vec3(1.05, 0.44, 0.2);
    vec3 c = mix(hor, low, smoothstep(0.0, 0.06, h));
    c = mix(c, upper, smoothstep(0.05, 0.26, h));
    c = mix(c, zenith, smoothstep(0.24, 0.75, h));
    if (h < 0.0) c = mix(hor, vec3(0.42, 0.26, 0.26), smoothstep(0.0, -0.08, h));
    // 太陽附近的光暈 (地平線附近更寬)
    c += vec3(1.1, 0.48, 0.16) * pow(s, 14.0) * 0.5 + vec3(1.6, 0.8, 0.3) * pow(s, 160.0) * 0.6;
    if (clouds && h > 0.0) {
      // 薄薄的層雲, 投影在天空平面上拉長成一條一條
      vec2 uv = d.xz / (h + 0.06);
      float n = fbm(uv * vec2(0.55, 1.6) + vec2(3.0, 9.0));
      float band = smoothstep(0.012, 0.05, h) * (1.0 - smoothstep(0.18, 0.45, h));
      float cl = smoothstep(0.5, 0.82, n) * band;
      vec3 lit = mix(vec3(0.95, 0.45, 0.42), vec3(2.4, 1.35, 0.7), pow(s, 6.0));
      c = mix(c, lit * (0.55 + 0.6 * n), cl * 0.75);
    }
    // 太陽本體 (HDR, 會被光暈放大)
    c += vec3(7.0, 4.2, 2.2) * smoothstep(0.99955, 0.9998, s) * smoothstep(-0.002, 0.004, h);
    return c;
  }
`;
const skyMat = new THREE.ShaderMaterial({
  uniforms: { sunDir: { value: SUN } },
  vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: SKY_GLSL + "varying vec3 vDir; void main(){ gl_FragColor = vec4(skyCol(normalize(vDir), true), 1.0); }",
  side: THREE.BackSide, depthWrite: false, fog: false,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(190, 48, 24), skyMat);
sky.renderOrder = -10;
scene.add(sky);

// 反射環境: 同一片天空 (沒有雲, 反射裡看不出來), 烤漆上會有夕陽的長條反光
const pmrem = new THREE.PMREMGenerator(renderer);
{
  const env = new THREE.Scene();
  const m = skyMat.clone(); m.fragmentShader = SKY_GLSL + "varying vec3 vDir; void main(){ gl_FragColor = vec4(skyCol(normalize(vDir), false), 1.0); }";
  m.uniforms = { sunDir: { value: SUN } };
  env.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), m));
  scene.environment = pmrem.fromScene(env, 0.03).texture;
  scene.environmentIntensity = 0.55;
}

const camera = new THREE.PerspectiveCamera(35, W / H, 0.25, 400);

// ---------- 場地 (照廣運頂坪廠區的街景: 鐵皮廠房、門口的磁磚門柱和招牌、棕櫚樹、辦公大樓、後面的山) ----------
// 座標: 門口外的馬路沿 x 方向 (z ≈ 16), 大門在 z = 10, 車道往 -z 進去; 左邊 (x -15 ~ -1) 是長條的鐵皮廠房,
// 開口那一面朝車道 (+x), 往裡面分三段一段比一段矮; 右邊是白色的辦公大樓。
const unit = new THREE.BoxGeometry(1, 1, 1);
const addBox = (mat: THREE.Material | THREE.Material[], x: number, y: number, z: number, sx: number, sy: number, sz: number, cast = true) => {
  const m = new THREE.Mesh(unit, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = cast; m.receiveShadow = true; scene.add(m); return m;
};
const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) => {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
};
const rep = (t: THREE.Texture, rx: number, ry: number) => { const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c; };
let seed = 21;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const noise2 = (() => {
  const h = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const n = (x: number, y: number) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    return lerpN(lerpN(h(ix, iy), h(ix + 1, iy), ux), lerpN(h(ix, iy + 1), h(ix + 1, iy + 1), ux), uy); };
  return (x: number, y: number, oct = 5) => { let s = 0, a = 0.5; for (let i = 0; i < oct; i++) { s += a * n(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 5.3; a *= 0.5; } return s; };
})();
function lerpN(a: number, b: number, t: number) { return a + (b - a) * t; }

// 鐵皮浪板: 淡橄欖綠 (照片上的顏色), 直條紋
const ribTex = (base: string, w = 256) => canvasTex(w, 32, (g) => {
  g.fillStyle = base; g.fillRect(0, 0, w, 32);
  for (let x = 0; x < w; x += 16) { g.fillStyle = "rgba(0,0,0,0.14)"; g.fillRect(x, 0, 3, 32); g.fillStyle = "rgba(255,255,255,0.10)"; g.fillRect(x + 5, 0, 2, 32); }
});
const WALL = ribTex("#b4bdab"), ROOF = ribTex("#c0c8bb");
const wallMat = (rx: number, ry = 1) => new THREE.MeshStandardMaterial({ map: rep(WALL, rx, ry), roughness: 0.62, metalness: 0.25, side: THREE.DoubleSide });
const roofMat = (rx: number) => new THREE.MeshStandardMaterial({ map: rep(ROOF, rx, 1), roughness: 0.5, metalness: 0.35, side: THREE.DoubleSide });
const steelMat = new THREE.MeshStandardMaterial({ color: 0x8e9296, roughness: 0.45, metalness: 0.7 });
const darkSteel = new THREE.MeshStandardMaterial({ color: 0x3b3e42, roughness: 0.5, metalness: 0.6 });

/** 一個面 (四個角) */
const quad = (mat: THREE.Material, a: number[], b: number[], c: number[], d: number[], uv = [1, 1]) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, uv[0], 0, uv[0], uv[1], 0, 0, uv[0], uv[1], 0, uv[1]], 2));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
};
const tri = (mat: THREE.Material, a: number[], b: number[], c: number[]) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
};

const SHED_X0 = -15, SHED_X1 = -1; // 廠房寬 (x), 開口在 x = SHED_X1
// 照片上的廠房裡面: 屋頂底下是深灰色浪板, 淺灰色的格子桁架, 牆裡面是銀灰色浪板加一條一條橫的檁條, 外側柱子下半截漆黃色
const INNER = ribTex("#a9adb0"), UNDER = ribTex("#3a3d42");
const innerMat = (rx: number, ry = 1) => new THREE.MeshStandardMaterial({ map: rep(INNER, rx, ry), roughness: 0.45, metalness: 0.55 });
const trussMat = new THREE.MeshStandardMaterial({ color: 0x9a9ea3, roughness: 0.45, metalness: 0.6 });
const yellowMat = new THREE.MeshStandardMaterial({ color: 0xe8b818, roughness: 0.5, metalness: 0.2 });
const floodMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(3.0, 2.9, 2.6), roughness: 0.3 });
/** 兩點之間的一支細桿 (桁架用) */
const beam = (mat: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, t: number) => {
  const m = new THREE.Mesh(unit, mat); m.position.copy(a).add(b).multiplyScalar(0.5);
  m.scale.set(t, a.distanceTo(b), t); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  m.castShadow = true; scene.add(m); return m;
};
/** 屋頂一片: 上面淡綠浪板, 底下深灰浪板 (薄板, 從 a 斜到 b, 沿 z 長 len) */
const roofSlab = (ax: number, ay: number, bx: number, by: number, z0: number, z1: number) => {
  const len = z1 - z0, w = Math.hypot(bx - ax, by - ay);
  const top = new THREE.MeshStandardMaterial({ map: rep(ROOF, len / 2, 1), roughness: 0.5, metalness: 0.35 });
  const under = new THREE.MeshStandardMaterial({ map: rep(UNDER, len / 1.2, 1), roughness: 0.55, metalness: 0.5 });
  const side = new THREE.MeshStandardMaterial({ color: 0x8f978a, roughness: 0.6 });
  // BoxGeometry 的材質順序 +x -x +y -y +z -z; 盒子的 x 是斜的寬, z 是長; 貼圖轉 90 度, 浪板的波紋才是從屋脊往下
  for (const t of [top.map!, under.map!]) { t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; }
  const m = new THREE.Mesh(unit, [side, side, top, under, side, side]);
  m.position.set((ax + bx) / 2, (ay + by) / 2, (z0 + z1) / 2);
  m.rotation.set(0, 0, Math.atan2(by - ay, bx - ax)); m.scale.set(w, 0.08, len);
  m.castShadow = true; m.receiveShadow = true; scene.add(m);
};
const LIGHTS: THREE.Vector3[] = [];
/** 一段廠房: z0 ~ z1, 簷高 eave, 屋脊高 ridge; 開口那面 (x = SHED_X1) 只有柱子和上面一條封簷板 */
function shed(z0: number, z1: number, eave: number, ridge: number, endWalls: [boolean, boolean]) {
  const xm = (SHED_X0 + SHED_X1) / 2, len = z1 - z0, zc = (z0 + z1) / 2, o = 0.6; // 屋簷出挑
  roofSlab(SHED_X1 + o, eave - o * 0.18, xm, ridge, z0, z1);
  roofSlab(xm, ridge, SHED_X0 - o, eave - o * 0.18, z0, z1);
  // 後牆: 外面淡綠浪板, 裡面銀灰浪板 + 橫檁條
  addBox(wallMat(len / 2.5), SHED_X0 - 0.12, eave / 2, zc, 0.06, eave, len);
  addBox(innerMat(len / 1.5), SHED_X0 + 0.02, eave / 2, zc, 0.04, eave, len);
  for (let y = 1.3; y < eave - 0.3; y += 1.35) addBox(trussMat, SHED_X0 + 0.1, y, zc, 0.08, 0.1, len, false);
  // 兩端的山牆
  for (const [i, z] of [z0, z1].entries()) {
    if (!endWalls[i]) continue;
    const s = i ? 1 : -1;
    addBox(wallMat(5.6), xm, eave / 2, z + s * 0.06, SHED_X1 - SHED_X0, eave, 0.06);
    addBox(innerMat(9), xm, eave / 2, z - s * 0.02, SHED_X1 - SHED_X0, eave, 0.04);
    tri(wallMat(2), [SHED_X0, eave, z + s * 0.06], [SHED_X1, eave, z + s * 0.06], [xm, ridge, z + s * 0.06]);
    tri(innerMat(2), [SHED_X1, eave, z - s * 0.02], [SHED_X0, eave, z - s * 0.02], [xm, ridge, z - s * 0.02]);
    for (let y = 1.3; y < eave - 0.3; y += 1.35) addBox(trussMat, xm, y, z - s * 0.1, SHED_X1 - SHED_X0, 0.1, 0.08, false);
  }
  // 開口上方的封簷板
  addBox(wallMat(len / 2.5, 0.3), SHED_X1 + 0.05, eave - 0.45, zc, 0.12, 0.9, len);
  // 屋頂底下的檁條 (沿 z)
  const half = (SHED_X1 - SHED_X0) / 2;
  for (let k = 0.08; k < 1; k += 0.14) for (const s of [1, -1]) {
    const x = xm + s * half * k, y = ridge - (ridge - eave) * k - 0.16;
    addBox(trussMat, x, y, zc, 0.07, 0.14, len, false);
  }
  const n = Math.round(len / 7.5);
  for (let i = 0; i <= n; i++) {
    const z = z0 + (len * i) / n;
    // 開口那側的柱子: 灰色 H 型鋼, 下半截黃色, 底下黃色水泥墩; 柱子上一盞投光燈 (傍晚亮了)
    addBox(steelMat, SHED_X1, (eave - 0.9) / 2, z, 0.3, eave - 0.9, 0.3);
    addBox(yellowMat, SHED_X1, 1.0, z, 0.32, 1.5, 0.32);
    addBox(yellowMat, SHED_X1, 0.25, z, 0.7, 0.5, 0.7);
    if (i > 0 && i < n + 1) { addBox(darkSteel, SHED_X1 - 0.25, eave - 1.4, z, 0.12, 0.3, 0.42, false); addBox(floodMat, SHED_X1 - 0.32, eave - 1.45, z, 0.02, 0.22, 0.36, false); LIGHTS.push(new THREE.Vector3(SHED_X1 - 0.8, eave - 1.6, z)); }
    // 後牆那側的柱子
    addBox(steelMat, SHED_X0 + 0.2, eave / 2, z, 0.3, eave, 0.3);
    // 格子桁架: 上弦跟著屋頂斜, 下弦低 0.9 m, 中間斜撐鋸齒狀
    for (const s of [1, -1]) {
      const ex = xm + s * half, segs = 7;
      const top = (k: number) => new THREE.Vector3(lerpN(ex, xm, k), lerpN(eave - 0.05, ridge - 0.3, k), z);
      const bot = (k: number) => new THREE.Vector3(lerpN(ex, xm, k), lerpN(eave - 0.8, ridge - 1.15, k), z);
      beam(trussMat, top(0), top(1), 0.12); beam(trussMat, bot(0), bot(1), 0.1);
      for (let j = 0; j < segs; j++) { beam(trussMat, bot(j / segs), top((j + 0.5) / segs), 0.06); beam(trussMat, top((j + 0.5) / segs), bot((j + 1) / segs), 0.06); }
      beam(trussMat, top(0), bot(0), 0.08);
    }
  }
}
// 三段廠房, 越裡面越矮 (照片上一段一段往下的屋頂)
shed(-20, 4, 6.6, 8.9, [false, true]);
shed(-40, -20, 5.9, 8.0, [false, false]);
shed(-62, -40, 5.3, 7.2, [true, false]);
// 第一段和第二段的高低差, 補一片牆
addBox(wallMat(5.6, 0.3), (SHED_X0 + SHED_X1) / 2, 7.3, -20, SHED_X1 - SHED_X0, 1.6, 0.15);
// 柱子上投光燈的光 (只開第一、二段, 光源不投影子)
for (const p of LIGHTS.filter((p) => p.z > -40)) {
  const l = new THREE.PointLight(new THREE.Color(1, 0.95, 0.86), 9, 16, 2); l.position.copy(p); scene.add(l);
}

// 地: 外面柏油, 廠房裡是霧面的深灰水泥地 (照片上是有點舊的柏油色水泥地, 不反光)
const asphalt = canvasTex(512, 512, (g) => {
  g.fillStyle = "#3e3d3f"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 16000; i++) { const v = 40 + Math.random() * 50; g.fillStyle = `rgba(${v},${v},${v + 3},0.5)`; g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
});
asphalt.repeat.set(40, 40);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.92 }));
ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.03, -20); ground.receiveShadow = true; scene.add(ground);
const SHED_FLOOR: [number, number, number, number] = [SHED_X0, -62, SHED_X1, 4];
const fw = SHED_FLOOR[2] - SHED_FLOOR[0], fd = SHED_FLOOR[3] - SHED_FLOOR[1], fcx = (SHED_FLOOR[0] + SHED_FLOOR[2]) / 2, fcz = (SHED_FLOOR[1] + SHED_FLOOR[3]) / 2;
const concrete = canvasTex(256, 256, (g) => {
  g.fillStyle = "#5f6062"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 14; i++) { const x = Math.random() * 256, y = Math.random() * 256, r = 20 + Math.random() * 50; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(150,150,148,0.28)"); gr.addColorStop(1, "rgba(150,150,148,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }
  for (let i = 0; i < 6000; i++) { const v = 70 + Math.random() * 60; g.fillStyle = `rgba(${v},${v},${v},0.25)`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  g.fillStyle = "rgba(30,28,26,0.4)"; g.fillRect(0, 0, 256, 2); g.fillRect(0, 0, 2, 256);
});
concrete.repeat.set(fw / 4, fd / 4);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd), new THREE.MeshStandardMaterial({ map: concrete, roughness: 0.82 }));
floor.rotation.x = -Math.PI / 2; floor.position.set(fcx, 0.003, fcz); floor.receiveShadow = true; scene.add(floor);
// 地上的線: 廠房裡的黃色走道線、外面的停車格白線、馬路的黃線與紅線
const flat = (color: number | THREE.Color, x: number, z: number, w: number, d: number, y = 0.006) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); return m;
};
flat(0xb58f2c, -9.2, -29, 0.1, 66);
for (const dz of [-0.12, 0.12]) flat(0xd3a21c, 0, 17 + dz, 200, 0.1, -0.024);
flat(0xb3262a, 0, 12.6, 200, 0.18, -0.024);
// 人行道 (馬路邊, 紅磚)
addBox(new THREE.MeshStandardMaterial({ color: 0x8c5a4a, roughness: 0.85 }), -40, 0.04, 11.6, 80, 0.14, 1.8, false);
addBox(new THREE.MeshStandardMaterial({ color: 0x8c5a4a, roughness: 0.85 }), 60, 0.04, 11.6, 80, 0.14, 1.8, false);


// 門口: 灰色磁磚門柱 (上面兩顆圓球燈), 兩邊是招牌牆 (左「廣運公司」、右「KENMEC」), 車道中間一支柵欄
const tile = canvasTex(256, 256, (g) => {
  g.fillStyle = "#8f9193"; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) for (let x = 0; x < 256; x += 16) { const v = 135 + Math.random() * 30; g.fillStyle = `rgb(${v},${v + 2},${v + 4})`; g.fillRect(x + 1, y + 1, 14, 14); }
});
const tileMat = (rx: number, ry: number) => new THREE.MeshStandardMaterial({ map: rep(tile, rx, ry), roughness: 0.6 });
const GATE_Z = 10;
const globeMat = new THREE.MeshStandardMaterial({ color: 0xffe2a8, emissive: new THREE.Color(2.4, 1.6, 0.7), roughness: 0.3 });
for (const x of [-1.2, 9.2]) {
  addBox(tileMat(1, 3), x, 1.4, GATE_Z, 1.15, 2.8, 1.15);
  addBox(new THREE.MeshStandardMaterial({ color: 0x77797b, roughness: 0.6 }), x, 2.86, GATE_Z, 1.3, 0.12, 1.3);
  for (const dx of [-0.28, 0.28]) {
    const g = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), globeMat); g.position.set(x + dx, 3.12, GATE_Z); scene.add(g);
    addBox(darkSteel, x + dx, 2.96, GATE_Z, 0.1, 0.12, 0.1, false);
  }
}
const signTex = (text: string, color: string, font: string, mark = false) => canvasTex(1024, 220, (g) => {
  g.fillStyle = "#e8e6e1"; g.fillRect(0, 0, 1024, 220);
  g.fillStyle = color; g.textAlign = "center"; g.textBaseline = "middle"; g.font = font;
  (g as any).letterSpacing = "18px";
  g.fillText(text, mark ? 580 : 512, 116);
  if (mark) { g.fillStyle = "#c8282a"; g.fillRect(70, 70, 120, 18); g.fillRect(70, 120, 120, 18); g.save(); g.translate(130, 110); g.rotate(-0.5); g.fillRect(-8, -70, 16, 140); g.restore(); }
});
const signs: [number, number, THREE.Texture][] = [
  [-6.2, 8.6, signTex("廣運公司", "#23409a", '700 150px "Noto Serif CJK TC", serif', true)],
  [14.4, 8.6, signTex("KENMEC", "#1d3a8f", '800 170px "Liberation Sans", Arial, sans-serif')],
];
for (const [x, w, t] of signs) {
  addBox(tileMat(w / 2, 1.7 / 2), x, 0.85, GATE_Z, w, 1.7, 0.4);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.82, w * 0.82 * (220 / 1024)), new THREE.MeshStandardMaterial({ map: t, roughness: 0.45 }));
  m.position.set(x, 1.25, GATE_Z + 0.21); scene.add(m);
}
{ // 柵欄
  const bar = canvasTex(256, 16, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#d22b2b" : "#f2f2f2"; g.fillRect(i * 32, 0, 32, 16); } });
  addBox(new THREE.MeshStandardMaterial({ color: 0xe2b21c, roughness: 0.5 }), 8.2, 0.55, 2.0, 0.4, 1.1, 0.3);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 6.4, 12), new THREE.MeshStandardMaterial({ map: bar, roughness: 0.5 }));
  arm.rotation.z = Math.PI / 2; arm.position.set(4.8, 0.95, 2.0); arm.castShadow = true; scene.add(arm);
}
// 交通錐
const coneMat = new THREE.MeshStandardMaterial({ color: 0xff5a1a, roughness: 0.5 });
for (const [x, z] of [[-3, 12.1], [-4.4, 12.1], [10.8, 12.0]]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 20), coneMat); c.position.set(x, 0.35, z); c.castShadow = true; scene.add(c); }

// 矮灌木 (球狀修剪的那種)
const bushMat = new THREE.MeshStandardMaterial({ color: 0x3d5a2a, roughness: 0.95 });
const bushGeo = (() => { const g = new THREE.IcosahedronGeometry(1, 4); const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); v.multiplyScalar(1 + (noise2(v.x * 3 + 4, v.y * 3 + v.z * 2, 3) - 0.5) * 0.35); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g; })();
for (const [x, z, r] of [[-11.4, 10.9, 0.9], [20.0, 10.8, 0.95], [-8, 8.6, 1.0], [-3.5, 8.8, 0.8], [11.5, 8.7, 0.85], [17.0, 8.6, 1.0], [0.7, 5.5, 0.8], [13.5, 4.8, 0.9]]) {
  const b = new THREE.Mesh(bushGeo, bushMat); b.position.set(x, r * 0.75, z); b.scale.set(r * 1.2, r, r * 1.2); b.castShadow = true; b.receiveShadow = true; scene.add(b);
}

// 路燈 (傍晚已經亮了)
const lampHead = new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: new THREE.Color(3.2, 2.4, 1.3) });
for (const x of [-24, 22]) {
  addBox(steelMat, x, 4, 12.2, 0.16, 8, 0.16);
  const arm = addBox(steelMat, x, 8.0, 13.2, 0.1, 0.1, 2.2); arm.rotation.x = 0.15;
  addBox(lampHead, x, 7.88, 14.2, 0.3, 0.08, 0.6, false);
}

// 辦公大樓 (照片): 白色格子磁磚外牆, 二三樓是內縮的陽台 (窗簾、咖啡色格柵欄杆), 頂樓是綠色鐵皮加蓋; 一樓中間是玻璃大門
{
  const BW = 14, BD = 22, FL = 3.4, FLOORS = 4;
  /** 一面牆的貼圖: cols 個開間, 每層 64 px 高; 從上往下: 綠色鐵皮頂樓、陽台層、陽台層、一樓 */
  const facade = (cols: number, door: boolean) => {
    const W2 = cols * 96, H2 = FLOORS * 64;
    const draw = (g: CanvasRenderingContext2D, glow: boolean) => {
      g.fillStyle = glow ? "#000" : "#e6e6e2"; g.fillRect(0, 0, W2, H2);
      if (!glow) { // 格子磁磚
        g.strokeStyle = "rgba(120,125,128,0.35)"; g.lineWidth = 1;
        for (let x = 0; x < W2; x += 6) { g.beginPath(); g.moveTo(x, 64); g.lineTo(x, H2); g.stroke(); }
        for (let y = 64; y < H2; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(W2, y); g.stroke(); }
        g.fillStyle = "#5e8a58"; g.fillRect(0, 0, W2, 64); // 頂樓綠色鐵皮
        for (let x = 0; x < W2; x += 6) { g.fillStyle = "rgba(0,0,0,0.16)"; g.fillRect(x, 0, 2, 64); }
      }
      for (let c = 0; c < cols; c++) {
        const x = c * 96;
        if (!glow) { g.fillStyle = "#e9e9e6"; g.fillRect(x, 64, 8, H2 - 64); } // 柱
        // 頂樓的小窗
        if (c % 2 === 0) { g.fillStyle = glow ? "#000" : "#2e3338"; g.fillRect(x + 30, 18, 36, 26); }
        // 陽台層 (二、三樓)
        for (const f of [1, 2]) {
          const y = f * 64;
          const lit = glow && rnd() < 0.25;
          g.fillStyle = glow ? (lit ? "#ffcc80" : "#000") : "#8d8a80"; g.fillRect(x + 12, y + 8, 78, 26); // 窗 (窗簾)
          if (!glow) { for (let k = 0; k < 4; k++) { g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(x + 12 + k * 20, y + 8, 2, 26); } g.fillStyle = "#f0efec"; g.fillRect(x + 8, y + 34, 88, 8); }
          g.fillStyle = glow ? "#000" : "#7a4a2c"; g.fillRect(x + 10, y + 42, 82, 10); // 咖啡色格柵
          if (!glow) { g.strokeStyle = "rgba(230,220,200,0.55)"; for (let k = 0; k < 82; k += 5) { g.beginPath(); g.moveTo(x + 10 + k, y + 42); g.lineTo(x + 15 + k, y + 52); g.stroke(); } }
        }
        // 一樓: 窗戶, 中間開間是玻璃大門 (亮著)
        const y = 3 * 64;
        if (door && c === Math.floor(cols / 2)) {
          g.fillStyle = glow ? "#fff2d8" : "#c9d2d6"; g.fillRect(x + 6, y + 14, 92, 50);
          if (!glow) { g.fillStyle = "rgba(255,255,255,0.7)"; g.fillRect(x + 6, y + 34, 92, 6); for (let k = 0; k < 4; k++) { g.fillStyle = "#a9acae"; g.fillRect(x + 6 + k * 23, y + 14, 2, 50); } }
        } else { g.fillStyle = glow ? (rnd() < 0.3 ? "#ffd9a0" : "#000") : "#3a3f44"; g.fillRect(x + 12, y + 16, 78, 34); }
      }
    };
    const map = canvasTex(W2, H2, (g) => draw(g, false)), glowMap = canvasTex(W2, H2, (g) => draw(g, true));
    return new THREE.MeshStandardMaterial({ map, emissiveMap: glowMap, emissive: new THREE.Color(1.5, 1.15, 0.75), roughness: 0.7 });
  };
  const top = new THREE.MeshStandardMaterial({ color: 0x7c8577, roughness: 0.8 });
  // 正面 (朝 -x, 對著廣場和廠房) 有大門
  const b = new THREE.Mesh(unit, [facade(5, false), facade(7, true), top, top, facade(5, false), facade(5, false)]);
  b.position.set(19, (FL * FLOORS) / 2, -6); b.scale.set(BW, FL * FLOORS, BD); b.castShadow = true; b.receiveShadow = true; scene.add(b);
  // 大門口的雨遮和地上的磁磚
  addBox(new THREE.MeshStandardMaterial({ color: 0xdcdcd8, roughness: 0.6 }), 11.4, 3.1, -6, 1.4, 0.2, 4.2);
  addBox(new THREE.MeshStandardMaterial({ color: 0xcfcbc4, roughness: 0.5 }), 11.2, 0.03, -6, 1.8, 0.06, 6);
  // 頂樓上的鐵皮屋頂
  addBox(new THREE.MeshStandardMaterial({ color: 0x5a7558, roughness: 0.6, metalness: 0.3 }), 19, FL * FLOORS + 0.25, -6, BW + 0.4, 0.5, BD + 0.4);
}
// 廣場盡頭: 白色圍牆, 後面一棟米色的舊廠房 (照片上山腳那棟)
addBox(new THREE.MeshStandardMaterial({ color: 0xdedcd6, roughness: 0.8 }), 9, 1.1, -70, 34, 2.2, 0.3);
{
  const win = canvasTex(512, 128, (g) => { g.fillStyle = "#d3c7ae"; g.fillRect(0, 0, 512, 128); for (let x = 16; x < 512; x += 48) { g.fillStyle = "#4a4f52"; g.fillRect(x, 34, 28, 40); } g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(0, 96, 512, 4); });
  addBox(new THREE.MeshStandardMaterial({ map: win, roughness: 0.85 }), 20, 4, -82, 30, 8, 10);
  addBox(new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.8 }), 10, 6.5, -80, 5, 13, 5);
}

// 廠房裡: 牆邊的充電樁 (綠燈慢慢呼吸), 裡面幾段有棧板和貨
const CHARGE_Z = [-16.5, -12, -7.5, -3];
const chargeGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 2.2, 0.8), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
const postMat = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.45, metalness: 0.5 });
const padMat = new THREE.MeshStandardMaterial({ color: 0x2c2f33, roughness: 0.5, metalness: 0.4 });
for (const z of CHARGE_Z) {
  addBox(padMat, -13.6, 0.012, z, 1.3, 0.024, 1.3, false);
  addBox(postMat, -14.7, 0.6, z, 0.18, 1.2, 0.6);
  addBox(chargeGlow, -14.6, 1.05, z, 0.02, 0.05, 0.3, false);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 0.86, 48), chargeGlow); ring.rotation.x = -Math.PI / 2; ring.position.set(-12.7, 0.03, z); scene.add(ring);
}
// 貨: 照片上的膠合板木箱 (松木框條)、藍色鐵框籠 (裡面裝板材和紙箱)、綠色塑膠棧板、包膜的貨
const plyTex = canvasTex(256, 256, (g) => {
  g.fillStyle = "#c79a62"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { const y = Math.random() * 256; g.strokeStyle = `rgba(${120 + Math.random() * 40},${80 + Math.random() * 30},40,0.25)`; g.lineWidth = 1 + Math.random() * 3; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(80, y + Math.random() * 20 - 10, 170, y + Math.random() * 20 - 10, 256, y + Math.random() * 10 - 5); g.stroke(); }
  for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(90,55,25,0.35)"; g.beginPath(); g.ellipse(Math.random() * 256, Math.random() * 256, 6, 3, 0, 0, Math.PI * 2); g.fill(); }
});
const plyMat = new THREE.MeshStandardMaterial({ map: plyTex, roughness: 0.8 });
const pineMat = new THREE.MeshStandardMaterial({ color: 0xe0c08a, roughness: 0.75 });
const cageBlue = new THREE.MeshStandardMaterial({ color: 0x2f86c8, roughness: 0.45, metalness: 0.35 });
const tapeMat = new THREE.MeshStandardMaterial({ color: 0xf0d21e, roughness: 0.5 });
const cardMat = new THREE.MeshStandardMaterial({ color: 0xd8c4a0, roughness: 0.85 });
const greenPal = new THREE.MeshStandardMaterial({ color: 0x3fbf55, roughness: 0.5 });
const wrapMat = new THREE.MeshStandardMaterial({ color: 0xc9d3dc, roughness: 0.22, metalness: 0.1, transparent: true, opacity: 0.88 });
/** 加到一個 group 裡的方塊 */
const gbox = (g: THREE.Object3D, mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
  const m = new THREE.Mesh(unit, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
};
const placeGroup = (g: THREE.Object3D, x: number, y: number, z: number, yaw: number) => { g.position.set(x, y, z); g.rotation.y = yaw; scene.add(g); return g; };
/** 木箱: 膠合板箱 + 每一面四邊和中間的松木框條, 底下兩條墊木 */
function crate(w: number, h: number, d: number) {
  const g = new THREE.Group(), t = 0.06, f = 0.09;
  gbox(g, pineMat, 0, 0.06, -d / 2 + 0.15, w, 0.12, 0.12); gbox(g, pineMat, 0, 0.06, d / 2 - 0.15, w, 0.12, 0.12);
  const y0 = 0.12;
  gbox(g, plyMat, 0, y0 + h / 2, 0, w, h, d);
  // 長邊兩面 (±z) 與短邊兩面 (±x) 的框
  for (const s of [1, -1]) {
    const z = s * (d / 2 + t / 2);
    for (const y of [y0 + f / 2, y0 + h - f / 2, y0 + h / 2]) gbox(g, pineMat, 0, y, z, w, f, t);
    for (const x of [-w / 2 + f / 2, w / 2 - f / 2, ...(w > 1.4 ? [0] : [])]) gbox(g, pineMat, x, y0 + h / 2, z, f, h, t);
    const x2 = s * (w / 2 + t / 2);
    for (const y of [y0 + f / 2, y0 + h - f / 2]) gbox(g, pineMat, x2, y, 0, t, f, d);
    for (const zz of [-d / 2 + f / 2, d / 2 - f / 2]) gbox(g, pineMat, x2, y0 + h / 2, zz, t, h, f);
  }
  gbox(g, pineMat, 0, y0 + h + t / 2, 0, w, t, f); gbox(g, pineMat, 0, y0 + h + t / 2, -d / 2 + f / 2, w, t, f); gbox(g, pineMat, 0, y0 + h + t / 2, d / 2 - f / 2, w, t, f);
  return g;
}
/** 藍色鐵框籠: 方管框 (四角、上下框、長邊中間兩支), 裡面立著幾片板材和紙箱, 貼幾段黃色膠帶 */
function cage(w = 1.25, h = 1.75, d = 1.05, fill = true) {
  const g = new THREE.Group(), t = 0.06;
  for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) { gbox(g, cageBlue, x, h / 2, z, t, h, t); gbox(g, cageBlue, x, 0.06, z, 0.12, 0.12, 0.12); }
  for (const y of [0.16, h - t / 2]) {
    for (const z of [-d / 2, d / 2]) gbox(g, cageBlue, 0, y, z, w, t, t);
    for (const x of [-w / 2, w / 2]) gbox(g, cageBlue, x, y, 0, t, t, d);
  }
  for (const z of [-d / 2, d / 2]) { for (const x of [-w / 6, w / 6]) gbox(g, cageBlue, x, h / 2, z, t * 0.8, h, t * 0.8); gbox(g, cageBlue, 0, h * 0.55, z, w, t * 0.8, t * 0.8); }
  gbox(g, cageBlue, 0, 0.16, 0, w, 0.05, d); // 底板
  if (fill) {
    for (let i = 0; i < 4; i++) gbox(g, i % 2 ? plyMat : cardMat, -w / 2 + 0.2 + i * 0.27, 0.2 + (h - 0.35) / 2, 0, 0.2, h - 0.35, d - 0.12);
    for (const z of [-d / 2 - 0.035, d / 2 + 0.035]) { gbox(g, tapeMat, w / 6, h * 0.42, z, 0.06, 0.35, 0.01); gbox(g, tapeMat, -w / 6, h * 0.7, z, 0.06, 0.22, 0.01); }
  }
  return g;
}
const greenPallet = () => { const g = new THREE.Group(); gbox(g, greenPal, 0, 0.13, 0, 1.2, 0.04, 1.0); for (const z of [-0.42, 0, 0.42]) gbox(g, greenPal, 0, 0.06, z, 1.2, 0.12, 0.14); return g; };
/** 包膜的貨 (半透明的膜裡面看得到深色的東西) */
const wrapped = (w: number, h: number, d: number) => { const g = greenPallet(); gbox(g, darkSteel, 0, 0.15 + h * 0.45, 0, w * 0.9, h * 0.85, d * 0.9); gbox(g, wrapMat, 0, 0.15 + h / 2, 0, w, h, d); return g; };

// 第一段: 靠開口的空地有幾個藍色鐵籠和木箱 (照片那樣隨意擺), 角落疊木箱
placeGroup(cage(), -4.6, 0, 1.2, 0.05); placeGroup(cage(), -4.6, 1.78, 1.2, 0.05);
placeGroup(cage(), -6.1, 0, 1.0, -0.04);
placeGroup(crate(1.9, 1.5, 1.2), -6.6, 0, 3.1, 0.0);
placeGroup(crate(1.2, 1.0, 1.0), -13.4, 0, 2.6, 0.1); placeGroup(crate(1.2, 0.9, 1.0), -13.4, 1.14, 2.6, 0.1);
placeGroup(crate(2.2, 1.9, 1.4), -10.7, 0, 2.8, Math.PI / 2 - 0.03);
// 第二段: 一排排木箱和藍籠
{
  let z = -22;
  while (z > -38.5) {
    const big = rnd() < 0.5;
    if (rnd() < 0.55) { placeGroup(crate(big ? 2.2 : 1.5, big ? 1.8 : 1.2, 1.2), -13.2, 0, z, Math.PI / 2 + (rnd() - 0.5) * 0.06); }
    else { placeGroup(cage(), -13.6, 0, z, Math.PI / 2); if (rnd() < 0.6) placeGroup(cage(), -13.6, 1.78, z, Math.PI / 2); }
    if (rnd() < 0.6) placeGroup(rnd() < 0.5 ? cage() : crate(1.4, 1.1, 1.1), -9.5 + (rnd() - 0.5) * 0.6, 0, z + (rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.1);
    z -= big ? 2.6 : 1.9;
  }
}
// 第三段: 包膜的貨、綠色棧板
for (let z = -42; z > -60; z -= 1.6) for (const x of [-13.6, -11.9, -8.5]) {
  if (rnd() < 0.3) continue;
  placeGroup(rnd() < 0.6 ? wrapped(1.15, 0.9 + rnd() * 0.8, 0.95) : greenPallet(), x, 0, z, (rnd() - 0.5) * 0.15);
}
// 廠房外側柱子旁的黃色護柱 (照片左邊那幾支)
for (const z of [-41, -44.5, -48, -51.5]) { addBox(yellowMat, 0.2, 0.55, z, 0.25, 1.1, 0.25); addBox(yellowMat, 0.2, 0.08, z, 0.55, 0.16, 0.55); }

// 廠房開口前的水泥廣場 (全景照: 淺灰水泥地、幾塊深色補丁、淡淡的白色圈線), 兩側用黃色欄杆跟柏油車道 / 停車場隔開
{
  const slab = canvasTex(512, 512, (g) => {
    g.fillStyle = "#a6a39d"; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 20000; i++) { const v = 130 + Math.random() * 70; g.fillStyle = `rgba(${v},${v - 2},${v - 6},0.3)`; g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
    for (let i = 0; i < 26; i++) { const x = Math.random() * 512, y = Math.random() * 512, r = 30 + Math.random() * 80; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(90,88,84,0.25)"); gr.addColorStop(1, "rgba(90,88,84,0)"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); }
    g.strokeStyle = "rgba(235,235,230,0.35)"; g.lineWidth = 3;
    for (const [x, y, r] of [[160, 260, 120], [360, 300, 150], [260, 120, 90]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = "rgba(30,30,32,0.85)";
    for (const [x, y, rx, ry] of [[240, 200, 26, 12], [250, 250, 30, 12], [150, 380, 32, 16]]) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); }
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 26), new THREE.MeshStandardMaterial({ map: slab, roughness: 0.85 }));
  m.rotation.x = -Math.PI / 2; m.position.set(4.75, -0.012, -9); m.receiveShadow = true; scene.add(m);
}
// 黃色欄杆: 方管立柱每 1.7 m 一支, 上下兩條橫桿; 廣場靠大門那側一排、靠停車場那側一排再轉個角
const railYellow = new THREE.MeshStandardMaterial({ color: 0xe9bd1c, roughness: 0.45, metalness: 0.25 });
function railing(ax: number, az: number, bx: number, bz: number) {
  const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 1.7)), yaw = Math.atan2(-(bz - az), bx - ax);
  for (let i = 0; i <= n; i++) { const t = i / n; addBox(railYellow, lerpN(ax, bx, t), 0.55, lerpN(az, bz, t), 0.07, 1.1, 0.07); }
  for (const y of [1.08, 0.55]) { const r = addBox(railYellow, (ax + bx) / 2, y, (az + bz) / 2, len, 0.06, 0.06); r.rotation.y = yaw; }
}
railing(0.2, 4.2, 10.5, 4.2);
railing(0.2, -22, 6.5, -22); railing(6.5, -22, 6.5, -17.5); railing(6.5, -17.5, 10.5, -17.5);
// 停車場 (廣場另一側, 往山那邊): 白色停車格 + 幾台停著的車
for (let z = -27; z >= -47; z -= 2.6) flat(0xd8d6d0, 4.5, z, 3.6, 0.1, -0.024);
flat(0xd8d6d0, 6.3, -37, 0.1, 20.5, -0.024);
{
  const paints = [0x1f2a44, 0xb8bcc0, 0xe8e8e6, 0x16181b, 0x2c3e66, 0x8a8f94];
  const glass = new THREE.MeshStandardMaterial({ color: 0x1b2128, roughness: 0.15, metalness: 0.4 });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const car = (x: number, z: number, yaw: number, color: number, truck = false) => {
    const g = new THREE.Group(), paint = new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.8 });
    gbox(g, paint, 0, 0.62, 0, 4.3, 0.62, 1.75);
    if (truck) { gbox(g, paint, 1.15, 1.35, 0, 1.6, 0.9, 1.7); gbox(g, glass, 1.92, 1.4, 0, 0.04, 0.55, 1.5); gbox(g, darkSteel, -0.9, 1.05, 0, 2.4, 0.3, 1.75); }
    else { gbox(g, glass, -0.15, 1.18, 0, 2.3, 0.52, 1.55); gbox(g, paint, -0.15, 1.46, 0, 2.0, 0.06, 1.5); }
    for (const [wx, wz] of [[1.35, 0.8], [1.35, -0.8], [-1.35, 0.8], [-1.35, -0.8]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 16), tyre); w.rotation.x = Math.PI / 2; w.position.set(wx, 0.34, wz); g.add(w); }
    placeGroup(g, x, 0, z, yaw);
  };
  [[-28.3, 0], [-30.9, 1], [-36.1, 2], [-38.7, 3], [-41.3, 4], [-46.5, 5]].forEach(([z, c], i) => car(4.6, z + 1.3, Math.PI + (i % 2 ? 0.03 : -0.02), paints[c], i === 2));
  car(9.5, -24.5, -Math.PI / 2 + 0.05, 0x1f2a44, true);
}
// 第二棟辦公樓 (停車場後面, 一樣白格子磁磚 + 綠色鐵皮頂樓), 前面一排棕櫚樹
{
  const tileWall = canvasTex(256, 192, (g) => {
    g.fillStyle = "#e4e4e0"; g.fillRect(0, 0, 256, 192);
    g.fillStyle = "#5e8a58"; g.fillRect(0, 0, 256, 56); for (let x = 0; x < 256; x += 6) { g.fillStyle = "rgba(0,0,0,0.15)"; g.fillRect(x, 0, 2, 56); }
    for (let c = 0; c < 4; c++) { g.fillStyle = "#2f353a"; g.fillRect(c * 64 + 14, 20, 30, 20); g.fillRect(c * 64 + 8, 80, 50, 24); g.fillRect(c * 64 + 8, 140, 50, 26); g.fillStyle = "#7a4a2c"; g.fillRect(c * 64 + 6, 108, 54, 8); }
  });
  const mat = new THREE.MeshStandardMaterial({ map: rep(tileWall, 3, 1), roughness: 0.75 });
  addBox(mat, 36, 4.5, -40, 14, 9, 16);
  addBox(new THREE.MeshStandardMaterial({ color: 0x5a7558, roughness: 0.6, metalness: 0.3 }), 36, 9.2, -40, 14.4, 0.4, 16.4);
}
// 廠房左邊 (靠大門那側): 很高的灰色廠房, 屋頂上兩座冷卻塔; 前面一棟米色的低矮廠房 (捲門、紅色欄杆)
{
  const grayClad = new THREE.MeshStandardMaterial({ map: rep(ribTex("#a8acaf"), 6, 2), roughness: 0.6, metalness: 0.3 });
  addBox(grayClad, -24, 8, 9, 12, 16, 10);
  const towerMat = new THREE.MeshStandardMaterial({ color: 0xc9cdd0, roughness: 0.5 });
  for (const x of [-26.5, -21.5]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 2.2, 20), towerMat); t.position.set(x, 17.1, 9); t.castShadow = true; scene.add(t);
    const f = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.3, 20), darkSteel); f.position.set(x, 18.3, 9); scene.add(f);
  }
  const beige = canvasTex(256, 64, (g) => { g.fillStyle = "#d8c8a6"; g.fillRect(0, 0, 256, 64); for (let x = 0; x < 256; x += 8) { g.fillStyle = "rgba(0,0,0,0.08)"; g.fillRect(x, 0, 2, 64); } g.fillStyle = "#6f8a96"; g.fillRect(150, 22, 46, 42); });
  addBox(new THREE.MeshStandardMaterial({ map: beige, roughness: 0.8 }), -10, 2.6, 6.4, 9.5, 5.2, 2.6);
  addBox(new THREE.MeshStandardMaterial({ color: 0x8e9294, roughness: 0.6, metalness: 0.3 }), -10, 5.35, 6.4, 10, 0.3, 3.2);
  const red = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5 });
  for (let x = -14; x <= -6; x += 1.6) addBox(red, x, 0.5, 8.0, 0.05, 1.0, 0.05);
  addBox(red, -10, 1.0, 8.0, 8, 0.05, 0.05);
}
// 廠房開口內側堆的白色板材 (全景照中間那堆)
{
  const white = new THREE.MeshStandardMaterial({ color: 0xe8eaec, roughness: 0.35, metalness: 0.2 });
  for (const [z, n] of [[-14.5, 4], [-16.0, 3], [-21.5, 5], [-23.2, 2], [-25, 4]] as [number, number][]) {
    const g = greenPallet();
    for (let k = 0; k < n; k++) gbox(g, white, 0, 0.17 + k * 0.16, 0, 1.15, 0.14, 0.95);
    placeGroup(g, -2.4, 0, z, (rnd() - 0.5) * 0.1);
  }
}

// 棕櫚樹 (扇葉的那種, 照片上門口兩棵): 細長的樹幹 + 一圈扇形的葉子
const palmLeafTex = canvasTex(256, 256, (g) => {
  // u = 角度, v = 半徑: 葉子外圈裂成一條一條
  g.clearRect(0, 0, 256, 256);
  g.fillStyle = "#fff"; g.fillRect(0, 0, 256, 256);
  g.globalCompositeOperation = "destination-out";
  const n = 22;
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * 256;
    g.beginPath(); g.moveTo(u, 256 * 0.42); g.lineTo(u - 6, 256); g.lineTo(u + 6, 256); g.closePath(); g.fill();
  }
}, false);
const leafMat = new THREE.MeshStandardMaterial({ color: 0x3e6a2c, roughness: 0.75, side: THREE.DoubleSide, alphaMap: palmLeafTex, alphaTest: 0.5 });
const deadLeafMat = new THREE.MeshStandardMaterial({ color: 0x7a6440, roughness: 0.9, side: THREE.DoubleSide, alphaMap: palmLeafTex, alphaTest: 0.5 });
const trunkMat = new THREE.MeshStandardMaterial({
  map: canvasTex(64, 64, (g) => { g.fillStyle = "#6b6158"; g.fillRect(0, 0, 64, 64); for (let y = 0; y < 64; y += 8) { g.fillStyle = "rgba(30,25,20,0.5)"; g.fillRect(0, y, 64, 2); } }),
  roughness: 0.95,
});
/** 扇形葉片: 在葉柄末端展開 (local +x 是往外), 往外越遠越下垂 */
const fanGeo = (() => {
  const R = 1.15, span = Math.PI * 0.95, rs = 6, as = 20;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= rs; i++) for (let j = 0; j <= as; j++) {
    const r = (i / rs) * R, a = -span / 2 + (j / as) * span;
    const fold = (j % 2 ? 0.05 : -0.05) * (i / rs); // 摺扇的摺痕
    pos.push(Math.cos(a) * r, -0.85 * (r / R) ** 2 - 0.25 * Math.abs(Math.sin(a)) * (r / R) + fold, Math.sin(a) * r);
    uv.push(j / as, i / rs);
  }
  for (let i = 0; i < rs; i++) for (let j = 0; j < as; j++) { const a = i * (as + 1) + j, b = a + as + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
})();
function palm(x: number, z: number, h: number, lean: [number, number]) {
  const curve = new THREE.CatmullRomCurve3([V3(x, 0, z), V3(x + lean[0] * 0.2, h * 0.4, z + lean[1] * 0.2), V3(x + lean[0] * 0.6, h * 0.75, z + lean[1] * 0.6), V3(x + lean[0], h, z + lean[1])]);
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.2, 10), trunkMat);
  (trunk.material as THREE.MeshStandardMaterial).map!.repeat.set(1, h * 2);
  trunk.castShadow = true; scene.add(trunk);
  const top = curve.getPoint(1);
  const crown = new THREE.Group(); crown.position.copy(top); scene.add(crown);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), trunkMat); bulb.scale.y = 1.3; crown.add(bulb);
  const leaves = 30;
  for (let i = 0; i < leaves; i++) {
    const dead = i >= 27;
    const az = (i / (dead ? 3 : 27)) * Math.PI * 2 + rnd() * 0.4 + (dead ? 0.3 : 0);
    const el = dead ? -1.2 - rnd() * 0.2 : [0.9, 0.45, 0.05, -0.35][i % 4] + (rnd() - 0.5) * 0.3;
    const len = dead ? 0.8 : 1.0 + rnd() * 0.6;
    const arm = new THREE.Group(); arm.rotation.order = "YZX"; arm.rotation.y = az; arm.rotation.z = el; crown.add(arm);
    const pet = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, len, 5), dead ? deadLeafMat : trunkMat);
    pet.rotation.z = -Math.PI / 2; pet.position.x = len / 2; arm.add(pet);
    const fan = new THREE.Mesh(fanGeo, dead ? deadLeafMat : leafMat); fan.position.x = len; fan.rotation.z = -el * 0.6 - 0.1; fan.castShadow = true;
    fan.scale.setScalar(dead ? 0.9 : 0.95 + rnd() * 0.25); arm.add(fan);
  }
}
function V3(x: number, y: number, z: number) { return new THREE.Vector3(x, y, z); }
palm(13.2, 7.9, 11.5, [0.5, -0.3]);
palm(16.4, 6.9, 9.0, [-0.4, 0.2]);
for (const [z, h] of [[-33, 8.5], [-37, 9.5], [-41, 8.0], [-45, 9.0]]) palm(27.5, z, h, [0.2, -0.2]);

// 後面的山: 廠區在山谷裡, 四周都是有樹林的山; 夕陽那個方向 (廣場盡頭) 比較低, 山脊上有一排南洋杉 (照片上的剪影)
const sunXZ = new THREE.Vector2(SUN.x, SUN.z).normalize();
const HILL_C = new THREE.Vector2(5, -25);
const hillY = (x: number, z: number) => {
  const d = new THREE.Vector2(x - HILL_C.x, z - HILL_C.y), r = d.length();
  const toward = d.normalize().dot(sunXZ);
  const mask = THREE.MathUtils.smoothstep(r, 52, 115) * (1 - 0.72 * THREE.MathUtils.smoothstep(toward, 0.55, 0.95));
  const big = noise2(x / 120 + 3, z / 120 + 7, 4), trees = noise2(x / 4.5, z / 4.5, 3);
  return { y: mask * (14 + 48 * big) + mask * (trees - 0.5) * 4.5 - 0.05, big, trees };
};
{
  const N = 400, SIZE = 700;
  const g = new THREE.PlaneGeometry(SIZE, SIZE, N, N); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  const col: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + HILL_C.x, z = p.getZ(i) + HILL_C.y;
    const { y, big, trees } = hillY(x, z);
    p.setX(i, x); p.setZ(i, z); p.setY(i, y);
    const c = new THREE.Color(0.02, 0.06, 0.015).lerp(new THREE.Color(0.06, 0.13, 0.03), trees).multiplyScalar(0.8 + 0.4 * big);
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const hills = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  hills.position.y = -0.06; hills.receiveShadow = true; scene.add(hills);
}
// 南洋杉: 細高的樹幹, 一層一層水平的枝 (越上面越短), 夕陽前面是剪影
const pineMat2 = new THREE.MeshStandardMaterial({ color: 0x1d2b18, roughness: 0.95 });
function norfolk(x: number, z: number, h: number) {
  const base = hillY(x, z).y - 0.5;
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, h, 6), pineMat2); t.position.set(x, base + h / 2, z); scene.add(t);
  const tiers = Math.round(h / 1.4);
  for (let k = 0; k < tiers; k++) {
    const f = k / tiers, y = base + h * (0.25 + 0.75 * f), r = (1 - f) * h * 0.2 + 0.35;
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, 0.9 + (1 - f) * 0.6, 9), pineMat2); c.position.set(x, y, z); c.rotation.y = k * 0.7; c.castShadow = true; scene.add(c);
  }
}
{
  const az0 = Math.atan2(sunXZ.y, sunXZ.x);
  const spots: [number, number, number][] = [[-0.2, 92, 19], [-0.13, 97, 23], [-0.08, 88, 16], [-0.02, 100, 26], [0.05, 94, 21], [0.11, 90, 17], [0.2, 102, 20], [-0.3, 96, 15]];
  for (const [da, r, h] of spots) norfolk(HILL_C.x + Math.cos(az0 + da) * r, HILL_C.y + Math.sin(az0 + da) * r, h);
}
// 圍牆後面和廠區邊的樹叢
for (const [x, z, r] of [[-6, -76, 3.2], [-12, -74, 2.6], [2, -77, 2.8], [38, -72, 3.5], [32, -66, 2.4], [30, 14, 2.6], [-20, 12, 2.2]]) {
  const b = new THREE.Mesh(bushGeo, new THREE.MeshStandardMaterial({ color: 0x2a4220, roughness: 0.95 })); b.position.set(x, r * 0.9, z); b.scale.set(r * 1.1, r, r * 1.1); b.castShadow = true; scene.add(b);
}

// ---------- 燈 ----------
const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 0.6, 0.34), 4.2);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 30, bottom: -30, near: 1, far: 220 });
sun.target.position.set(-2, 0, -22); sun.position.copy(sun.target.position).addScaledVector(SUN, 110);
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(new THREE.Color(0.55, 0.5, 0.75), new THREE.Color(0.25, 0.16, 0.12), 0.55); scene.add(hemi);
const bounce = new THREE.DirectionalLight(new THREE.Color(0.5, 0.55, 0.9), 0.35); bounce.position.set(-30, 10, -40); bounce.target.position.set(-8, 0, -10); scene.add(bounce, bounce.target);

// ---------- 微塵 (廠房裡, 被夕陽照到的亮) ----------
const gradTex = (w: number, draw: (g: CanvasRenderingContext2D) => void) => { const cv = document.createElement("canvas"); cv.width = cv.height = w; draw(cv.getContext("2d")!); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };
const DUST = 3000;
const dustBase = new Float32Array(DUST * 5);
const dustCol = new Float32Array(DUST * 3);
{
  const shade = new THREE.Raycaster(); const blockers: THREE.Object3D[] = [];
  scene.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.castShadow) blockers.push(o); });
  scene.updateMatrixWorld(true);
  for (let i = 0; i < DUST; i++) {
    const x = -14.5 + rnd() * 13.3, y = 0.15 + rnd() * 5.6, z = -24 + rnd() * 27;
    dustBase.set([x, y, z, rnd() * TAU, 1 + Math.floor(rnd() * 3)], i * 5);
    shade.set(new THREE.Vector3(x, y, z), SUN); shade.far = 120;
    const lit = shade.intersectObjects(blockers, false).length ? 0.08 : 1;
    dustCol.set([lit, lit * 0.78, lit * 0.6], i * 3);
  }
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(DUST * 3), 3));
dustGeo.setAttribute("color", new THREE.BufferAttribute(dustCol, 3));
const dustMat = new THREE.PointsMaterial({
  size: 0.022, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, opacity: 0.55,
  map: gradTex(32, (g) => { const r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 32, 32); }),
});
const dust = new THREE.Points(dustGeo, dustMat); dust.frustumCulled = false; scene.add(dust);
const moveDust = (time: number) => {
  const p = dustGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < DUST; i++) {
    const o = i * 5, x = dustBase[o], y = dustBase[o + 1], z = dustBase[o + 2], ph = dustBase[o + 3], k = dustBase[o + 4];
    const a = loopW(k) * time + ph;
    p.setXYZ(i, x + Math.sin(a) * 0.3, y + Math.sin(a * 2 + ph) * 0.08, z + Math.cos(a) * 0.3);
  }
  p.needsUpdate = true;
};

// ---------- 車 ----------
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const load = (u8: Uint8Array) => new Promise<THREE.Object3D>((res, rej) =>
  loader.parse(u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength), "", (g) => {
    g.scene.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    res(g.scene);
  }, rej));
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const decalMat = (map: THREE.Texture, extra: THREE.MeshPhysicalMaterialParameters = {}) => new THREE.MeshPhysicalMaterial({
  map, transparent: true, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.15, polygonOffset: true, polygonOffsetFactor: -4, depthWrite: false, ...extra,
});
const put = (o: THREE.Object3D, x: number, z: number, yaw: number) => { const g = new THREE.Group(); g.add(o); g.position.set(x, 0, z); g.rotation.y = yaw; scene.add(g); return g; };

const S: any = {};
export const ready = (async () => {
  const [fk, mir, m68] = await Promise.all([load(forkliftGlb), load(mirGlb), load(m68Glb)]);
  realize(fk, "forklift"); realize(m68, "m68"); realize(mir, "mir");
  const kenmec = decalMat(kenmecTexture());
  fk.add(stamp(fk, V(2.5, 0.98, 0), V(-1, 0, 0), V(0.46, 0.092, 0.4), kenmec).mesh);
  for (const s of [1, -1]) {
    m68.add(stamp(m68, V(0, 0.33, 2 * s), V(0, 0, -s), V(0.5, 0.1, 0.3), kenmec).mesh);
    mir.add(stamp(mir, V(0.08, 0.252, 2 * s), V(0, 0, -s), V(0.2, 0.04, 0.2), kenmec).mesh);
  }
  const scr = screenTexture();
  const screen = new THREE.MeshStandardMaterial({ map: scr, emissiveMap: scr, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.12, transparent: true, polygonOffset: true, polygonOffsetFactor: -4, depthWrite: false });
  fk.add(stamp(fk, V(2.5, 1.68, 0), V(-1, 0, 0), V(0.2, 0.15, 0.3), screen).mesh);
  const numSides = [1, -1].map((s) => stamp(fk, V(0.58, 0.76, 2 * s), V(0, 0, -s), V(0.2, 0.15, 0.4), MAT.white).mesh.geometry);
  const band = lightBand(mir, MAT.ledBlue); mir.add(band.mesh);
  S.F = ["15", "7", "1", "9", "2"].map((n, i) => {
    const model = i ? fk.clone(true) : fk;
    const num = decalMat(numberTexture(n), { clearcoat: 0.35, clearcoatRoughness: 0.3, roughness: 0.45 });
    for (const g of numSides) model.add(new THREE.Mesh(g, num));
    rigForklift(model).setLift(0);
    return model;
  });
  // 牆邊充電座: 倒車靠牆 (牙叉朝牆), 第一格是 MiR
  S.F.slice(0, 3).forEach((m: THREE.Object3D, i: number) => put(m, -13.2, CHARGE_Z[i + 1], 0));
  put(mir.clone(true), -13.4, CHARGE_Z[0], 0);
  // 2 號叉車叉著一個藍色鐵籠停在第一段中間 (車頭朝開口), 9 號停在外面第二段的欄杆旁; SW15 停在開口邊, 另一台 MiR 在外面
  const carrier = put(S.F[4], -5.6, -9.5, 0.06);
  rigForklift(S.F[4]).setLift(0.12);
  const held = cage(); held.position.set(-0.58, 0.12, 0); held.rotation.y = Math.PI / 2; carrier.add(held);
  put(S.F[3], 2.0, -19.5, Math.PI + 0.2);
  put(m68, -3.6, -17.5, Math.PI / 2 + 0.08);
  put(mir, 3.2, -15.5, Math.PI * 0.62);
})();

// ---------- 分鏡 ----------
const ease = (x: number) => x * x * (3 - 2 * x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const shotState = { focus: 5, blur: 0 };
const lookDir = new THREE.Vector3();
const look = (px: number, py: number, pz: number, tx: number, ty: number, tz: number, fov: number) => {
  camera.position.set(px, py, pz); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(tx, ty, tz);
  lookDir.set(tx - px, ty - py, tz - pz).normalize();
};
const focusOn = (x: number, y: number, z: number, blur: number) => {
  shotState.focus = Math.max(0.3, new THREE.Vector3(x, y, z).sub(camera.position).dot(lookDir));
  shotState.blur = blur;
};
/** u 可能 > 1 (淡出到下一個鏡頭時還在跑), 移動照時間線性延伸, 不會停住 */
const SHOTS: ((u: number, t: number) => void)[] = [
  // 0. 廠房裡往外看: 桁架、亮著的投光燈、木箱和藍籠, 開口外面是廣場和山後的夕陽, 光斜斜地照進來
  (u) => {
    look(lerp(-9.6, -9.0, u), lerp(1.7, 1.85, u), lerp(2.8, 0.8, u), 2, 3.0, -40, 50);
    focusOn(-5.6, 1.2, -9.5, 2.5);
  },
  // 1. 充電中的叉車特寫: 低角度側拍, 地上的充電圈慢慢呼吸
  (u) => {
    const z = lerp(-11.1, -9.6, u);
    look(-9.25, 0.55, z, -12.85, 0.9, z + 2.1, 32);
    focusOn(-12.45, 0.9, -7.5, 9);
  },
  // 2. 2 號叉車叉著藍色鐵籠: 從前面低角度慢慢繞
  (u) => {
    const a = lerp(2.05, 2.45, u);
    look(-6.2 + Math.cos(a) * 4.3, lerp(0.8, 0.95, u), -9.5 + Math.sin(a) * 4.3, -6.0, 1.05, -9.5, 36);
    focusOn(-6.4, 1.0, -9.5, 8);
  },
  // 3. 廣場上斜看廠房: 一整排柱子上的燈亮了, 黃色柱腳, 裡面的木箱
  (u) => {
    look(lerp(9.5, 8.6, u), lerp(1.7, 1.6, u), lerp(-4, -7, u), -8, 3.0, -30, 40);
    focusOn(-1, 1.5, -18, 2.5);
  },
  // 4. 照片那個角度: 左邊廠房、右邊辦公大樓, 夕陽落在廣場盡頭的山後面, 山脊上的南洋杉是剪影
  (u) => {
    look(lerp(5.2, 4.8, u), lerp(1.3, 1.4, u), lerp(0.5, -2.0, u), 4, 9, -60, 56);
    focusOn(4, 2, -40, 1.5);
  },
  // 5. 門口: 磁磚門柱上的圓球燈亮著, KENMEC 招牌、棕櫚樹 (逆光)
  (u) => {
    look(lerp(27, 24.5, u), lerp(1.4, 1.55, u), lerp(27, 25.6, u), 9, 4.6, 4, 42);
    focusOn(14.4, 1.2, 10, 2.5);
  },
];
const STARTS = DURS.map((_, i) => DURS.slice(0, i).reduce((a, b) => a + b, 0));

/** 擺好場景: 鏡頭 i 的第 t 秒, 整支影片的時間 time (微塵、充電燈用) */
function stage(i: number, t: number, time: number) {
  SHOTS[i](t / DURS[i], t);
  moveDust(time);
  // 充電燈慢慢呼吸 (整支影片 6 次)
  const breath = 0.35 + 0.65 * (0.5 - 0.5 * Math.cos(loopW(6) * time));
  chargeGlow.opacity = breath;
  MAT.green.emissiveIntensity = 2.5 * (0.4 + 0.6 * breath);
}

// ---------- 後製: 子影格平均 (動態模糊 / 淡入淡出) → 景深 → 光芒 → 光暈 → 調色 ----------
const MB = +(q.get("mb") || 3);
const FPS = 30;
const SHUTTER = 0.5;
const subRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const accRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: false });
const quadVS = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const accQuad = new FullScreenQuad(new THREE.ShaderMaterial({
  uniforms: { tSrc: { value: null }, w: { value: 1 } }, vertexShader: quadVS,
  fragmentShader: "uniform sampler2D tSrc; uniform float w; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tSrc, vUv).rgb * w, w); }",
  blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, depthTest: false, depthWrite: false,
}));
const depthRT = new THREE.WebGLRenderTarget(W, H);
depthRT.depthTexture = new THREE.DepthTexture(W, H, THREE.FloatType);
const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false });
/** 深度 (景深、光芒用): 天空不寫, 沒東西的地方就是天空 */
const renderDepth = () => {
  const hide = [dust, sky].filter((o) => o.visible);
  hide.forEach((o) => (o.visible = false));
  scene.overrideMaterial = depthOnly; renderer.shadowMap.autoUpdate = false;
  renderer.setRenderTarget(depthRT); renderer.clear(); renderer.render(scene, camera);
  renderer.shadowMap.autoUpdate = true; scene.overrideMaterial = null;
  hide.forEach((o) => (o.visible = true));
};
const dof = new ShaderPass({
  uniforms: {
    tColor: { value: null }, tDepth: { value: null }, cameraNear: { value: camera.near }, cameraFar: { value: camera.far },
    focus: { value: 5 }, blur: { value: 0 }, maxR: { value: 14 * (W / 1600) }, res: { value: new THREE.Vector2(W, H) },
  },
  vertexShader: quadVS,
  fragmentShader: `#include <packing>
    uniform sampler2D tColor; uniform sampler2D tDepth; uniform float cameraNear, cameraFar, focus, blur, maxR; uniform vec2 res; varying vec2 vUv;
    float viewZ(vec2 uv) { float d = texture2D(tDepth, uv).x; return d >= 1.0 ? 1000.0 : -perspectiveDepthToViewZ(d, cameraNear, cameraFar); }
    float coc(float z) { return clamp(blur * abs(z - focus) / max(z, 0.01), 0.0, maxR); }
    void main() {
      vec3 c0 = texture2D(tColor, vUv).rgb;
      if (blur <= 0.0) { gl_FragColor = vec4(c0, 1.0); return; }
      float zc = viewZ(vUv), cc = coc(zc); vec3 acc = c0; float ws = 1.0;
      for (int i = 0; i < 48; i++) {
        float r = sqrt((float(i) + 0.5) / 48.0) * maxR; float a = float(i) * 2.39996323;
        vec2 uv = vUv + vec2(cos(a), sin(a)) * r / res; float zs = viewZ(uv), cs = coc(zs);
        float c = zs > zc ? min(cs, cc) : cs; float w = smoothstep(r - 1.5, r + 0.5, c);
        acc += texture2D(tColor, uv).rgb * w; ws += w;
      }
      gl_FragColor = vec4(acc / ws, 1.0);
    }`,
}, "tUnused");
dof.uniforms.tColor.value = accRT.texture; dof.uniforms.tDepth.value = depthRT.depthTexture;
// 光芒 (god rays): 只取看得到天空的像素, 往太陽在畫面上的位置徑向拉長; 從門洞、車身縫隙透過來的光就會一條一條的
const rays = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, sunUV: { value: new THREE.Vector2() }, strength: { value: 0 } },
  vertexShader: quadVS,
  fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D tDepth; uniform vec2 sunUV; uniform float strength; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      if (strength <= 0.0) { gl_FragColor = vec4(c, 1.0); return; }
      vec2 d = (sunUV - vUv) / 64.0; vec2 uv = vUv; float decay = 1.0; vec3 sum = vec3(0.0);
      for (int i = 0; i < 64; i++) {
        uv += d;
        vec2 cu = clamp(uv, 0.0, 1.0);
        float skyMask = step(0.99999, texture2D(tDepth, cu).x);
        vec3 s = texture2D(tDiffuse, cu).rgb;
        sum += max(s - 1.0, 0.0) * skyMask * decay; decay *= 0.96;
      }
      gl_FragColor = vec4(c + sum / 64.0 * strength * vec3(1.0, 0.75, 0.5), 1.0);
    }`,
});
rays.uniforms.tDepth.value = depthRT.depthTexture;
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType }));
composer.addPass(dof);
composer.addPass(rays);
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.4, 0.6, 1.4));
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 } },
  vertexShader: quadVS,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + time) * 43758.5453); }
    void main(){ vec2 d = vUv - 0.5;
      vec4 c = texture2D(tDiffuse, vUv);
      float v = smoothstep(0.95, 0.3, length(d * vec2(1.0, 0.9)));
      c.rgb *= mix(0.55, 1.0, v);
      // 暖色、暗部微微提亮偏紫 (柔和、不要高反差)
      c.rgb = mix(c.rgb, c.rgb * vec3(1.06, 0.98, 0.9), 0.6);
      c.rgb = c.rgb * 0.94 + vec3(0.018, 0.012, 0.03);
      c.rgb += (h(vUv * 900.0) - 0.5) * 0.01;
      gl_FragColor = vec4(c.rgb, 1.0); }`,
});
composer.addPass(grade);
composer.addPass(new OutputPass());

const sunWorld = new THREE.Vector3();
/** 鏡頭 i 的第 t 秒, 一個子影格 (加權 w) 加進累加結果 */
function addSub(i: number, t: number, time: number, w: number) {
  stage(i, t, time);
  renderer.setClearColor(BG, 1);
  renderer.setRenderTarget(subRT); renderer.clear(); renderer.render(scene, camera);
  const m = accQuad.material as THREE.ShaderMaterial;
  m.uniforms.tSrc.value = subRT.texture; m.uniforms.w.value = w;
  renderer.autoClear = false; renderer.setRenderTarget(accRT); accQuad.render(renderer); renderer.autoClear = true;
}
const locate = (time: number) => {
  const t = ((time % TOTAL) + TOTAL) % TOTAL;
  let i = 0; while (i < DURS.length - 1 && t >= STARTS[i] + DURS[i]) i++;
  return { i, t: t - STARTS[i], time: t };
};
/** 算一格: 子影格做動態模糊; 每個鏡頭的開頭 XF 秒跟上一個鏡頭的尾巴 (延長出去的) 交叉淡化 */
export function frame(time: number, mb = MB) {
  const { i, t, time: tt } = locate(time);
  const prev = (i + DURS.length - 1) % DURS.length;
  const k = t < XF ? ease(t / XF) : 1;
  renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 0); renderer.clear();
  for (let s = 0; s < mb; s++) {
    const dt = mb > 1 ? ((s + 0.5) / mb - 0.5) * (SHUTTER / FPS) : 0;
    if (k > 0) addSub(i, t + dt, tt + dt, k / mb);
    if (k < 1) addSub(prev, DURS[prev] + t + dt, tt + dt, (1 - k) / mb);
  }
  // 景深、光芒用主要的那個鏡頭; 交叉淡化中間景深減弱 (兩個鏡頭的深度不一樣)
  const main = k >= 0.5 ? i : prev;
  stage(main, main === i ? t : DURS[prev] + t, tt);
  renderDepth();
  dof.uniforms.focus.value = shotState.focus;
  dof.uniforms.blur.value = shotState.blur * (W / 1600) * Math.abs(k - 0.5) * 2;
  sunWorld.copy(camera.position).addScaledVector(SUN, 100).project(camera);
  const facing = camera.getWorldDirection(new THREE.Vector3()).dot(SUN);
  rays.uniforms.sunUV.value.set(sunWorld.x * 0.5 + 0.5, sunWorld.y * 0.5 + 0.5);
  rays.uniforms.strength.value = Math.max(0, (facing - 0.3) / 0.7) * 0.9;
  grade.uniforms.time.value = tt;
  composer.render();
}

const b64 = (u8: Uint8Array) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
const api: any = ((window as any).HERO = { TOTAL, S });
api.ready = () => ready.then(() => JSON.stringify({ total: TOTAL }));
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
api.chunk = (i: number, size = 1 << 20) => b64(api.out.subarray(i * size, (i + 1) * size));
