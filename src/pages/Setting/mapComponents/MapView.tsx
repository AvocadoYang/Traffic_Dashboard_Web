import { RefObject, memo, useCallback, useRef, useState } from "react";
import "../setting.css";
import { FormInstance } from "antd";
import { useAtom, useAtomValue } from "jotai";
import {
  DragLineInfo,
  sameVersion,
  shelfSelectedStyleLocationId,
  showBlockId as ShowBlockId,
} from "@/utils/gloable";
import {
  EditLocationPanelSwitch,
  EditZoneSwitch,
  isShowLocationTooltip,
  isShowRoad,
  QuickEditLocationPanelSwitch,
} from "@/utils/siderGloble";
import useMap from "@/api/useMap";
import Cookies from "js-cookie";
import TempLocations from "./components/TempResources/TempLocations";
import {
  draggableLineInitialPoint,
  MouseLocationForFrame,
  RectInfo,
} from "../hooks/hook";
import { useMousePoint, useDraggableLine, useZoneFrame } from "../hooks";
import { getLocationInfoById } from "@/pages/Setting/utils/utils";
import useVerityVersion from "@/api/useVerityVersion";
import {
  MousePoint,
  AllLocation,
  MapImage,
  ZoneIconHint,
  DragFrame,
  AllZones,
} from "./components";
import { LocationType } from "@/utils/jotai";
import AllRoads from "./components/AllRoads/AllRoads";
import AllCargo from "./components/AllCargo/AllCargo";
import ToolTip from "../components/ToolTip";
import SudoCargo from "./components/AllCargo/SudoCargo";
import { AllChargeStation } from "./components/AllChargeStation";
import CargoDetail from "./components/AllCargo/CargoDetail";
import { GlobalCargoInfoModal } from "./components/AllCargo/jotaiState";
import CargoModal from "./components/AllCargo/CargoModal";
import AllConveyor from "./components/AllConveyor/AllConveyor";
import {
  IsEditPeripheralModal,
  IsOpenCargoEditorModal,
  IsOpenPeripheralModal,
} from "../formComponent/forms/peripheralModal/jotai";
import EditPeripheralModal from "../formComponent/forms/peripheralModal/EditPeripheralModal";
import CargoEditor from "../formComponent/forms/peripheralModal/CargoEditor";
import { SudoPeripheral } from "../formComponent/forms/other/editPeripheralIcon";
import AllElevator from "./components/AllElevator/AllElevator";
import { ECSM, EEC, EEM, ESM } from "../utils/settingJotai";
import EditElevatorModal from "./components/AllElevator/EditElevatorModal";
import CargoEditorElevator from "./components/AllElevator/Form/CargoEditorElevator";
import EditChargeStationConfigModal from "./components/AllChargeStation/EditChargeStationConfigModal";
import AllGateWaitPoint from "./components/AllGateWaitPoint/AllGateWaitPoint";
import AllLiftGate from "./components/AllGate/AllLiftGate";
import AllStack from "./components/AllStack/AllStack";
import YfyPackage from "./components/YFYPackage/YfyPackage";
import EditStackModal from "./components/AllStack/EditStackModal";
import CargoEditorStack from "./components/AllStack/CargoEditorStack";

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

  const [rectInfo, setRectInfo] = useState({
    axisX: -5000,
    axisY: -5000,
    width: 0,
    height: 0,
  } as RectInfo);
  /** */

  const mapImageRef = useRef<HTMLImageElement>(null);
  const [, setSameVersion] = useAtom(sameVersion);
  const openEditLocationPanel = useAtomValue(EditLocationPanelSwitch);
  const openQuickEditLocationPanelSwitch = useAtomValue(
    QuickEditLocationPanelSwitch,
  );
  const openEditZone = useAtomValue(EditZoneSwitch);
  const shelfSelectedStyleId = useAtomValue(shelfSelectedStyleLocationId);
  const showLocationToolTip = useAtomValue(isShowLocationTooltip);
  const showRoad = useAtomValue(isShowRoad);
  const openCargoInfo = useAtomValue(GlobalCargoInfoModal);
  const openPeripheralModal = useAtomValue(IsOpenPeripheralModal);
  const openPeripheralCargoEditorModal = useAtomValue(IsOpenCargoEditorModal);
  const openElevatorModal = useAtomValue(EEM);
  const openModalElevatorCargoEditor = useAtomValue(EEC);
  const openEditChargeStationModal = useAtomValue(ECSM);
  const openStackContainereditor = useAtomValue(ESM);

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

      {openPeripheralCargoEditorModal ? <CargoEditor /> : []}

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

      {openEditZone ? <DragFrame rectInfo={rectInfo}></DragFrame> : []}

      {openEditLocationPanel || openQuickEditLocationPanelSwitch ? (
        //編輯點位跟快速編輯點位時的小紅點
        <MousePoint></MousePoint>
      ) : (
        <></>
      )}

      {openElevatorModal?.isOpen ? <EditElevatorModal /> : null}

      {openEditChargeStationModal.isOpen ? (
        <EditChargeStationConfigModal />
      ) : null}

      {showRoad ? <AllRoads /> : []}

      {showLocationToolTip ? <ToolTip /> : []}

      {shelfSelectedStyleId === "" ? [] : <SudoCargo />}

      <SudoPeripheral />

      {/* 只有for  儲位專用修改貨物資料的 modal */}
      {openCargoInfo ? <CargoDetail /> : []}

      {openModalElevatorCargoEditor ? <CargoEditorElevator /> : null}

      <CargoModal />

      {/* stack編輯資料與貨物*/}
      <EditStackModal />

      {openStackContainereditor.isOpen ? <CargoEditorStack /> : null}
    </div>
  );
};

export default memo(MapView);
