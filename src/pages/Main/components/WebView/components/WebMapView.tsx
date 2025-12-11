import { memo, RefObject, useRef } from "react";
import { MapImage } from "@/pages/Setting/mapComponents/components";
import "../webview.css";
import { AllZones } from "@/pages/Setting/mapComponents/components";
import AllLocation from "../../PadViwe/components/PadMapContent/component/AllLocation";
import { useAtom, useAtomValue } from "jotai";
import { AmrFilterCarCard, Scale, showZoneForbidden } from "@/utils/gloable";

import AllRoads from "@/pages/Setting/mapComponents/components/AllRoads/AllRoads";
import AllAMRs from "../../PadViwe/components/PadMapContent/component/AllAMRs/AllAMRs";
import AllCargo from "../../PadViwe/components/PadMapContent/AllCargo/AllCargo";
import ToolTip from "@/pages/Setting/components/ToolTip";
import {
  isShowLocation,
  isShowLocationTooltip,
  isShowRoad,
} from "@/utils/siderGloble";
import useMap from "@/api/useMap";
import AllConveyor from "../../PadViwe/components/PadMapContent/AllConveyor/AllConveyor";
import { AllElevator } from "../../PadViwe/components/PadMapContent/AllElevator";
import AllChargeStation from "../../PadViwe/components/PadMapContent/AllChargeStation/AllChargeStation";
import { OpenChargeStationModal } from "@/pages/Main/global/jotai";
import StatusPanel from "../../PadViwe/components/PadMapContent/AllChargeStation/StatusPanel";
import useDetectLoc from "../hooks/useDetectLoc";
import useMouseClick from "../hooks/useMouseClick";
import ScalePad from "./ScalePad";

const WebMapView: React.FC<{
  mapRef: RefObject<HTMLDivElement>;
  mapWrapRef: RefObject<HTMLDivElement>;
}> = ({ mapRef, mapWrapRef }) => {
  const scale = useAtomValue(Scale);
  const mapImageRef = useRef<HTMLImageElement>(null);
  const [hintAmrId, setHintAmrId] = useAtom(AmrFilterCarCard);
  const [zoneForbidden, setZoneForbidden] = useAtom(showZoneForbidden);
  const showLocationToolTip = useAtomValue(isShowLocationTooltip);
  const showLocation = useAtomValue(isShowLocation);
  const showRoad = useAtomValue(isShowRoad);
  const showChargeConfig = useAtomValue(OpenChargeStationModal);
  const { isError } = useMap();

  useDetectLoc(mapRef, mapWrapRef, mapImageRef, scale);
  useMouseClick(mapWrapRef);

  return (
    <div
      className="map-view"
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "0% 0%",
        position: "relative",
      }}
      draggable={false}
      ref={mapRef}
      onClick={(e) => {
        if (zoneForbidden.size) {
          setZoneForbidden(new Set());
        }
        setZoneForbidden(new Set());
        if (!hintAmrId.size) {
          return;
        }
        if ((e.target as HTMLElement).tagName === "IMG") {
          setHintAmrId((pre) => {
            pre.clear();
            return new Set([...pre]);
          });
        }
      }}
    >
      <MapImage ref={mapImageRef}></MapImage>
      {isError ? (
        []
      ) : (
        <>
          <AllLocation mapRef={mapRef}></AllLocation>
          <AllAMRs></AllAMRs>
          <AllCargo></AllCargo>
          <AllElevator></AllElevator>
          <AllConveyor></AllConveyor>
          {showLocation ? <AllLocation mapRef={mapRef}></AllLocation> : null}
          {showRoad ? <AllRoads></AllRoads> : null}
          {showLocationToolTip ? <ToolTip /> : []}
          <AllZones scale={scale}></AllZones>
          <AllChargeStation></AllChargeStation>
          {showChargeConfig ? <StatusPanel locId={showChargeConfig} /> : null}
          <ScalePad></ScalePad>
        </>
      )}
    </div>
  );
};

export default memo(WebMapView);
