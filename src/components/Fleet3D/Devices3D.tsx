import { FC, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ThreeEvent } from "@react-three/fiber";
import { Html, useCursor } from "@react-three/drei";
import { useSetAtom } from "jotai";
import * as THREE from "three";
import useCargoInfo from "@/sockets/useCargoInfo";
import useStackSocket from "@/sockets/useStackSocket";
import useConveyorSocket from "@/sockets/useConveyorSocket";
import useElevatorSocket from "@/sockets/useElevatorSocket";
import useChargeStationSocket from "@/sockets/useChargeStationSocket";
import { CargoPanelTarget } from "@/components/CargoPanel/state";
import { DevicePlacement } from "./devicePlacement";
import { Hit, chargerParts, conveyorParts, elevatorParts, merge, stackParts, storageParts } from "./deviceParts";
import { cartonMaterial, hitMaterial, palletMaterial, unitBox, usePalletGeometry } from "./models";
import { yieldsTo } from "./pick";

/**
 * 3D 地圖上的設備: 貨架 (各層照後端的層高, 有貨的層放棧板)、堆疊 (疊了幾板)、
 * 輸送帶 / 電梯 (平台在對接高度)、充電站。資料跟 2D 地圖的設備圖層是同一批 socket。
 *
 * 現場可能有上百個儲位, 一個零件一個物件會有幾千次繪製, 所以同一類零件 (框架、棧板、紙箱、燈)
 * 全部用 InstancedMesh 一次畫完 (零件擺在哪見 deviceParts), 資料變了才重算。
 * 點貨架 / 堆疊 / 輸送帶 / 電梯打開右邊的貨物面板 (同 2D)。
 */

/** 一組同樣的零件畫成一個 InstancedMesh */
const InstancedPart: FC<{
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  items: { matrix: THREE.Matrix4; color?: string }[];
  /** 點選用的: userData.pick */
  pick?: "device";
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerMove?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: () => void;
}> = ({ geometry, material, items, pick, onClick, onPointerMove, onPointerOut }) => {
  // 數量變了才重建 (instanceMatrix 的大小是建的時候決定的)
  const mesh = useMemo(() => new THREE.InstancedMesh(geometry, material, Math.max(1, items.length)), [geometry, material, items.length]);
  useEffect(
    () => () => {
      mesh.dispose();
    },
    [mesh],
  );
  useEffect(() => {
    mesh.userData.pick = pick;
  }, [mesh, pick]);
  useLayoutEffect(() => {
    const color = new THREE.Color();
    items.forEach((it, i) => {
      mesh.setMatrixAt(i, it.matrix);
      if (it.color) mesh.setColorAt(i, color.set(it.color));
    });
    mesh.count = items.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // 剔除、點選都看包圍球, 位置改了要重算
    mesh.computeBoundingSphere();
  }, [mesh, items]);
  if (!items.length) return null;
  return <primitive object={mesh} onClick={onClick} onPointerMove={onPointerMove} onPointerOut={onPointerOut} />;
};

const frameMaterial = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.6, metalness: 0.2 });
const lightMaterial = new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false });

const Devices3D: FC<{ placements: DevicePlacement[] }> = ({ placements }) => {
  const palletGeometry = usePalletGeometry();
  const shelves = useCargoInfo();
  const stacks = useStackSocket();
  const conveyors = useConveyorSocket();
  const elevators = useElevatorSocket();
  const chargers = useChargeStationSocket();
  const openCargoPanel = useSetAtom(CargoPanelTarget);
  const [hover, setHover] = useState<Hit | null>(null);
  useCursor(!!hover);

  const of = (kind: DevicePlacement["kind"]) => placements.filter((d) => d.kind === kind);
  const storage = useMemo(() => merge(of("STORAGE").map((d) => storageParts(d, shelves?.[d.locationId]))), [placements, shelves]);
  const stack = useMemo(() => merge(of("STACK").map((d) => stackParts(d, stacks?.[d.locationId]))), [placements, stacks]);
  const conveyor = useMemo(() => merge(of("CONVEYOR").map((d) => conveyorParts(d, conveyors?.[d.locationId]))), [placements, conveyors]);
  const elevator = useMemo(() => merge(of("ELEVATOR").map((d) => elevatorParts(d, elevators?.[d.locationId]))), [placements, elevators]);
  // 充電站的 socket 沒有去重, 每次都是新物件; 看得到的狀態沒變就不重算
  const chargerKey = JSON.stringify(
    of("CHARGING").map((d) => {
      const c = chargers[d.locationId];
      return c ? [c.disable, c.isTCPConnect || c.isMQTTConnect, c.barOut, !!c.booker] : null;
    }),
  );
  const charger = useMemo(() => merge(of("CHARGING").map((d) => chargerParts(d, chargers[d.locationId]))), [placements, chargerKey]);
  const parts = useMemo(() => merge([storage, stack, conveyor, elevator, charger]), [storage, stack, conveyor, elevator, charger]);

  const hitAt = (e: ThreeEvent<PointerEvent | MouseEvent>) => (e.instanceId === undefined ? null : parts.hits[e.instanceId] ?? null);

  return (
    <>
      <InstancedPart geometry={unitBox} material={frameMaterial} items={parts.frames} />
      <InstancedPart geometry={palletGeometry} material={palletMaterial} items={parts.pallets} />
      <InstancedPart geometry={unitBox} material={cartonMaterial} items={parts.cartons} />
      <InstancedPart geometry={unitBox} material={lightMaterial} items={parts.lights} />
      <InstancedPart
        geometry={unitBox}
        material={hitMaterial}
        items={parts.hits}
        pick="device"
        onClick={(e) => {
          const hit = hitAt(e);
          if (!hit || yieldsTo("device", e.intersections)) return;
          e.stopPropagation();
          openCargoPanel(hit.target);
        }}
        onPointerMove={(e) => {
          const hit = hitAt(e);
          e.stopPropagation();
          setHover((cur) => (cur === hit ? cur : hit));
        }}
        onPointerOut={() => setHover(null)}
      />
      {hover && (
        <Html position={hover.top} center style={{ pointerEvents: "none" }} zIndexRange={[20, 0]}>
          <div
            style={{
              padding: "2px 8px",
              borderRadius: 5,
              background: "rgba(0, 0, 0, 0.72)",
              color: "#ffffff",
              fontSize: 11,
              lineHeight: "14px",
              whiteSpace: "nowrap",
            }}
          >
            {hover.label}
          </div>
        </Html>
      )}
    </>
  );
};

export default Devices3D;
