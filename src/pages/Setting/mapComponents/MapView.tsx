import { RefObject, memo, useCallback, useRef, useState } from "react";
import "../setting.css";
import { Form, FormInstance } from "antd";
import { useAtom, useAtomValue } from "jotai";
import {
  batchCargoStyle,
  DragLineInfo,
  sameVersion,
  shelfSelectedStyleLocationId,
  showBlockId as ShowBlockId,
  zoneRectInfo,
} from "@/utils/gloable";
import {
  EditLocationPanelSwitch,
  EditZoneSwitch,
  isShowLocationTooltip,
  isShowRoad,
  isShowRoadTooltip,
  QuickEditLocationPanelSwitch,
  MirStyleLocationPlacerSwitch,
  EditAnnotationSwitch,
} from "@/utils/siderGloble";
import MirStyleLocationPlacer from "../formComponent/forms/MirStyleLocationPlacer";
import useMap from "@/api/useMap";
import Cookies from "js-cookie";
import TempLocations from "@/components/MapLayers/TempResources/TempLocations";
import {
  draggableLineInitialPoint,
  MouseLocationForFrame,
} from "@/hooks/map/hook";
import { useDraggableLine } from "../hooks";
import useMousePoint from "@/hooks/map/useMousePoint";
import useZoneFrame from "@/hooks/map/useZoneFrame";
import useLocationHoverTooltip from "@/hooks/map/useLocationHoverTooltip";
import useRoadHoverTooltip from "@/hooks/map/useRoadHoverTooltip";
import useWheelZoom from "@/hooks/map/useWheelZoom";
import { getLocationInfoById } from "@/pages/Setting/utils/utils";
import useVerityVersion from "@/api/useVerityVersion";
import { AllLocation } from "./components";
import MousePoint from "@/components/MapLayers/Icons/MousePoint";
import ZoneIconHint from "@/components/MapLayers/Icons/ZoneIconHint";
import DragFrame from "@/components/MapLayers/Icons/DragFrame";
import MapImage from "@/components/MapLayers/MapImage";
import AllZones from "@/components/MapLayers/AllZones/AllZones";
import AllAnnotations from "@/components/MapLayers/AllAnnotations/AllAnnotations";
import LocationHoverCluster from "@/components/MapLayers/AllLocation/LocationHoverCluster";
import { annotationToolAtom } from "@/atoms/map/annotationAtoms";
import type { FrameColor } from "@/components/MapLayers/Icons/DragFrame";
import { LocationType } from "@/types/map/locationTypes";
import AllRoads from "@/components/MapLayers/AllRoads/AllRoads";
import RoadHoverCluster from "@/components/MapLayers/AllRoads/RoadHoverCluster";
import AllCargo from "@/components/MapLayers/AllCargo/AllCargo";
import ToolTip from "@/components/MapLayers/ToolTip";
import SudoCargo, { SudoBatchCargo } from "@/components/MapLayers/AllCargo/SudoCargo";
import { AllChargeStation } from "@/components/MapLayers/AllChargeStation/index";
import CargoModal from "@/components/MapLayers/AllCargo/CargoModal";
import AllConveyor from "@/components/MapLayers/AllConveyor/AllConveyor";
import {
  IsEditPeripheralModal,
  IsOpenPeripheralModal,
} from "../formComponent/forms/peripheralModal/jotai";
import EditPeripheralModal from "../formComponent/forms/peripheralModal/EditPeripheralModal";
import CargoPanel from "@/components/CargoPanel/CargoPanel";
import { SudoPeripheral } from "../formComponent/forms/other/editPeripheralIcon";
import AllElevator from "@/components/MapLayers/AllElevator/AllElevator";
import { EBLM, ECSM, EEM, LDM } from "@/atoms/map/mapEditModalAtoms";
import EditElevatorModal from "@/components/MapLayers/AllElevator/EditElevatorModal";
import EditChargeStationConfigModal from "@/components/MapLayers/AllChargeStation/EditChargeStationConfigModal";
import AllGateWaitPoint from "@/components/MapLayers/AllGateWaitPoint/AllGateWaitPoint";
import AllLiftGate from "@/components/MapLayers/AllGate/AllLiftGate";
import AllStack from "@/components/MapLayers/AllStack/AllStack";
import YfyPackage from "@/components/MapLayers/YFYPackage/YfyPackage";
import EditStackModal from "@/components/MapLayers/AllStack/EditStackModal";
import EditPackageModal from "@/components/MapLayers/YFYPackage/EditPackageModal";
import BlindLocationMissionModal from "@/components/Setting/BlindLocationMissionModal";
import LocationDetectModal from "@/components/Setting/LocationDetectModal";
import useCenterMap from "@/hooks/useCenterMap";
import useDragPan from "@/pages/Main/components/WebView/hooks/useDragPan";

