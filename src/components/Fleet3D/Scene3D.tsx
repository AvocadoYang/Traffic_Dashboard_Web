import { FC, MutableRefObject, ReactNode, Suspense, useCallback, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ErrorBoundary } from "react-error-boundary";
import { Grid, MapControls } from "@react-three/drei";
import * as THREE from "three";
import styled from "styled-components";

/**
 * 3D 檢視的共用外框: 畫布、光線、像地圖一樣的操作 (左鍵平移、右鍵旋轉、滾輪往游標縮放),
 * 一開始對準整個範圍, 可以跟著某台車。
 *
 * 座標: three.js 的 y 朝上是高度, 地面是 xz 平面。ROS 座標 (公尺) 換過來是
 * 世界 x = ROS x、世界 z = -ROS y, 從上往下看時方向跟 2D 地圖一樣;
 * 車頭角度 (ROS 逆時針為正) 直接當繞 y 軸的旋轉。
 *
 * 只在有東西變的時候才畫 (frameloop="demand"): 中控室的電腦整天開著, 沒車在動時不用一秒畫 60 次。
 * 會動的東西自己要求下一幀: 車還在走、牙叉還在升降就 invalidate, 新的即時資料進來時 (CameraApi.invalidate)、
 * 回放時間變了也是; 一直閃的告警用 useBlinkFrames, 一秒 15 幀就夠。
 */

/**
 * 要載模型的東西 (車、設備) 包這個: 載入中先不畫; 載入失敗 (網路斷、檔案不見) 只少畫這一個
 * (或改畫 fallback, 例如上傳的模型壞了改畫叉車), 不然錯誤會從畫布一路往外丟, 整個頁面都會白掉。
 * resetKeys 變了 (例如換了模型檔) 就再試一次
 */
export const ModelBoundary: FC<{ children: ReactNode; fallback?: ReactNode; resetKeys?: unknown[] }> = ({
  children,
  fallback = null,
  resetKeys,
}) => (
  <ErrorBoundary
    fallback={
      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>{fallback}</Suspense>
      </ErrorBoundary>
    }
    resetKeys={resetKeys}
    onError={(e) => console.error("3D 模型載入失敗:", e)}
  >
    <Suspense fallback={null}>{children}</Suspense>
  </ErrorBoundary>
);

/** ROS 座標的範圍 (公尺) */
export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

export type CameraApi = {
  /** 回到看得到整個範圍的視角 */
  reset: () => void;
  /** 拉近 (factor > 1) 或拉遠 */
  zoom: (factor: number) => void;
  /** 螢幕上的位置 -> 地面上的 ROS 座標 */
  groundAt: (clientX: number, clientY: number) => { x: number; y: number } | null;
  /** 地面上的 ROS 座標 -> 螢幕上的位置 */
  toClient: (x: number, y: number) => { x: number; y: number } | null;
  /**
   * 鏡頭順順地移到某個地方 (ROS 座標); distance: 離那裡多遠 (本來就比較近就不拉遠;
   * fit: 照這個距離, 要拉遠也拉遠, 例如框住整個區域)
   */
  flyTo: (x: number, y: number, distance?: number, fit?: boolean) => void;
  /** 資料變了, 要求畫下一幀 (畫布外面的人用) */
  invalidate: () => void;
};

/** 一直閃的東西 (告警、設備訊號) 每隔多久要求畫一次 (ms): 一秒 15 幀, 閃 1.5 次夠順了 */
const BLINK_FRAME_MS = 66;

/** 閃爍用: 回傳的函式在 useFrame 裡呼叫, 過一下再畫下一幀 (同一段時間只排一次) */
export const useBlinkFrames = () => {
  const invalidate = useThree((s) => s.invalidate);
  const pending = useRef(0);
  useEffect(() => () => window.clearTimeout(pending.current), []);
  return useCallback(() => {
    if (pending.current) return;
    pending.current = window.setTimeout(() => {
      pending.current = 0;
      invalidate();
    }, BLINK_FRAME_MS);
  }, [invalidate]);
};

/** flyTo 飛多久 (ms) */
const FLY_MS = 700;

