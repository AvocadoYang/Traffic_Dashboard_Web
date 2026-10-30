import { FC, useMemo } from "react";
import { useAtomValue } from "jotai";
import { Html, Line, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { themeAtom } from "@/theme";
import Scene3D, { ModelBoundary } from "./Scene3D";
import Vehicle3D from "./Vehicle3D";
import { VehicleFrame } from "./frame";
import { VehicleModel } from "./vehicleModels";

/**
 * 設定頁的車型 3D 模型預覽: 跟首頁同一個元件畫車, 地上用虛線框出車型設定的長寬,
 * 箭頭指車頭 (+x)。模型的方向、大小對不對一眼看得出來。
 */

const ARROW_COLOR = "#fa541c";

const stand = (_id: string, out: VehicleFrame) => {
  out.x = 0;
  out.y = 0;
  out.yaw = 0;
  out.lift = 0;
  out.loaded = false;
  out.ring = "#1677ff";
  out.dim = false;
  out.alert = 0;
  return true;
};

/** 模型轉好、縮放好之後多長多寬 (公尺): 箭頭從車頭外面開始畫, 鏡頭也要看得到整台 */
const useModelSize = (model: VehicleModel) => {
  const { scene } = useGLTF(model.url, false, true);
  return useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const turned = model.yaw === 90 || model.yaw === 270;
    const length = turned ? size.z : size.x;
    const width = turned ? size.x : size.z;
    const scale = model.fitLength && length > 0 ? model.fitLength / length : 1;
    return { length: length * scale, width: width * scale };
  }, [scene, model.yaw, model.fitLength]);
};

const ModelPreview: FC<{ model: VehicleModel; length: number; width: number; frontLabel: string }> = ({
  model,
  length,
  width,
  frontLabel,
}) => {
  const theme = useAtomValue(themeAtom);
  const size = useModelSize(model);
  const l = length > 0 ? length : 1;
  const w = width > 0 ? width : 1;
  const reach = Math.max(l, size.length) / 2;
  const half = Math.max(reach + 0.9, w / 2, size.width / 2);
  const bounds = useMemo(() => ({ minX: -half, minY: -half, maxX: half, maxY: half }), [half]);
  const outline = useMemo<[number, number, number][]>(
    () => [
      [-l / 2, 0.01, -w / 2],
      [l / 2, 0.01, -w / 2],
      [l / 2, 0.01, w / 2],
      [-l / 2, 0.01, w / 2],
      [-l / 2, 0.01, -w / 2],
    ],
    [l, w],
  );
  const tip = reach + 0.6;
  return (
    <Scene3D
      bounds={bounds}
      fitMargin={0.3}
      background={theme.colors.bgMuted}
      gridColor={theme.colors.border}
      dark={theme.mode === "dark"}
      follow={null}
    >
      <ModelBoundary key={`${model.url}:${model.yaw}`}>
        <Vehicle3D id="preview" model={model} anchor="center" source={stand} />
      </ModelBoundary>
      <Line points={outline} color={theme.colors.textSecondary} lineWidth={1.5} dashed dashSize={0.12} gapSize={0.08} />
      <Line
        points={[
          [reach + 0.1, 0.02, 0],
          [tip - 0.15, 0.02, 0],
        ]}
        color={ARROW_COLOR}
        lineWidth={3}
      />
      <mesh position={[tip - 0.1, 0.02, 0]} rotation-z={-Math.PI / 2}>
        <coneGeometry args={[0.1, 0.22, 16]} />
        <meshBasicMaterial color={ARROW_COLOR} />
      </mesh>
      <Html position={[tip + 0.15, 0.05, 0]} center style={{ pointerEvents: "none" }}>
        <div style={{ color: ARROW_COLOR, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{frontLabel}</div>
      </Html>
    </Scene3D>
  );
};

export default ModelPreview;
