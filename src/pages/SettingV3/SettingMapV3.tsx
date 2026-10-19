import { FC, memo, useCallback, useEffect, useRef, useState } from "react";
import { Form, FormInstance } from "antd";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import Cookies from "js-cookie";
import useMap from "@/api/useMap";
import useVerityVersion from "@/api/useVerityVersion";
import CanvasMap, { CanvasMapApi } from "@/components/CanvasMap/CanvasMap";
import CargoPanel from "@/components/CargoPanel/CargoPanel";
import { DragLineInfo, Scale, sameVersion, zoneRectInfo, shelfSelectedStyleLocationId, batchCargoStyle, showBlockId as ShowBlockId } from "@/utils/gloable";
import {
  EditAnnotationSwitch,
  EditLocationPanelSwitch,
  EditRoadPanelSwitch,
  EditZoneSwitch,
  MirStyleLocationPlacerSwitch,
  QuickEditLocationPanelSwitch,
} from "@/utils/siderGloble";
import { LocationType } from "@/utils/jotai";
import { rad2Deg, rosCoord2DisplayCoord } from "@/utils/utils";
import { DraggableLine } from "@/pages/Setting/mapComponents/components/AllLocation/components/PointAndLine";
import "@/pages/Setting/setting.css";
import { draggableLineInitialPoint } from "@/pages/Setting/hooks/hook";
import { getLocationInfoById } from "@/pages/Setting/utils/utils";
import { EBLM, ECSM, EEM, IsEditingQuickRoads, LDM, QuickRoadsArray } from "@/pages/Setting/utils/settingJotai";
import { isDetectableAreaType } from "@/pages/Setting/mapComponents/components/AllLocation/components/MirAreaTypeMarker";
import { annotationToolAtom } from "@/pages/Setting/mapComponents/components/AllAnnotations/annotationAtoms";
import AllCargo from "@/pages/Setting/mapComponents/components/AllCargo/AllCargo";
import SudoCargo, { SudoBatchCargo } from "@/pages/Setting/mapComponents/components/AllCargo/SudoCargo";
import CargoModal from "@/pages/Setting/mapComponents/components/AllCargo/CargoModal";
import { AllChargeStation } from "@/pages/Setting/mapComponents/components/AllChargeStation";
import EditChargeStationConfigModal from "@/pages/Setting/mapComponents/components/AllChargeStation/EditChargeStationConfigModal";
import AllConveyor from "@/pages/Setting/mapComponents/components/AllConveyor/AllConveyor";
import AllElevator from "@/pages/Setting/mapComponents/components/AllElevator/AllElevator";
import EditElevatorModal from "@/pages/Setting/mapComponents/components/AllElevator/EditElevatorModal";
import AllGateWaitPoint from "@/pages/Setting/mapComponents/components/AllGateWaitPoint/AllGateWaitPoint";
import AllLiftGate from "@/pages/Setting/mapComponents/components/AllGate/AllLiftGate";
import AllStack from "@/pages/Setting/mapComponents/components/AllStack/AllStack";
import EditStackModal from "@/pages/Setting/mapComponents/components/AllStack/EditStackModal";
import YfyPackage from "@/pages/Setting/mapComponents/components/YFYPackage/YfyPackage";
import EditPackageModal from "@/pages/Setting/mapComponents/components/YFYPackage/EditPackageModal";
import { IsOpenPeripheralModal } from "@/pages/Setting/formComponent/forms/peripheralModal/jotai";
import EditPeripheralModal from "@/pages/Setting/formComponent/forms/peripheralModal/EditPeripheralModal";
import { SudoPeripheral } from "@/pages/Setting/formComponent/forms/other/editPeripheralIcon";
import BlindLocationMissionModal from "@/pages/Setting/components/BlindLocationMissionModal";
import LocationDetectModal from "@/pages/Setting/components/LocationDetectModal";
import { useMousePoint, useZoneFrame } from "@/pages/Setting/hooks";
import { AllAnnotations, DragFrame, MousePoint, ZoneIconHint } from "@/pages/Setting/mapComponents/components";
import type { FrameColor } from "@/pages/Setting/mapComponents/components";
import { MouseLocationForFrame } from "@/pages/Setting/hooks/hook";
import TempLocations from "@/pages/Setting/mapComponents/components/TempResources/TempLocations";
import MirStyleLocationPlacer from "@/pages/Setting/formComponent/forms/MirStyleLocationPlacer";

