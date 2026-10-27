import { FC, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, useCursor, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ForkliftRig, rigForklift } from "./forkliftRig";
import { VehicleSource, emptyFrame } from "./frame";
import { CARTON_SIZE, PALLET_HEIGHT, PALLET_OFFSET } from "./dimensions";
import { FORKLIFT_URL, cartonMaterial, hitMaterial, palletMaterial, unitBox, usePalletGeometry } from "./models";

/**
 * 3D 場景裡的一台車: 叉車模型 (MiR 這類沒有牙叉的車畫成一個盒子)、貨、地上的影子和色圈、名稱標籤。
 *
 * 位置不經過 React: 每一幀向 source 問一次這台車現在的樣子 (即時資料、模擬回放各自實作),
 * 直接改 three.js 物件。
 */

const AMR_HEIGHT = 0.32;
/** 點選範圍至少這麼大 (公尺): MiR 這類小車在全景只有十幾個像素, 太難點 */
const MIN_HIT = 1.2;

let blobTexture: THREE.Texture | null = null;
/** 車底下的柔和影子 (不用即時陰影: 地圖可能上百公尺, 陰影貼圖蓋不住) */
const getBlobTexture = () => {
  if (blobTexture) return blobTexture;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(0,0,0,0.45)");
  g.addColorStop(0.55, "rgba(0,0,0,0.25)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  blobTexture = new THREE.CanvasTexture(canvas);
  return blobTexture;
};

/** 車身: 模型、會動的牙叉、這台車自己的材質 (淡化時改透明度, 不影響別台), 範圍 (模型座標) */
type Body = {
  object: THREE.Object3D;
  rig: ForkliftRig | null;
  materials: THREE.Material[];
  box: THREE.Box3;
  /** 貨放在哪 (模型座標) 和紙箱多大; 叉車的貨是棧板 + 紙箱, 會跟著牙叉升降; 盒子車是車頂上一箱 */
  cargo: { x: number; y: number; size: [number, number, number]; pallet: boolean };
};

type Props = {
  id: string;
  source: VehicleSource;
  /** 把模型等比例縮放成這個長度 (公尺): 模擬的車種長度跟模型不一樣時 */
  fitLength?: number;
  /**
   * 車的位置在模型的哪裡: 即時資料是叉臂根部 (同 2D 地圖), 模擬的車位置是車身中心
   */
  anchor?: "root" | "center";
  label?: ReactNode;
  selected?: boolean;
  onSelect?: (id: string) => void;
};

const VehicleShell: FC<Props & { body: Body }> = ({ id, source, body, fitLength, anchor = "root", label, selected = false, onSelect }) => {
  const groupRef = useRef<THREE.Group>(null);
  const cargoRef = useRef<THREE.Group>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const palletGeometry = usePalletGeometry();
  const ringMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: "#888888", transparent: true, opacity: 0.75, depthWrite: false }), []);
  const frame = useMemo(emptyFrame, []);
  const applied = useRef({ lift: Number.NaN, dim: false, ring: "" });
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  useEffect(() => () => ringMaterial.dispose(), [ringMaterial]);

  const { box, cargo } = body;
  const length = box.max.x - box.min.x;
  const halfW = Math.max(-box.min.z, box.max.z);
  const height = box.max.y;
  const offsetX = anchor === "center" ? -(box.min.x + box.max.x) / 2 : 0;
  const centerX = (box.min.x + box.max.x) / 2 + offsetX;
  const footprint = Math.max(length, halfW * 2);
  const scale = fitLength ? fitLength / length : 1;
  // 標籤在車頂或車上的貨上面 (牙叉升起來時就不管了)
  const labelY = Math.max(height, cargo.y + (cargo.pallet ? PALLET_HEIGHT : 0) + cargo.size[1]) * scale + 0.35;

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const shown = source(id, frame);
    // drei 的 Html 不看 3D 物件的 visible, 車不畫時標籤要自己藏
    const label = labelRef.current;
    const visibility = shown ? "visible" : "hidden";
    if (label && label.style.visibility !== visibility) label.style.visibility = visibility;
    group.visible = shown;
    if (!shown) return;
    group.position.set(frame.x, 0, -frame.y);
    group.rotation.y = frame.yaw;

    const done = applied.current;
    const lift = body.rig ? frame.lift : 0;
    if (!(Math.abs(lift - done.lift) < 0.0005)) {
      body.rig?.setLift(lift);
      done.lift = lift;
    }
    if (cargoRef.current) {
      cargoRef.current.visible = frame.loaded;
      cargoRef.current.position.y = lift;
    }
    if (frame.ring !== done.ring) {
      ringMaterial.color.set(frame.ring);
      done.ring = frame.ring;
    }
    if (frame.dim !== done.dim) {
      for (const m of body.materials) {
        m.transparent = frame.dim;
        m.opacity = frame.dim ? 0.15 : 1;
        m.depthWrite = !frame.dim;
        m.needsUpdate = true;
      }
      ringMaterial.opacity = frame.dim ? 0.2 : 0.75;
      done.dim = frame.dim;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <group scale={scale}>
        <group position-x={offsetX}>
          <primitive object={body.object} />
          <group ref={cargoRef} visible={false}>
            <group position={[cargo.x, cargo.y, 0]}>
              {cargo.pallet && <mesh geometry={palletGeometry} material={palletMaterial} />}
              <mesh
                geometry={unitBox}
                material={cartonMaterial}
                scale={cargo.size}
                position-y={(cargo.pallet ? PALLET_HEIGHT : 0) + cargo.size[1] / 2}
              />
            </group>
          </group>
        </group>
        {/* 影子、色圈畫在車身範圍的中心 */}
        <mesh position={[centerX, 0.004, 0]} rotation-x={-Math.PI / 2} renderOrder={1}>
          <planeGeometry args={[length * 1.15, halfW * 2.4]} />
          <meshBasicMaterial map={getBlobTexture()} transparent depthWrite={false} />
        </mesh>
        <mesh position={[centerX, 0.006, 0]} rotation-x={-Math.PI / 2} material={ringMaterial} renderOrder={2}>
          <ringGeometry args={[footprint * 0.56, footprint * (selected ? 0.66 : 0.6), 64]} />
        </mesh>
        <mesh
          position={[centerX, Math.max(height, MIN_HIT) / 2, 0]}
          material={hitMaterial}
          userData={{ pick: "vehicle" }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(id);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
        >
          <boxGeometry args={[Math.max(length, MIN_HIT), Math.max(height, MIN_HIT), Math.max(halfW * 2, MIN_HIT)]} />
        </mesh>
      </group>
      {label && (
        <Html
          ref={labelRef}
          // 第一幀還不知道車在哪, 先藏著 (之後每一幀照車有沒有畫)。
          // 標籤不能擋到底下的車: drei 的 pointerEvents 屬性只在 transform 模式有用, 直接寫在 style
          style={{ visibility: "hidden", pointerEvents: "none" }}
          position={[centerX * scale, labelY, 0]}
          center
          zIndexRange={[20, 0]}
        >
          {label}
        </Html>
      )}
    </group>
  );
};

