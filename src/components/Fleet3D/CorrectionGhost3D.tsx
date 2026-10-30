import { FC, useEffect, useMemo, useRef } from "react";
import { ThreeEvent, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useAmrPointCloud } from "@/sockets/usePointCloud";
import { amrId2ColorRainbow, sanitizeDeg } from "@/utils/utils";
import { useCorrectionGhost } from "@/pages/Main/components/PadViwe/components/PadMapContent/component/LocalizationCorrection/useCorrectionGhost";
import LocalizationCorrectionPanel from "@/pages/Main/components/PadViwe/components/PadMapContent/component/LocalizationCorrection/LocalizationCorrectionPanel";

/**
 * 定位校正的幽靈車身, 3D 版 (同 2D 的 LocalizationCorrectionGhost): 半透明的車身加紅框,
 * 車的點雲照校正後的位置畫成紅點, 跟地圖上的牆對齊就對了。拖車身移動位置、拖車頭前面的白色把手轉方向;
 * 拖的時候先停掉鏡頭操作, 不然地圖會跟著動。重設 / 取消 / 確認在畫布外面的面板 (跟 2D 同一個)
 */

const LENGTH = 1.6;
const WIDTH = 0.9;
const HEIGHT = 0.35;
/** 旋轉把手在車頭前面多遠 */
const HANDLE_AT = LENGTH / 2 + 1.2;
const OUTLINE = "#f50c0c";
/** 幽靈車身疊在真的車上 (本來就在差不多的位置), 不做深度測試, 一律畫在最上面 */
const ON_TOP = 20;
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const bodyGeometry = new THREE.BoxGeometry(LENGTH, HEIGHT, WIDTH);
const outlineGeometry = new THREE.EdgesGeometry(bodyGeometry);

/** drei MapControls 用到的部分 */
type Controls = { enabled: boolean };
/** R3F 事件的 target 是它包過的, 抓住游標後拖出物件外面也收得到 */
type Capturable = { setPointerCapture: (id: number) => void };
type Drag = { mode: "move" | "turn"; start: THREE.Vector3; dx: number; dy: number };

