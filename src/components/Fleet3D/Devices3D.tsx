import { FC, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { Html, useCursor } from "@react-three/drei";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import * as THREE from "three";
import useCargoInfo from "@/sockets/useCargoInfo";
import useStackSocket from "@/sockets/useStackSocket";
import useConveyorSocket from "@/sockets/useConveyorSocket";
import useElevatorSocket from "@/sockets/useElevatorSocket";
import useChargeStationSocket from "@/sockets/useChargeStationSocket";
import useLiftGateSocket from "@/sockets/useLiftGateSocket";
import usePackageSocket from "@/sockets/usePackageSocket";
import { CargoPanelTarget } from "@/components/CargoPanel/state";
import {
  OpenChargeStationModal,
  QuickMissionHoverCell,
  QuickMissionLoad,
  QuickMissionOffload,
  QuickMissionPickerLoc,
  QuickMissionSettingMode,
  StartQuickMissionSetting,
} from "@/pages/Main/global/jotai";
import { getModeColor } from "@/pages/Main/components/PadViwe/components/PadMapContent/AllCargo/ShelfLevelPicker";
import { Lift_Gate_Status } from "@/types/peripheral";
import { DevicePlacement } from "./devicePlacement";
import {
  Hit,
  PackageText,
  Parts,
  chargerParts,
  conveyorParts,
  elevatorParts,
  gateWaitParts,
  liftGateParts,
  merge,
  packageParts,
  stackParts,
  storageParts,
} from "./deviceParts";
import { cartonMaterial, hitMaterial, palletMaterial, unitBox, usePalletGeometry } from "./models";
import { isDrag, yieldsTo } from "./pick";
import { useBlinkFrames } from "./Scene3D";

/**
 * 3D 地圖上的設備: 貨架 (各層照後端的層高, 有貨的層放棧板)、堆疊 (疊了幾板)、
 * 輸送帶 / 電梯 (平台在對接高度)、充電站、包膜線 (感測到東西的位置放貨)、捲門 (照開關狀態)、門前等待點。
 * 資料跟 2D 地圖的設備圖層是同一批 socket。
 *
 * 現場可能有上百個儲位, 一個零件一個物件會有幾千次繪製, 所以同一類零件 (框架、棧板、紙箱、燈)
 * 全部用 InstancedMesh 一次畫完 (零件擺在哪見 deviceParts), 資料變了才重算。
 * 點貨架 / 堆疊 / 輸送帶 / 電梯 / 包膜線打開右邊的貨物面板, 點充電站打開充電站控制 (同 2D)。
 * 首頁「任務派發」在選取貨點 / 放貨點時, 能選的設備發出那個模式的顏色, 點了就填進去 (同 2D 的規則)。
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
  const invalidate = useThree((s) => s.invalidate);
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
    invalidate();
  }, [mesh, items, invalidate]);
  if (!items.length) return null;
  return <primitive object={mesh} onClick={onClick} onPointerMove={onPointerMove} onPointerOut={onPointerOut} />;
};

const frameMaterial = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.6, metalness: 0.2 });
const lightMaterial = new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false });
/** 設備訊號閃的: 一秒閃 1.5 次 (同車的告警) */
const blinkMaterial = new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false, transparent: true, depthWrite: false });
const BLINK_HZ = 1.5;
/** 派車選點位時能選的設備罩一層模式的顏色, 慢慢呼吸 */
const chooseMaterial = new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false, transparent: true, depthWrite: false });
const CHOOSE_HZ = 0.8;

const GATE_STATUS_TEXT = {
  [Lift_Gate_Status.OPENED]: "fleet3d.gate.opened",
  [Lift_Gate_Status.OPENING]: "fleet3d.gate.opening",
  [Lift_Gate_Status.CLOSING]: "fleet3d.gate.closing",
  [Lift_Gate_Status.CLOSED]: "fleet3d.gate.closed",
  [Lift_Gate_Status.E_STOP]: "fleet3d.gate.e_stop",
  [Lift_Gate_Status.VFD_Alarm]: "fleet3d.gate.vfd_alarm",
  [Lift_Gate_Status.System_Error]: "fleet3d.gate.system_error",
} as const;

