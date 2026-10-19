import { FC, memo, useCallback, useEffect, useRef, useState } from "react";
import { FormInstance } from "antd";
import { useAtomValue, useSetAtom } from "jotai";
import Cookies from "js-cookie";
import useMap from "@/api/useMap";
import useVerityVersion from "@/api/useVerityVersion";
import CanvasMap from "@/components/CanvasMap/CanvasMap";
import CargoPanel from "@/components/CargoPanel/CargoPanel";
import { DragLineInfo, Scale, sameVersion, shelfSelectedStyleLocationId, batchCargoStyle, showBlockId as ShowBlockId } from "@/utils/gloable";
import {
  EditAnnotationSwitch,
  EditLocationPanelSwitch,
  EditRoadPanelSwitch,
  EditZoneSwitch,
  MirStyleLocationPlacerSwitch,
  QuickEditLocationPanelSwitch,
} from "@/utils/siderGloble";
import { LocationType } from "@/utils/jotai";
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
import { useMousePoint } from "@/pages/Setting/hooks";
import { MousePoint } from "@/pages/Setting/mapComponents/components";
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

const SettingMapV3: FC<Props> = ({ roadPanelForm, locationPanelForm }) => {
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

  // ---------------- 路線: 從貨架 / 充電站拉線的起點 (設備元件 mousedown 時呼叫, 同舊 MapView)
  const [, setInitPoint] = useState({} as draggableLineInitialPoint);
  const setShowBlockId = useSetAtom(ShowBlockId);
  const setDragLineInfo = useSetAtom(DragLineInfo);
  const handleMouseDown = useCallback(
    (startId: string) => {
      if (!mapData) return;
      setShowBlockId(startId);
      const result = getLocationInfoById(startId, mapData.locations as LocationType[]);
      setDragLineInfo((pre) => ({ ...pre, width: 1 }));
      roadPanelForm.setFieldValue("x", result.locationId);
      roadPanelForm.setFieldValue("to", undefined);
    },
    [mapData, roadPanelForm, setShowBlockId, setDragLineInfo],
  );

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
      overlay={
        <>
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
