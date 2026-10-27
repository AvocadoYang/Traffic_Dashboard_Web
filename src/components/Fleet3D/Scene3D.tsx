import { FC, MutableRefObject, ReactNode, Suspense, useCallback, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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
 */

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
};

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
  follow: (() => { x: number; y: number } | null) | null;
  apiRef?: MutableRefObject<CameraApi | null>;
}> = ({ bounds, follow, apiRef }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as unknown as Controls | null;
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);

  const reset = useCallback(() => {
    if (!bounds || !controls) return;
    // 留一點邊 (車會開到點位外面一點); 斜著看時靠近鏡頭那一邊比較寬, 距離再拉遠一些才不會切到兩側
    const w = Math.max(bounds.maxX - bounds.minX, 1) + 4;
    const h = Math.max(bounds.maxY - bounds.minY, 1) + 4;
    const aspect = size.width / Math.max(size.height, 1);
    const span = Math.max(h, w / aspect);
    const distance = (span / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)))) * 1.3;
    const target = new THREE.Vector3((bounds.minX + bounds.maxX) / 2, 0, -(bounds.minY + bounds.maxY) / 2);
    controls.target.copy(target);
    camera.position.set(target.x, distance * Math.sin(VIEW_ELEVATION), target.z + distance * Math.cos(VIEW_ELEVATION));
    controls.maxDistance = Math.max(distance * 4, 50);
    controls.update();
  }, [bounds, controls, camera, size.width, size.height]);

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
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, reset, controls, camera, gl]);

  const followed = useRef(new THREE.Vector3());
  useFrame((_, dt) => {
    if (!controls) return;
    const p = follow?.();
    if (p) {
      followed.current.set(p.x, 0, -p.y);
      const delta = followed.current.sub(controls.target).multiplyScalar(1 - Math.exp(-dt * 8));
      controls.target.add(delta);
      camera.position.add(delta);
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

const Scene3D: FC<Props> = ({ bounds, background, gridColor, dark, follow = null, apiRef, onPointerMissed, children }) => (
  <Wrap onContextMenu={(e) => e.preventDefault()}>
    <Canvas
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
      <CameraRig bounds={bounds} follow={follow} apiRef={apiRef} />
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
