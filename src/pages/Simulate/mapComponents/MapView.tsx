import { memo, RefObject, useRef } from "react";
import { MapImage } from "@/pages/Setting/mapComponents/components";
import { AllLocation } from "./components";
import ToolTip from "@/pages/Setting/components/ToolTip";
import { useAtomValue } from "jotai";
import { isShowLocationTooltip, isShowRoad } from "@/utils/siderGloble";
import AllRoads from "./components/AllRoads/AllRoads";
import AllCargo from "./components/AllCargo.tsx/AllCargo";
import CreateScriptForm from "../components/CreateScriptForm";
import AllInMapAMRs from "../components/AMR/AllInMapAMRs";
import { globalScale } from "../utils/mapStatus";
import AllConveyor from "./components/AllConveyor/AllConveyor";
import EditConveyorModal from "./components/AllConveyor/EditConveyorModal";
import { AllElevator } from "./components/AllElevator";
import AllChargeStation from "./components/AllChargeStation/AllChargeStation";

const MapView: React.FC<{
  mapRef: RefObject<HTMLDivElement>;
  mapWrapRef: RefObject<HTMLDivElement>;
}> = ({ mapRef, mapWrapRef }) => {
  const showLocationToolTip = useAtomValue(isShowLocationTooltip);
  const showRoad = useAtomValue(isShowRoad);
  const mapImageRef = useRef<HTMLImageElement>(null);
  const scale = useAtomValue(globalScale);

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "0% 0%",
        position: "relative",
      }}
      className="map-view"
      ref={mapRef}
    >
      <MapImage ref={mapImageRef} />
      <AllLocation />
      <AllInMapAMRs mapWrapRef={mapWrapRef} mapRef={mapRef} />
      {showRoad ? <AllRoads /> : []}

      <AllCargo />

      <AllChargeStation />
      <AllElevator />
      <AllConveyor />
      <EditConveyorModal />

      {showLocationToolTip ? <ToolTip /> : []}

      {/* 一開始創建新的模擬任務的modal 必須填完才能使用 */}
      <CreateScriptForm />
    </div>
  );
};

export default memo(MapView);
