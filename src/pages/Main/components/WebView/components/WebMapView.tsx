import { memo, RefObject, useEffect, useRef, useState } from "react";
import {
  MapImage,
  LocationHoverCluster,
} from "@/pages/Setting/mapComponents/components";
import "../webview.css";
import { AllZones } from "@/pages/Setting/mapComponents/components";
import AllLocation from "../../PadViwe/components/PadMapContent/component/AllLocation";
import { useAtom, useAtomValue } from "jotai";
import { AmrFilterCarCard, Scale, showZoneForbidden } from "@/utils/gloable";

import AllRoads from "@/pages/Setting/mapComponents/components/AllRoads/AllRoads";
import RoadHoverCluster from "@/pages/Setting/mapComponents/components/AllRoads/RoadHoverCluster";
import AllAMRs from "../../PadViwe/components/PadMapContent/component/AllAMRs/AllAMRs";
import AllCargo from "../../PadViwe/components/PadMapContent/AllCargo/AllCargo";
import ToolTip from "@/pages/Setting/components/ToolTip";
import {
  isShowLocation,
  isShowLocationTooltip,
  isShowPointCloud,
  isShowRoad,
  isShowRoadTooltip,
} from "@/utils/siderGloble";
import useMap from "@/api/useMap";
import {
  useLocationHoverTooltip,
  useRoadHoverTooltip,
  useWheelZoom,
} from "@/pages/Setting/hooks";
import AllConveyor from "../../PadViwe/components/PadMapContent/AllConveyor/AllConveyor";
import { AllElevator } from "../../PadViwe/components/PadMapContent/AllElevator";
import AllChargeStation from "../../PadViwe/components/PadMapContent/AllChargeStation/AllChargeStation";
import { OpenChargeStationModal } from "@/pages/Main/global/jotai";
import StatusPanel from "../../PadViwe/components/PadMapContent/AllChargeStation/StatusPanel";
import useDetectLoc from "../hooks/useDetectLoc";
import useMouseClick from "../hooks/useMouseClick";
import ScalePad from "./ScalePad";
import AllGateWaitPoint from "../../PadViwe/components/PadMapContent/AllGateWaitPoint/AllGateWaitPoint";
import AllLiftGate from "../../PadViwe/components/PadMapContent/AllGate/AllLiftGate";
import AllStack from "../../PadViwe/components/PadMapContent/AllStack/AllStack";
import AllPointCloud from "../../PadViwe/components/PadMapContent/component/AllPointCloud/AllPointCloud";
import LocalizationCorrectionGhost from "../../PadViwe/components/PadMapContent/component/LocalizationCorrection/LocalizationCorrectionGhost";
import useDragPan from "@/pages/Main/components/WebView/hooks/useDragPan";
import useCenterMap from "@/hooks/useCenterMap";

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
  const showRoadToolTip = useAtomValue(isShowRoadTooltip);
  const showPointCloud = useAtomValue(isShowPointCloud);
  const showChargeConfig = useAtomValue(OpenChargeStationModal);
  const { data, isError } = useMap();
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  // .map-view 預設吃到全域的 `.map-view { width:100%; height:100% }`(setting.css),
  // 尺寸永遠等於捲動容器, 沒辦法置中。這裡改成貼合縮放後的底圖大小,
  // transform-origin 維持 0% 0%, 所以 layout box 跟畫出來的內容完全重合,
  // 覆蓋圖層仍以 .map-view 原點(= 底圖左上角)為基準, 座標不受影響。
  useEffect(() => {
    const img = mapImageRef.current;
    if (!img) return;

    const read = () =>
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    if (img.complete && img.naturalWidth) {
      read();
      return;
    }

    img.addEventListener("load", read);
    return () => img.removeEventListener("load", read);
  }, [data?.imageUrl]);

  useDetectLoc(mapRef, mapWrapRef, mapImageRef, scale);

  useMouseClick(mapWrapRef);

  // 控制地圖拖曳
  useDragPan(mapWrapRef, mapRef, mapImageRef);

  // 控制地圖置中
  useCenterMap(mapWrapRef, mapImageRef);

  //控制滑鼠滾輪縮放
  useWheelZoom(mapWrapRef, scale);

  //控制「地點提示」/「路徑提示」開啟時，游標移動附近點位/路徑浮出 tooltip
  useLocationHoverTooltip(mapRef, mapImageRef, scale);
  useRoadHoverTooltip(mapRef, mapImageRef, scale);

  return (
    <div
      className="map-view"
      style={{
        width: natural ? natural.w * scale : undefined,
        height: natural ? natural.h * scale : undefined,
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
          {/* <AllLocation mapRef={mapRef}></AllLocation> */}
          <AllAMRs></AllAMRs>
          <LocalizationCorrectionGhost></LocalizationCorrectionGhost>
          {showPointCloud ? <AllPointCloud></AllPointCloud> : null}
          <AllCargo></AllCargo>
          <AllStack></AllStack>
          <AllElevator></AllElevator>
          <AllConveyor></AllConveyor>
          <AllGateWaitPoint></AllGateWaitPoint>
          <AllLiftGate></AllLiftGate>
          {showLocation ? <AllLocation mapRef={mapRef}></AllLocation> : null}
          {showRoad ? <AllRoads></AllRoads> : null}
          {showLocationToolTip ? <ToolTip /> : []}
          {showLocationToolTip ? <LocationHoverCluster /> : []}
          {showRoad && showRoadToolTip ? <RoadHoverCluster /> : []}
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