const MapView: React.FC<{
  scale: number;
  roadPanelForm: FormInstance<unknown>;
  locationPanelForm: FormInstance<unknown>;
  zonePanelForm: FormInstance<unknown>;
  mapRef: RefObject<HTMLDivElement>;
  mapWrapRef: RefObject<HTMLDivElement>;
}> = ({
  scale,
  mapRef,
  locationPanelForm,
  roadPanelForm,
  mapWrapRef,
  zonePanelForm,
}) => {
  const { data: currentVersion } = useVerityVersion();

  /** 路線拖曳相關參數 */
  const [, setShowBlockId] = useAtom(ShowBlockId);
  const { data: mapData } = useMap();
  const [initPoint, setInitPoint] = useState({} as draggableLineInitialPoint);
  const [isResizing, setIsResizing] = useState(false);
  const [, setDragLineInfo] = useAtom(DragLineInfo);
  /** end */

  /** 拖曳區域相關參數 */
  const [isDragging, setIsDragging] = useState(false);
  const [, setInitPointRecord] = useState({
    rvizX: 0,
    rvizY: 0,
  } as MouseLocationForFrame);
  const [, setEndPointRecord] = useState({
    rvizX: 0,
    rvizY: 0,
  } as MouseLocationForFrame);

  const [rectInfo, setRectInfo] = useAtom(zoneRectInfo);
  const zoneFrameColor = Form.useWatch("color", zonePanelForm) as FrameColor;
  /** */

  const mapImageRef = useRef<HTMLImageElement>(null);
  const [, setSameVersion] = useAtom(sameVersion);
  const openEditLocationPanel = useAtomValue(EditLocationPanelSwitch);
  const openQuickEditLocationPanelSwitch = useAtomValue(
    QuickEditLocationPanelSwitch,
  );
  const openMirStyleLocationPlacer = useAtomValue(MirStyleLocationPlacerSwitch);
  const openEditZone = useAtomValue(EditZoneSwitch);
  const openEditAnnotation = useAtomValue(EditAnnotationSwitch);
  const annotationTool = useAtomValue(annotationToolAtom);
  const shelfSelectedStyleId = useAtomValue(shelfSelectedStyleLocationId);
  const batchStyle = useAtomValue(batchCargoStyle);
  const showLocationToolTip = useAtomValue(isShowLocationTooltip);
  const showRoad = useAtomValue(isShowRoad);
  const showRoadToolTip = useAtomValue(isShowRoadTooltip);
  const openPeripheralModal = useAtomValue(IsOpenPeripheralModal);
  const openElevatorModal = useAtomValue(EEM);
  const openEditChargeStationModal = useAtomValue(ECSM);
  const openBlindMission = useAtomValue(EBLM);
  const openLocationDetect = useAtomValue(LDM);

  if (currentVersion) {
    const defaultCookie = Cookies.get("version");

    if (
      defaultCookie !== undefined &&
      defaultCookie !== currentVersion.version
    ) {
      console.log("version not same");
      setSameVersion(false);
      Cookies.set("version", currentVersion.version); // Update the cookie before reloading
      window.location.reload(); // Refresh the page
    }
    if (defaultCookie === undefined) {
      Cookies.set("version", currentVersion.version);
    }
  }

  //控制編輯點位的小紅點
  useMousePoint(
    mapWrapRef,
    mapRef,
    mapImageRef,
    scale,
    locationPanelForm,
    openEditLocationPanel,
  );

  //控制區域圈選
  useZoneFrame(
    mapWrapRef,
    mapRef,
    mapImageRef,
    scale,
    setIsDragging,
    setInitPointRecord,
    setEndPointRecord,
    setRectInfo,
    zonePanelForm,
  );

  //控制編輯路線時的箭頭拖曳
  useDraggableLine(
    mapRef,
    roadPanelForm,
    initPoint,
    isResizing,
    setIsResizing,
    scale,
  );

  //控制「地點提示」開啟時，游標移動附近點位浮出 tooltip
  useLocationHoverTooltip(mapRef, mapImageRef, scale);

  //控制「路徑提示」開啟時，游標移動附近路徑浮出 tooltip
  useRoadHoverTooltip(mapRef, mapImageRef, scale);

  //控制滑鼠滾輪縮放
  useWheelZoom(mapWrapRef, scale);

  // 控制地圖置中
  useCenterMap(mapWrapRef, mapImageRef);

  // 打點/圈選模式下左鍵要留給地圖操作，只保留中鍵拖曳
  const isEditingOnMap =
    openEditLocationPanel ||
    openQuickEditLocationPanelSwitch ||
    openEditZone ||
    openMirStyleLocationPlacer ||
    // 新增文字 / 拉框時左鍵用來放標註; 選取模式照常拖曳地圖
    (openEditAnnotation && annotationTool !== "select");

  // 控制地圖拖曳
  useDragPan(mapWrapRef, mapRef, mapImageRef, !isEditingOnMap);

  const handleMouseDown = useCallback(
    (startId: string) => {
      if (!mapData) return;
      setIsResizing(true);
      setShowBlockId(startId);
      const result = getLocationInfoById(
        startId,
        mapData?.locations as LocationType[],
      );
      setDragLineInfo((pre) => {
        return { ...pre, width: 1 };
      });
      roadPanelForm.setFieldValue("x", result.locationId);
      roadPanelForm.setFieldValue("to", undefined);
    },
    [mapData, roadPanelForm],
  );

  window.addEventListener("beforeunload", () => {
    if (!currentVersion) return;
    Cookies.set("version", currentVersion.version);
  });

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "0% 0%",
        position: "relative",
      }}
      className="map-view"
      ref={mapRef}
      draggable={false}
    >
      <MapImage ref={mapImageRef} />

      <AllAnnotations scale={scale} mapRef={mapRef} mapImageRef={mapImageRef} />

      <AllLocation
        setInitPoint={setInitPoint}
        handleMouseDown={handleMouseDown}
      />

      <AllElevator />

      <YfyPackage />

      <AllStack />

      <AllCargo setInitPoint={setInitPoint} handleMouseDown={handleMouseDown} />

      <AllZones scale={scale}></AllZones>

      <AllChargeStation
        setInitPoint={setInitPoint}
        handleMouseDown={handleMouseDown}
      />

      <AllGateWaitPoint />

      <AllLiftGate />

      {openPeripheralModal ? <EditPeripheralModal /> : []}

      <AllConveyor />

      {openQuickEditLocationPanelSwitch ? <TempLocations></TempLocations> : []}

      {openEditZone ? (
        //開啟編輯區域時的提示Icon
        <ZoneIconHint
          mapWrapRef={mapWrapRef}
          mapRef={mapRef}
          mapImageRef={mapImageRef}
          scale={scale}
          isDragging={isDragging}
        />
      ) : (
        []
      )}

      {openEditZone ? (
        <DragFrame rectInfo={rectInfo} color={zoneFrameColor}></DragFrame>
      ) : (
        []
      )}

      {openEditLocationPanel || openQuickEditLocationPanelSwitch ? (
        //編輯點位跟快速編輯點位時的小紅點
        <MousePoint></MousePoint>
      ) : (
        <></>
      )}

      {openMirStyleLocationPlacer ? (
        <MirStyleLocationPlacer
          mapRef={mapRef}
          mapImageRef={mapImageRef}
          scale={scale}
        />
      ) : null}

      {openElevatorModal?.isOpen ? <EditElevatorModal /> : null}

      {openEditChargeStationModal.isOpen ? (
        <EditChargeStationConfigModal />
      ) : null}

      {showRoad ? <AllRoads /> : []}

      {showLocationToolTip ? <ToolTip /> : []}

      {showLocationToolTip ? <LocationHoverCluster /> : []}

      {showRoad && showRoadToolTip ? <RoadHoverCluster /> : []}

      {shelfSelectedStyleId === "" ? [] : <SudoCargo />}

      {batchStyle ? <SudoBatchCargo /> : []}

      <SudoPeripheral />

      {/* 貨架 / 輸送帶 / stack / 電梯的貨物,跟主畫面用同一個面板編輯 */}
      <CargoPanel />

      <CargoModal />

      {/* stack編輯資料與貨物*/}
      <EditStackModal />
      <EditPackageModal />

      {openBlindMission.isOpen ? <BlindLocationMissionModal /> : null}

      {openLocationDetect.isOpen ? <LocationDetectModal /> : null}
    </div>
  );
};

export default memo(MapView);