/**
 * 設定頁 (setting-v3) 的地圖: 舊 MapView 的畫布版。
 * 點位、路線、區域、標註畫在 CanvasMap 上; 設備 (貨架、充電站…) 和它們的編輯對話框
 * 原封不動沿用設定頁的元件, 疊在畫布的設備層。
 */

type Props = {
  roadPanelForm: FormInstance<unknown>;
  locationPanelForm: FormInstance<unknown>;
  zonePanelForm: FormInstance<unknown>;
};

/** 版本換了就重新整理 (照舊 MapView) */
const useReloadOnNewVersion = () => {
  const { data: currentVersion } = useVerityVersion();
  const setSameVersion = useSetAtom(sameVersion);
  useEffect(() => {
    if (!currentVersion) return;
    const saved = Cookies.get("version");
    if (saved !== undefined && saved !== currentVersion.version) {
      setSameVersion(false);
      Cookies.set("version", currentVersion.version);
      window.location.reload();
      return;
    }
    if (saved === undefined) Cookies.set("version", currentVersion.version);
  }, [currentVersion, setSameVersion]);
  useEffect(() => {
    if (!currentVersion) return;
    const save = () => Cookies.set("version", currentVersion.version);
    window.addEventListener("beforeunload", save);
    return () => window.removeEventListener("beforeunload", save);
  }, [currentVersion]);
};