const Devices3D: FC<{ placements: DevicePlacement[] }> = ({ placements }) => {
  const { t } = useTranslation();
  const palletGeometry = usePalletGeometry();
  const shelves = useCargoInfo();
  const stacks = useStackSocket();
  const conveyors = useConveyorSocket();
  const elevators = useElevatorSocket();
  const chargers = useChargeStationSocket();
  const gates = useLiftGateSocket();
  const packages = usePackageSocket();
  const openCargoPanel = useSetAtom(CargoPanelTarget);
  const openCharger = useSetAtom(OpenChargeStationModal);
  const [hover, setHover] = useState<Hit | null>(null);
  useCursor(!!hover);

  // 派車選點位 (首頁「任務派發」, 同 2D 各設備)
  const selecting = useAtomValue(StartQuickMissionSetting);
  const [selectMode, setSelectMode] = useAtom(QuickMissionSettingMode);
  const setSelecting = useSetAtom(StartQuickMissionSetting);
  const setLoad = useSetAtom(QuickMissionLoad);
  const setOffload = useSetAtom(QuickMissionOffload);
  const setPickerLoc = useSetAtom(QuickMissionPickerLoc);
  const setHoverCell = useSetAtom(QuickMissionHoverCell);
  const mode = selecting ? selectMode : null;

  const of = (kind: DevicePlacement["kind"]) => placements.filter((d) => d.kind === kind);
  const storage = useMemo(() => merge(of("STORAGE").map((d) => storageParts(d, shelves?.[d.locationId]))), [placements, shelves]);
  const stack = useMemo(() => merge(of("STACK").map((d) => stackParts(d, stacks?.[d.locationId]))), [placements, stacks]);
  const conveyor = useMemo(() => merge(of("CONVEYOR").map((d) => conveyorParts(d, conveyors?.[d.locationId]))), [placements, conveyors]);
  const elevator = useMemo(() => merge(of("ELEVATOR").map((d) => elevatorParts(d, elevators?.[d.locationId]))), [placements, elevators]);
  // 充電站的 socket 沒有去重, 每次都是新物件; 看得到的狀態沒變就不重算
  const chargerKey = JSON.stringify(
    of("CHARGING").map((d) => {
      const c = chargers[d.locationId];
      return c ? [c.disable, c.isTCPConnect || c.isMQTTConnect, c.barOut, !!c.booker, c.name] : null;
    }),
  );
  const charger = useMemo(() => merge(of("CHARGING").map((d) => chargerParts(d, chargers[d.locationId]))), [placements, chargerKey]);
  const gate = useMemo(
    () =>
      merge([
        ...of("LIFT_GATE").map((d) => {
          const info = gates?.[d.locationId];
          const status = info?.status && GATE_STATUS_TEXT[info.status] ? t(GATE_STATUS_TEXT[info.status]) : "";
          const name = info?.name || `${t("main.map.rolling_door")} ${d.locationId}`;
          return liftGateParts(d, info, [name, status].filter(Boolean).join(" · "));
        }),
        ...of("GATE_WAIT_POINT").map(gateWaitParts),
      ]),
    [placements, gates, t],
  );
  const packageLines = useMemo(() => {
    const text: PackageText = {
      entry: (name) => t("package.entry_title", { name }),
      exit: (name) => t("package.exit_title", { name }),
      registered: (n) => t("fleet3d.package.registered", { n }),
    };
    const byId = new Map(of("PACKAGE_OUT").map((d) => [d.locationId, d]));
    const lines: Parts[] = of("PACKAGE_IN").map((d) => {
      const info = packages?.[d.locationId];
      const exit = info?.exitLocationId != null ? (byId.get(String(info.exitLocationId)) ?? null) : null;
      return packageParts(d, exit, info, exit ? packages?.[exit.locationId] : undefined, text);
    });
    // 還沒被哪個入口指定的出口自己畫一小段 (已經配對的跟著入口那條線畫)
    for (const d of of("PACKAGE_OUT")) {
      const info = packages?.[d.locationId];
      if (info && info.entryLocationId === null) lines.push(packageParts(null, d, undefined, info, text));
    }
    return merge(lines);
  }, [placements, packages, t]);
  const parts = useMemo(
    () => merge([storage, stack, conveyor, elevator, charger, gate, packageLines]),
    [storage, stack, conveyor, elevator, charger, gate, packageLines],
  );
  const choosable = useMemo(
    () => (mode ? parts.hits.filter((h) => h.pick?.[mode]).map((h) => ({ matrix: h.matrix, color: getModeColor(mode).main })) : []),
    [parts.hits, mode],
  );

  const blink = useBlinkFrames();
  useFrame(({ clock }) => {
    if (!parts.blinks.length && !choosable.length) return;
    const wave = (hz: number) => 0.5 + 0.5 * Math.sin(clock.elapsedTime * hz * 2 * Math.PI);
    blinkMaterial.opacity = 0.1 + 0.8 * wave(BLINK_HZ);
    chooseMaterial.opacity = 0.3 + 0.3 * wave(CHOOSE_HZ);
    blink();
  });

  const choose = (hit: Hit) => {
    if (!mode || !hit.pick?.[mode]) return;
    const { locationId, columnName, level } = hit.pick;
    const payload = { missionType: mode, columnName, locationId, level };
    if (mode === "load") setLoad(payload);
    else setOffload(payload);
    setSelecting(false);
    setSelectMode(null);
    setPickerLoc(null);
    setHoverCell(null);
  };

  const hitAt = (e: ThreeEvent<PointerEvent | MouseEvent>) => (e.instanceId === undefined ? null : (parts.hits[e.instanceId] ?? null));
  const tipAt = (e: ThreeEvent<PointerEvent>) => (e.instanceId === undefined ? null : (parts.tips[e.instanceId] ?? null));
  const hint =
    mode && hover && !parts.tips.includes(hover)
      ? hover.pick?.[mode]
        ? t(mode === "load" ? "fleet3d.pick.load" : "fleet3d.pick.offload")
        : t("fleet3d.pick.blocked")
      : null;

  return (
    <>
      <InstancedPart geometry={unitBox} material={frameMaterial} items={parts.frames} />
      <InstancedPart geometry={palletGeometry} material={palletMaterial} items={parts.pallets} />
      <InstancedPart geometry={unitBox} material={cartonMaterial} items={parts.cartons} />
      <InstancedPart geometry={unitBox} material={lightMaterial} items={parts.lights} />
      <InstancedPart geometry={unitBox} material={blinkMaterial} items={parts.blinks} />
      <InstancedPart geometry={unitBox} material={chooseMaterial} items={choosable} />
      <InstancedPart
        geometry={unitBox}
        material={hitMaterial}
        items={parts.hits}
        pick="device"
        onClick={(e) => {
          const hit = hitAt(e);
          if (!hit || isDrag(e) || yieldsTo("device", e.intersections)) return;
          e.stopPropagation();
          if (mode) choose(hit);
          else if (hit.target) openCargoPanel(hit.target);
          else if (hit.charger) openCharger(hit.charger);
        }}
        onPointerMove={(e) => {
          const hit = hitAt(e);
          e.stopPropagation();
          setHover((cur) => (cur === hit ? cur : hit));
        }}
        onPointerOut={() => setHover(null)}
      />
      {/* 捲門: 只有滑過去看狀態, 沒有 pick 標記, 點擊照樣傳給底下的點位 */}
      <InstancedPart
        geometry={unitBox}
        material={hitMaterial}
        items={parts.tips}
        onPointerMove={(e) => {
          const tip = tipAt(e);
          e.stopPropagation();
          setHover((cur) => (cur === tip ? cur : tip));
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
              textAlign: "center",
            }}
          >
            {hover.label}
            {hint && <div style={{ color: hover.pick?.[mode!] ? getModeColor(mode!).main : "#ffccc7" }}>{hint}</div>}
          </div>
        </Html>
      )}
    </>
  );
};

export default Devices3D;