/** 每台車複製一份模型: 幾何共用, 材質各自一份 */
const ForkliftVehicle: FC<Props> = (props) => {
  const forklift = useGLTF(FORKLIFT_URL, false, true).scene;
  const body = useMemo<Body>(() => {
    const object = forklift.clone(true);
    const own = new Map<THREE.Material, THREE.Material>();
    object.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || Array.isArray(mesh.material)) return;
      let m = own.get(mesh.material);
      if (!m) {
        m = mesh.material.clone();
        own.set(mesh.material, m);
      }
      mesh.material = m;
    });
    return {
      object,
      rig: rigForklift(object),
      materials: [...own.values()],
      box: new THREE.Box3().setFromObject(forklift),
      cargo: { x: -PALLET_OFFSET, y: 0, size: CARTON_SIZE, pallet: true },
    };
  }, [forklift]);
  useEffect(() => () => body.materials.forEach((m) => m.dispose()), [body]);
  return <VehicleShell {...props} body={body} />;
};

/** 沒有牙叉的車 (MiR 之類): 盒子, 中心在車的位置 */
const BoxVehicle: FC<Props & { length: number; width: number }> = ({ length, width, ...props }) => {
  const body = useMemo<Body>(() => {
    // 車身、底下一圈深色防撞條、淺色頂板, 車頭 (+x) 一條白燈看得出方向; 不照哪一家的車型
    const parts: [THREE.BufferGeometry, string, number][] = [
      [new RoundedBoxGeometry(length, 0.24, width, 2, Math.min(0.06, width / 6)), "#5b6b7c", 0.14],
      [new THREE.BoxGeometry(length + 0.02, 0.06, width + 0.02), "#2b2f36", 0.07],
      [new THREE.BoxGeometry(length * 0.92, 0.04, width * 0.92), "#c8ced6", AMR_HEIGHT - 0.03],
      [new THREE.BoxGeometry(0.02, 0.04, width * 0.6), "#ffffff", 0.18],
    ];
    const object = new THREE.Group();
    const materials: THREE.Material[] = [];
    parts.forEach(([geometry, color, y], i) => {
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(i === 3 ? length / 2 + 0.005 : 0, y, 0);
      object.add(mesh);
      materials.push(material);
    });
    return {
      object,
      rig: null,
      materials,
      box: new THREE.Box3(new THREE.Vector3(-length / 2, 0, -width / 2), new THREE.Vector3(length / 2, AMR_HEIGHT, width / 2)),
      cargo: { x: 0, y: AMR_HEIGHT, size: [Math.min(0.9, length * 0.8), 0.4, Math.min(0.9, width * 0.8)], pallet: false },
    };
  }, [length, width]);
  useEffect(
    () => () => {
      body.object.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      body.materials.forEach((m) => m.dispose());
    },
    [body],
  );
  return <VehicleShell {...props} body={body} />;
};

type VehicleProps = Props & ({ kind: "forklift" } | { kind: "box"; length: number; width: number });

const Vehicle3D: FC<VehicleProps> = (props) =>
  props.kind === "forklift" ? <ForkliftVehicle {...props} /> : <BoxVehicle {...props} />;

export default Vehicle3D;
