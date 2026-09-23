import { memo, RefObject, useEffect, useRef, useState } from "react";
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
import { AllElevator } from "./components/AllElevator";
import AllChargeStation from "./components/AllChargeStation/AllChargeStation";
import AllGateWaitPoint from "./components/AllGateWaitPoint/AllGateWaitPoint";
import AllLiftGate from "./components/AllGate/AllLiftGate";
import useWheelZoom from "@/pages/Setting/hooks/useWheelZoom";
import useDragPan from "@/pages/Main/components/WebView/hooks/useDragPan";
import useCenterMap from "@/hooks/useCenterMap";
import useMap from "@/api/useMap";

const MapView: React.FC<{
  mapRef: RefObject<HTMLDivElement>;
  mapWrapRef: RefObject<HTMLDivElement>;
}> = ({ mapRef, mapWrapRef }) => {
  const showLocationToolTip = useAtomValue(isShowLocationTooltip);
  const showRoad = useAtomValue(isShowRoad);
  const mapImageRef = useRef<HTMLImageElement>(null);
  const scale = useAtomValue(globalScale);
  const { data: map } = useMap();
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  // MapImage 在 useMap 還在載入時渲染的是 <Spin>, 掛載當下 mapImageRef 還是
  // null, 所以這個 effect 必須跟著底圖網址重跑, 否則永遠量不到尺寸。
  //
  // .map-view 從 setting.css 吃到 `width:100%; height:100%`, 尺寸永遠等於捲動
  // 容器 —— transform 不影響 layout, 所以放大後多出來的部分捲不到, 拖曳跟滾輪
  // 縮放都會像卡住。改成貼合縮放後的底圖大小, 捲動範圍才跟畫出來的內容一致。
  // transform-origin 維持 0% 0%, 覆蓋圖層仍以底圖左上角為原點, 座標換算不受影響。
  useEffect(() => {
    const img = mapImageRef.current;
    if (!img) return;

    const read = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    if (img.complete && img.naturalWidth) {
      read();
      return;
    }

    img.addEventListener("load", read);
    return () => img.removeEventListener("load", read);
  }, [map?.imageUrl]);

  // 左鍵拖曳平移 (只從底圖或空白處啟動, 不會蓋掉車輛/點位的拖放)
  useDragPan(mapWrapRef, mapRef, mapImageRef);

  // 滾輪縮放, 以游標為中心
  useWheelZoom(mapWrapRef, scale, globalScale);

  // 工具列的「地圖置中」按鈕, 以及進站時的初始視角
  useCenterMap(mapWrapRef, mapImageRef);

  return (
    <div
      style={{
        width: natural ? natural.w * scale : undefined,
        height: natural ? natural.h * scale : undefined,
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
      <AllGateWaitPoint></AllGateWaitPoint>
      <AllLiftGate></AllLiftGate>
      {showLocationToolTip ? <ToolTip /> : []}

      {/* 一開始創建新的模擬任務的modal 必須填完才能使用 */}
      <CreateScriptForm />
    </div>
  );
};

export default memo(MapView);