const Wrap = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  /* 標籤 (drei Html) 的 z-index 關在這裡面, 不要蓋過地圖外的工具列、對話框 */
  isolation: isolate;
  touch-action: none;
`;

/** 從正南方往下看的角度 (0 = 水平, 90 = 正上方) */
const VIEW_ELEVATION = (55 * Math.PI) / 180;
const FOV = 45;

const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

/** drei MapControls (three-stdlib) 用到的部分 */
type Controls = {
  target: THREE.Vector3;
  mouseButtons: { LEFT?: THREE.MOUSE; MIDDLE?: THREE.MOUSE; RIGHT?: THREE.MOUSE };
  minDistance: number;
  maxDistance: number;
  update: () => void;
};

const CameraRig: FC<{
  bounds: Bounds | null;
  fitMargin: number;
  follow: (() => { x: number; y: number } | null) | null;
  apiRef?: MutableRefObject<CameraApi | null>;
}> = ({ bounds, fitMargin, follow, apiRef }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as unknown as Controls | null;
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);

  const reset = useCallback(() => {
    if (!bounds || !controls) return;
    // 留一點邊 (車會開到點位外面一點); 斜著看時靠近鏡頭那一邊比較寬, 距離再拉遠一些才不會切到兩側
    const w = Math.max(bounds.maxX - bounds.minX, 1) + fitMargin;
    const h = Math.max(bounds.maxY - bounds.minY, 1) + fitMargin;
    const aspect = size.width / Math.max(size.height, 1);
    const span = Math.max(h, w / aspect);
    const distance = (span / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)))) * 1.3;
    const target = new THREE.Vector3((bounds.minX + bounds.maxX) / 2, 0, -(bounds.minY + bounds.maxY) / 2);
    controls.target.copy(target);
    camera.position.set(target.x, distance * Math.sin(VIEW_ELEVATION), target.z + distance * Math.cos(VIEW_ELEVATION));
    controls.maxDistance = Math.max(distance * 4, 50);
    controls.update();
  }, [bounds, fitMargin, controls, camera, size.width, size.height]);

  // 範圍第一次拿到 (或換地圖) 時對準
  const fittedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!bounds || !controls || !size.width) return;
    const key = `${bounds.minX},${bounds.minY},${bounds.maxX},${bounds.maxY}`;
    if (fittedFor.current === key) return;
    fittedFor.current = key;
    reset();
  }, [bounds, controls, size.width, reset]);

  // 跟車時左鍵改成繞著車轉 (平移會被拉回車上)
  useEffect(() => {
    if (!controls) return;
    controls.mouseButtons.LEFT = follow ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN;
    controls.mouseButtons.RIGHT = follow ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
  }, [controls, follow]);

  const flight = useRef<{ from: THREE.Vector3; to: THREE.Vector3; d0: number; d1: number; dir: THREE.Vector3; start: number } | null>(null);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    if (!apiRef) return;
    const raycaster = new THREE.Raycaster();
    apiRef.current = {
      reset,
      zoom: (factor) => {
        if (!controls) return;
        const offset = camera.position.clone().sub(controls.target).divideScalar(factor);
        const length = THREE.MathUtils.clamp(offset.length(), controls.minDistance, controls.maxDistance);
        camera.position.copy(controls.target).add(offset.setLength(length));
        controls.update();
      },
      groundAt: (clientX, clientY) => {
        const rect = gl.domElement.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        const hit = raycaster.ray.intersectPlane(groundPlane, new THREE.Vector3());
        return hit ? { x: hit.x, y: -hit.z } : null;
      },
      toClient: (x, y) => {
        const rect = gl.domElement.getBoundingClientRect();
        const p = new THREE.Vector3(x, 0, -y).project(camera);
        if (p.z > 1) return null;
        return { x: rect.left + ((p.x + 1) / 2) * rect.width, y: rect.top + ((1 - p.y) / 2) * rect.height };
      },
      flyTo: (x, y, distance, fit) => {
        if (!controls) return;
        const offset = camera.position.clone().sub(controls.target);
        const d0 = offset.length();
        flight.current = {
          from: controls.target.clone(),
          to: new THREE.Vector3(x, 0, -y),
          d0,
          d1: distance ? (fit ? THREE.MathUtils.clamp(distance, controls.minDistance, controls.maxDistance) : Math.min(d0, distance)) : d0,
          dir: offset.normalize(),
          start: performance.now(),
        };
        invalidate();
      },
      invalidate,
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, reset, controls, camera, gl, invalidate]);

  const followed = useRef(new THREE.Vector3());
  useFrame((_, dt) => {
    if (!controls) return;
    const f = flight.current;
    if (f) {
      // 慢慢停下來 (ease-out); 距離用倍率內插, 拉近拉遠看起來速度一樣
      const p = Math.min(1, (performance.now() - f.start) / FLY_MS);
      const e = 1 - Math.pow(1 - p, 3);
      controls.target.lerpVectors(f.from, f.to, e);
      camera.position.copy(controls.target).addScaledVector(f.dir, f.d0 * Math.pow(f.d1 / f.d0, e));
      controls.update();
      if (p < 1) invalidate();
      else flight.current = null;
    }
    const p = follow?.();
    if (p) {
      followed.current.set(p.x, 0, -p.y);
      const delta = followed.current.sub(controls.target).multiplyScalar(1 - Math.exp(-Math.min(dt, 0.1) * 8));
      controls.target.add(delta);
      camera.position.add(delta);
      // 還沒追上就繼續畫
      if (delta.lengthSq() > 1e-8) invalidate();
    }
    // 近平面跟著距離調: 拉很遠時地面上的路線、點位才不會跟底圖搶深度而閃爍
    const distance = camera.position.distanceTo(controls.target);
    const near = THREE.MathUtils.clamp(distance * 0.01, 0.05, 5);
    if (Math.abs(near - camera.near) / camera.near > 0.05) {
      camera.near = near;
      camera.far = Math.max(2000, distance * 20);
      camera.updateProjectionMatrix();
    }
  });

  return null;
};

type Props = {
  bounds: Bounds | null;
  /** 對準範圍時四周留多少 (公尺): 地圖留 4 公尺 (車會開到點位外面一點), 設定頁的模型預覽留一點點 */
  fitMargin?: number;
  /** 背景色 (畫布外、底圖外的地方) */
  background: string;
  /** 地面格線的顏色 */
  gridColor: string;
  dark: boolean;
  follow?: (() => { x: number; y: number } | null) | null;
  apiRef?: MutableRefObject<CameraApi | null>;
  /** 點了空白處 (沒拖曳) */
  onPointerMissed?: () => void;
  children: ReactNode;
};

const Scene3D: FC<Props> = ({ bounds, fitMargin = 4, background, gridColor, dark, follow = null, apiRef, onPointerMissed, children }) => (
  <Wrap onContextMenu={(e) => e.preventDefault()}>
    <Canvas
      frameloop="demand"
      dpr={[1, 1.75]}
      camera={{ fov: FOV, near: 0.1, far: 2000, position: [0, 40, 40] }}
      gl={{ antialias: true }}
      onPointerMissed={onPointerMissed}
    >
      <color attach="background" args={[background]} />
      <hemisphereLight args={["#ffffff", dark ? "#3a4048" : "#b9c2cc", dark ? 0.9 : 1.2]} />
      <directionalLight position={[30, 60, 20]} intensity={dark ? 1.4 : 1.7} />
      <directionalLight position={[-40, 30, -30]} intensity={0.35} />
      <MapControls
        makeDefault
        enableDamping
        dampingFactor={0.12}
        zoomToCursor
        minDistance={1.5}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
      <CameraRig bounds={bounds} fitMargin={fitMargin} follow={follow} apiRef={apiRef} />
      <Grid
        position={[0, -0.02, 0]}
        infiniteGrid
        cellSize={1}
        sectionSize={10}
        cellThickness={0.6}
        sectionThickness={1}
        cellColor={gridColor}
        sectionColor={gridColor}
        fadeDistance={bounds ? Math.max(200, (bounds.maxX - bounds.minX + bounds.maxY - bounds.minY) * 1.5) : 400}
        fadeStrength={1.5}
      />
      <Suspense fallback={null}>{children}</Suspense>
    </Canvas>
  </Wrap>
);

export default Scene3D;
