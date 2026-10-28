import { FC, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, useCursor, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { ForkliftRig, rigForklift } from "./forkliftRig";
import { ALERT_BODY, ALERT_BUMPER, ALERT_FORK, ALERT_SCAN_AROUND, ALERT_SCAN_FRONT, ALERT_SCAN_REAR } from "./alerts";
import { VehicleSource, emptyFrame } from "./frame";
import { CARTON_SIZE, PALLET_HEIGHT, PALLET_OFFSET } from "./dimensions";
import { FORKLIFT_URL, MIR_URL, cartonMaterial, hitMaterial, palletMaterial, unitBox, usePalletGeometry } from "./models";

/**
 * 3D 場景裡的一台車: 叉車或 MiR 的模型、貨、地上的影子和色圈、名稱標籤。
 *
 * 位置不經過 React: 每一幀向 source 問一次這台車現在的樣子 (即時資料、模擬回放各自實作),
 * 直接改 three.js 物件。
 */

/** 點選範圍至少這麼大 (公尺): MiR 這類小車在全景只有十幾個像素, 太難點 */
const MIN_HIT = 1.2;

/** 告警閃的顏色、一秒閃幾次; 光達告警在車頭前 / 車尾後畫多長 (公尺) */
const ALERT_COLOR = "#ff2d2d";
const ALERT_HZ = 1.5;
const SCAN_DEPTH = 1.2;
/** 防撞邊條那一圈: 離車身多遠、多高 (公尺) */
const BUMPER_GAP = 0.03;
const BUMPER_HEIGHT = 0.12;
const BUMPER_THICK = 0.04;

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
  /** 牙叉上蓋的一層紅色 (跟著牙叉升降), 告警時閃; 沒有牙叉的車是空的 */
  forkFlash: THREE.Object3D[];
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
  const applied = useRef({ lift: Number.NaN, dim: false, ring: "", alert: 0 });
  const alertMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: ALERT_COLOR,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -4,
      }),
    [],
  );
  const bumperRef = useRef<THREE.Group>(null);
  const bodyLit = useRef(false);
  const scanFrontRef = useRef<THREE.Mesh>(null);
  const scanRearRef = useRef<THREE.Mesh>(null);
  const scanAroundRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  useEffect(() => () => ringMaterial.dispose(), [ringMaterial]);
  useEffect(() => () => alertMaterial.dispose(), [alertMaterial]);
  useEffect(() => {
    for (const o of body.forkFlash) (o as THREE.Mesh).material = alertMaterial;
  }, [body, alertMaterial]);

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

  useFrame(({ clock }) => {
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

    // 告警: 對應的部位一閃一閃 (沒有牙叉的車, 牙叉的告警閃整台)
    let alert = frame.alert;
    if (alert & ALERT_FORK && !body.forkFlash.length) alert = (alert & ~ALERT_FORK) | ALERT_BODY;
    const pulse = alert ? 0.5 + 0.5 * Math.sin(clock.elapsedTime * ALERT_HZ * 2 * Math.PI) : 0;
    if (alert !== done.alert) {
      if (bumperRef.current) bumperRef.current.visible = !!(alert & ALERT_BUMPER);
      if (scanFrontRef.current) scanFrontRef.current.visible = !!(alert & ALERT_SCAN_FRONT);
      if (scanRearRef.current) scanRearRef.current.visible = !!(alert & ALERT_SCAN_REAR);
      if (scanAroundRef.current) scanAroundRef.current.visible = !!(alert & ALERT_SCAN_AROUND);
      for (const o of body.forkFlash) o.visible = !!(alert & ALERT_FORK);
      done.alert = alert;
    }
    if (alert) alertMaterial.opacity = 0.15 + 0.65 * pulse;
    if (alert & ALERT_BODY || bodyLit.current) {
      bodyLit.current = !!(alert & ALERT_BODY);
      for (const m of body.materials) {
        const e = (m as THREE.MeshStandardMaterial).emissive;
        if (e) e.setStyle(ALERT_COLOR).multiplyScalar(alert & ALERT_BODY ? 0.8 * pulse : 0);
      }
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
        {/* 告警: 防撞邊條是車底一圈; 光達是車頭前、車尾後、四周的地上 (平常藏著) */}
        <group ref={bumperRef} visible={false} position-x={offsetX}>
          {[
            [box.max.x + BUMPER_GAP, 0, BUMPER_THICK, halfW * 2 + BUMPER_GAP * 2],
            [box.min.x - BUMPER_GAP, 0, BUMPER_THICK, halfW * 2 + BUMPER_GAP * 2],
            [(box.min.x + box.max.x) / 2, halfW + BUMPER_GAP, length + BUMPER_GAP * 2, BUMPER_THICK],
            [(box.min.x + box.max.x) / 2, -halfW - BUMPER_GAP, length + BUMPER_GAP * 2, BUMPER_THICK],
          ].map(([x, z, sx, sz], i) => (
            <mesh
              key={i}
              geometry={unitBox}
              material={alertMaterial}
              position={[x, BUMPER_HEIGHT / 2 + 0.02, z]}
              scale={[sx, BUMPER_HEIGHT, sz]}
            />
          ))}
        </group>
        <mesh
          ref={scanFrontRef}
          visible={false}
          material={alertMaterial}
          position={[box.max.x + offsetX + SCAN_DEPTH / 2, 0.008, 0]}
          rotation-x={-Math.PI / 2}
          renderOrder={3}
        >
          <planeGeometry args={[SCAN_DEPTH, halfW * 2.4]} />
        </mesh>
        <mesh
          ref={scanRearRef}
          visible={false}
          material={alertMaterial}
          position={[box.min.x + offsetX - SCAN_DEPTH / 2, 0.008, 0]}
          rotation-x={-Math.PI / 2}
          renderOrder={3}
        >
          <planeGeometry args={[SCAN_DEPTH, halfW * 2.4]} />
        </mesh>
        <mesh
          ref={scanAroundRef}
          visible={false}
          material={alertMaterial}
          position={[centerX, 0.008, 0]}
          rotation-x={-Math.PI / 2}
          renderOrder={3}
        >
          <ringGeometry args={[footprint * 0.62, footprint * 0.62 + SCAN_DEPTH, 64]} />
        </mesh>
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

/** 每台車複製一份模型: 幾何共用, 材質各自一份 (淡化時改透明度, 不影響別台) */
const cloneWithOwnMaterials = (scene: THREE.Object3D) => {
  const object = scene.clone(true);
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
  return { object, materials: [...own.values()] };
};

/** 底下每個網格蓋一層一樣形狀的 (材質之後換成告警色), 跟著原本的網格動 */
const addFlashOverlays = (root: THREE.Object3D) => {
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  return meshes.map((m) => {
    const overlay = new THREE.Mesh(m.geometry);
    overlay.visible = false;
    overlay.renderOrder = 4;
    overlay.scale.setScalar(1.002);
    m.add(overlay);
    return overlay;
  });
};

const ForkliftVehicle: FC<Props> = (props) => {
  const forklift = useGLTF(FORKLIFT_URL, false, true).scene;
  const body = useMemo<Body>(() => {
    const { object, materials } = cloneWithOwnMaterials(forklift);
    const rig = rigForklift(object);
    return {
      object,
      rig,
      forkFlash: rig.forks.flatMap(addFlashOverlays),
      materials,
      box: new THREE.Box3().setFromObject(forklift),
      cargo: { x: -PALLET_OFFSET, y: 0, size: CARTON_SIZE, pallet: true },
    };
  }, [forklift]);
  useEffect(() => () => body.materials.forEach((m) => m.dispose()), [body]);
  return <VehicleShell {...props} body={body} />;
};

/** MiR: 模型 (public/models/mir250.glb, 由 scripts/vehicle-models/mir.mjs 產生) 原點在車身中心、車頭朝 +x; 貨放車頂 */
const MirVehicle: FC<Props> = (props) => {
  const mir = useGLTF(MIR_URL, false, true).scene;
  const body = useMemo<Body>(() => {
    const { object, materials } = cloneWithOwnMaterials(mir);
    const box = new THREE.Box3().setFromObject(mir);
    const length = box.max.x - box.min.x;
    const width = box.max.z - box.min.z;
    return {
      object,
      rig: null,
      forkFlash: [],
      materials,
      box,
      cargo: { x: (box.min.x + box.max.x) / 2, y: box.max.y, size: [Math.min(0.9, length * 0.8), 0.4, Math.min(0.9, width * 0.8)], pallet: false },
    };
  }, [mir]);
  useEffect(() => () => body.materials.forEach((m) => m.dispose()), [body]);
  return <VehicleShell {...props} body={body} />;
};

type VehicleProps = Props & { kind: "forklift" | "mir" };

const Vehicle3D: FC<VehicleProps> = ({ kind, ...props }) =>
  kind === "forklift" ? <ForkliftVehicle {...props} /> : <MirVehicle {...props} />;

export default Vehicle3D;