const SettingMapV3: FC<Props> = ({ roadPanelForm, locationPanelForm, zonePanelForm }) => {
  const { data: mapData } = useMap();
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapImageRef = useRef<HTMLImageElement>(null);

  useReloadOnNewVersion();

  const openEditLocationPanel = useAtomValue(EditLocationPanelSwitch);
  const openQuickEditLocationPanel = useAtomValue(QuickEditLocationPanelSwitch);
  const openMirPlacer = useAtomValue(MirStyleLocationPlacerSwitch);
  const openEditZone = useAtomValue(EditZoneSwitch);
  const openEditRoadPanel = useAtomValue(EditRoadPanelSwitch);
  const openEditAnnotation = useAtomValue(EditAnnotationSwitch);
  const annotationTool = useAtomValue(annotationToolAtom);
  const shelfSelectedStyleId = useAtomValue(shelfSelectedStyleLocationId);
  const batchStyle = useAtomValue(batchCargoStyle);
  const openPeripheralModal = useAtomValue(IsOpenPeripheralModal);
  const openElevatorModal = useAtomValue(EEM);
  const openEditChargeStationModal = useAtomValue(ECSM);
  const openBlindMission = useAtomValue(EBLM);
  const openLocationDetect = useAtomValue(LDM);
  const quickRoad = useAtomValue(IsEditingQuickRoads);
  const setQuickRoadArr = useSetAtom(QuickRoadsArray);
  const setOpenLDM = useSetAtom(LDM);

  // 打點 / 框選 / 放標註時左鍵要留給地圖操作, 只保留中鍵拖曳 (同舊 MapView)
  const isEditingOnMap =
    openEditLocationPanel ||
    openQuickEditLocationPanel ||
    openEditZone ||
    openMirPlacer ||
    (openEditAnnotation && annotationTool !== "select");

  // ---------------- 點位: 編輯點位 / 快速編輯點位時點地圖打點 (小紅點 + 表單的 x、y)
  // 舊 hook 原封不動: 它拿底圖 <img> 的位置和 Scale 換算座標, 底圖在畫布跟著平移縮放的那一層
  const scale = useAtomValue(Scale);
  useMousePoint(wrapRef, wrapRef, mapImageRef, scale, locationPanelForm, openEditLocationPanel);

  // ---------------- 區域: 編輯區域時在地圖上拉框 (舊的 useZoneFrame 原封不動)
  const [isDraggingZone, setIsDraggingZone] = useState(false);
  const [, setZoneStart] = useState({ rvizX: 0, rvizY: 0 } as MouseLocationForFrame);
  const [, setZoneEnd] = useState({ rvizX: 0, rvizY: 0 } as MouseLocationForFrame);
  const [rectInfo, setRectInfo] = useAtom(zoneRectInfo);
  const zoneFrameColor = Form.useWatch("color", zonePanelForm) as FrameColor;
  useZoneFrame(
    wrapRef,
    wrapRef,
    mapImageRef,
    scale,
    setIsDraggingZone,
    setZoneStart,
    setZoneEnd,
    setRectInfo,
    zonePanelForm,
  );

  // ---------------- 路線: 從一個地點拉到另一個地點 (表單的起點 x、終點 to)
  // 起點: 畫布上的點位由 onCanvasPointerDown 判斷; 貨架 / 充電站是 DOM, 它們 mousedown 時
  // 自己呼叫 setInitPoint + handleMouseDown (同舊 MapView)。
  // 舊的 useDraggableLine 靠 mouseup 那個 DOM 元素的 id 找終點, 畫布上的點位沒有 DOM,
  // 所以拖曳、放開改在這裡做: 放在畫布上就問 CanvasMap 那裡是哪個點位, 放在設備上就用它的 id。
  const apiRef = useRef<CanvasMapApi | null>(null);
  const initPointRef = useRef<draggableLineInitialPoint>({ clientX: 0, clientY: 0 });
  const setInitPoint = useCallback((p: draggableLineInitialPoint) => {
    initPointRef.current = p;
  }, []);
  const draggingRef = useRef(false);
  const [showBlockId, setShowBlockId] = useAtom(ShowBlockId);
  const setDragLineInfo = useSetAtom(DragLineInfo);
  const handleMouseDown = useCallback(
    (startId: string) => {
      if (!mapData) return;
      draggingRef.current = true;
      setShowBlockId(startId);
      const result = getLocationInfoById(startId, mapData.locations as LocationType[]);
      setDragLineInfo((pre) => ({ ...pre, width: 1 }));
      roadPanelForm.setFieldValue("x", result.locationId);
      roadPanelForm.setFieldValue("to", undefined);
    },
    [mapData, roadPanelForm, setShowBlockId, setDragLineInfo],
  );

  const roadDragEnabled = openEditRoadPanel && !openEditZone && !quickRoad;
  const onCanvasPointerDown = useCallback(
    (e: PointerEvent) => {
      if (!roadDragEnabled) return false;
      const id = apiRef.current?.pointAt(e.clientX, e.clientY);
      if (!id) return false;
      // 線從點位中心拉出去, 不是從按下的那個像素
      const c = apiRef.current?.locationClientPos(id);
      setInitPoint({ clientX: c?.x ?? e.clientX, clientY: c?.y ?? e.clientY });
      handleMouseDown(id);
      return true;
    },
    [roadDragEnabled, setInitPoint, handleMouseDown],
  );

  useEffect(() => {
    if (!showBlockId || !roadDragEnabled) return;
    const locationIds = new Set(mapData?.locations.map((l) => String(l.locationId)) ?? []);
    const reset = () => {
      setShowBlockId("");
      setDragLineInfo({ deg: 90, endDisplayX1: initPointRef.current.clientX, endDisplayY1: initPointRef.current.clientY, width: 0 });
    };
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const init = initPointRef.current;
      const dx = e.clientX - init.clientX;
      const dy = e.clientY - init.clientY;
      setDragLineInfo({
        deg: rad2Deg(Math.atan2(dy, dx)),
        // DraggableLine 畫在跟著縮放的那一層, 長度要換回底圖像素
        width: Math.hypot(dx, dy) / (scale || 1),
        endDisplayX1: e.clientX,
        endDisplayY1: e.clientY,
      });
    };
    const onUp = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      const target = e.target as HTMLElement | null;
      let endId: string | null = null;
      if (target?.tagName === "CANVAS") {
        endId = apiRef.current?.pointAt(e.clientX, e.clientY) ?? null;
      } else {
        // 設備 (貨架、充電站…) 的 DOM: 往上找第一個 id 是地點編號的元素
        for (let el: HTMLElement | null = target; el && el !== wrapRef.current; el = el.parentElement) {
          if (el.id && locationIds.has(el.id)) {
            endId = el.id;
            break;
          }
        }
      }
      if (!endId || endId === showBlockId) {
        reset();
        return;
      }
      const result = getLocationInfoById(endId, mapData?.locations as LocationType[]);
      roadPanelForm.setFieldValue("to", result.locationId);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [showBlockId, roadDragEnabled, mapData, scale, roadPanelForm, setShowBlockId, setDragLineInfo]);

  // 拉線的起點 (充電站自己會畫, 其他地點畫在最上層)
  const dragStart = (() => {
    if (!showBlockId || !mapData) return null;
    const loc = mapData.locations.find((l) => String(l.locationId) === showBlockId);
    if (!loc || loc.areaType === "CHARGING") return null;
    const [left, top] = rosCoord2DisplayCoord({
      x: loc.x,
      y: loc.y,
      mapHeight: mapData.mapHeight,
      mapOriginX: mapData.mapOriginX,
      mapOriginY: mapData.mapOriginY,
      mapResolution: mapData.mapResolution,
    });
    return { left, top };
  })();

  // ---------------- 點了點位 (照舊設定頁 AllLocation 的 handleClick)
  const onPointClick = useCallback(
    (locationId: string) => {
      if (quickRoad) {
        setQuickRoadArr((prev) => [...prev, locationId]);
        return;
      }
      if (!openEditRoadPanel || openEditZone) {
        // 只有有實體 marker 的類型 (充電站、VL marker) 才開啟點位偵測
        const loc = mapData?.locations.find((l) => String(l.locationId) === locationId);
        if (!loc || !isDetectableAreaType(loc.areaType)) return;
        setOpenLDM({ locationId, isOpen: true });
      }
    },
    [quickRoad, setQuickRoadArr, openEditRoadPanel, openEditZone, mapData, setOpenLDM],
  );

  return (
    <CanvasMap
      wrapRef={wrapRef}
      mapImageRef={mapImageRef}
      showAmrs={false}
      alwaysShowAnnotations
      leftButtonPans={!isEditingOnMap}
      onPointClick={onPointClick}
      apiRef={apiRef}
      onCanvasPointerDown={onCanvasPointerDown}
      // 編輯標註時改用 DOM 版 (點選、拖曳、旋轉), 畫布上就不畫, 免得畫兩份
      hideAnnotations={openEditAnnotation}
      overlay={
        <>
          {openEditAnnotation ? <AllAnnotations scale={scale} mapRef={wrapRef} mapImageRef={mapImageRef} /> : null}
          {openEditZone ? (
            <ZoneIconHint
              mapWrapRef={wrapRef}
              mapRef={wrapRef}
              mapImageRef={mapImageRef as unknown as React.RefObject<HTMLDivElement>}
              scale={scale}
              isDragging={isDraggingZone}
            />
          ) : null}
          {openEditZone ? <DragFrame rectInfo={rectInfo} color={zoneFrameColor} /> : null}
          {dragStart ? <DraggableLine locId={showBlockId} left={dragStart.left} top={dragStart.top} /> : null}
          {openQuickEditLocationPanel ? <TempLocations /> : null}
          {/* 編輯點位跟快速編輯點位時的小紅點 */}
          {openEditLocationPanel || openQuickEditLocationPanel ? <MousePoint /> : null}
          {openMirPlacer ? <MirStyleLocationPlacer mapRef={wrapRef} mapImageRef={mapImageRef} scale={scale} /> : null}
        </>
      }
    >
      <AllElevator />
      <YfyPackage />
      <AllStack />
      <AllCargo setInitPoint={setInitPoint} handleMouseDown={handleMouseDown} />
      <AllChargeStation setInitPoint={setInitPoint} handleMouseDown={handleMouseDown} />
      <AllGateWaitPoint />
      <AllLiftGate />
      {openPeripheralModal ? <EditPeripheralModal /> : null}
      <AllConveyor />
      {openElevatorModal?.isOpen ? <EditElevatorModal /> : null}
      {openEditChargeStationModal.isOpen ? <EditChargeStationConfigModal /> : null}
      {shelfSelectedStyleId === "" ? null : <SudoCargo />}
      {batchStyle ? <SudoBatchCargo /> : null}
      <SudoPeripheral />
      {/* 貨架 / 輸送帶 / stack / 電梯的貨物, 跟主畫面用同一個面板編輯 */}
      <CargoPanel />
      <CargoModal />
      <EditStackModal />
      <EditPackageModal />
      {openBlindMission.isOpen ? <BlindLocationMissionModal /> : null}
      {openLocationDetect.isOpen ? <LocationDetectModal /> : null}
    </CanvasMap>
  );
};

export default memo(SettingMapV3);