const CorrectionGhost3D: FC = () => {
  const { correction, setCorrection, pose, ghost, visible } = useCorrectionGhost();
  const points = useAmrPointCloud(correction?.amrId ?? "");
  const controls = useThree((s) => s.controls) as unknown as Controls | null;
  const drag = useRef<Drag | null>(null);
  const latest = useRef({ correction, pose, ghost });
  latest.current = { correction, pose, ghost };

  // 點雲: 以車現在的位置為中心轉 dYaw 再平移 (同 2D)
  const cloud = useMemo(() => {
    if (!correction || !pose || !points.length) return null;
    const rad = (correction.dYaw * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const out = new Float32Array(Math.floor(points.length / 2) * 3);
    for (let i = 0, j = 0; i + 1 < points.length; i += 2, j += 3) {
      const rx = points[i] - pose.x;
      const ry = points[i + 1] - pose.y;
      out[j] = pose.x + correction.dx + rx * cos - ry * sin;
      out[j + 1] = 0.08;
      out[j + 2] = -(pose.y + correction.dy + rx * sin + ry * cos);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(out, 3));
    return geometry;
  }, [points, pose, correction]);
  useEffect(() => () => cloud?.dispose(), [cloud]);

  // 拖到一半就不見了 (按了取消、確認) 也要把鏡頭操作還回去
  useEffect(
    () => () => {
      drag.current = null;
      if (controls) controls.enabled = true;
      document.body.style.cursor = "";
    },
    [controls],
  );

  if (!visible || !ghost || !correction) return null;

  const ground = (e: ThreeEvent<PointerEvent>) => e.ray.intersectPlane(groundPlane, new THREE.Vector3());
  const begin = (mode: Drag["mode"]) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const g = ground(e);
    if (!g) return;
    (e.target as unknown as Capturable).setPointerCapture(e.pointerId);
    drag.current = { mode, start: g, dx: correction.dx, dy: correction.dy };
    if (controls) controls.enabled = false;
    window.addEventListener(
      "pointerup",
      () => {
        drag.current = null;
        if (controls) controls.enabled = true;
      },
      { once: true },
    );
  };
  const move = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    const { correction: c, pose: p, ghost: gh } = latest.current;
    if (!d || !c || !p || !gh) return;
    e.stopPropagation();
    const g = ground(e);
    if (!g) return;
    if (d.mode === "move") {
      // 世界 z = -ROS y
      setCorrection({ ...c, dx: d.dx + (g.x - d.start.x), dy: d.dy - (g.z - d.start.z) });
    } else {
      const target = (Math.atan2(-g.z - gh.y, g.x - gh.x) * 180) / Math.PI;
      setCorrection({ ...c, dYaw: sanitizeDeg(target - p.yaw) });
    }
  };
  const stop = (e: ThreeEvent<MouseEvent>) => e.stopPropagation();
  const hover = (on: boolean) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = on ? "grab" : "";
  };

  return (
    <group>
      {cloud && (
        <points geometry={cloud} renderOrder={ON_TOP}>
          <pointsMaterial color={OUTLINE} size={0.09} sizeAttenuation transparent opacity={0.85} depthTest={false} depthWrite={false} />
        </points>
      )}
      <group position={[ghost.x, 0, -ghost.y]} rotation-y={(ghost.yaw * Math.PI) / 180}>
        <mesh
          geometry={bodyGeometry}
          position-y={HEIGHT / 2}
          renderOrder={ON_TOP}
          onPointerDown={begin("move")}
          onPointerMove={move}
          onPointerOver={hover(true)}
          onPointerOut={hover(false)}
          onClick={stop}
        >
          <meshBasicMaterial color={amrId2ColorRainbow(correction.amrId)} transparent opacity={0.45} depthTest={false} depthWrite={false} />
        </mesh>
        <lineSegments geometry={outlineGeometry} position-y={HEIGHT / 2} renderOrder={ON_TOP}>
          <lineBasicMaterial color={OUTLINE} depthTest={false} />
        </lineSegments>
        {/* 車頭方向, 再前面是旋轉把手 */}
        <mesh position={[LENGTH / 2 + 0.2, 0.05, 0]} rotation-z={-Math.PI / 2} renderOrder={ON_TOP}>
          <coneGeometry args={[0.18, 0.35, 16]} />
          <meshBasicMaterial color={OUTLINE} depthTest={false} />
        </mesh>
        <mesh position={[(LENGTH / 2 + HANDLE_AT) / 2 + 0.1, 0.25, 0]} renderOrder={ON_TOP}>
          <boxGeometry args={[HANDLE_AT - LENGTH / 2 - 0.2, 0.03, 0.03]} />
          <meshBasicMaterial color="#ffffff" depthTest={false} />
        </mesh>
        <mesh
          position={[HANDLE_AT, 0.25, 0]}
          renderOrder={ON_TOP + 1}
          onPointerDown={begin("turn")}
          onPointerMove={move}
          onPointerOver={hover(true)}
          onPointerOut={hover(false)}
          onClick={stop}
        >
          <sphereGeometry args={[0.22, 20, 12]} />
          {/* 也設成透明的才會跟外圈一起排順序 (不透明的一律先畫, 會被外圈蓋掉) */}
          <meshBasicMaterial color="#ffffff" depthTest={false} transparent />
        </mesh>
        <mesh position={[HANDLE_AT, 0.25, 0]} renderOrder={ON_TOP}>
          <sphereGeometry args={[0.27, 20, 12]} />
          <meshBasicMaterial color="#722ed1" depthTest={false} transparent opacity={0.6} side={THREE.BackSide} />
        </mesh>
      </group>
    </group>
  );
};

/** 畫布外面的面板 (跟 2D 同一個), 幽靈車身看得到時才顯示 */
export const CorrectionPanel3D: FC = () => {
  const { correction, ghost, visible } = useCorrectionGhost();
  if (!visible || !ghost || !correction) return null;
  return <LocalizationCorrectionPanel amrId={correction.amrId} x={ghost.x} y={ghost.y} yaw={ghost.yaw} />;
};

export default CorrectionGhost3D;
