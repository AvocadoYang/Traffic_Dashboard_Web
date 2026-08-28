import { useEffect, useRef } from "react";
import { useAtom, useSetAtom } from "jotai";
import styled from "styled-components";
import WebMapView from "@/pages/Main/components/WebView/components/WebMapView";
import ZoomPad from "@/pages/Main/components/WebView/components/ZoomPad";
import MapSelector from "@/components/MapSelector";
import useMap from "@/api/useMap";
import { AmrFilterCarCard, Scale } from "@/utils/gloable";

const MapPanelInner = styled.div`
  position: relative;
  height: 480px;
  overflow: hidden;
  background-color: #e6e6e7;
  border: 1px solid #d9d9d9;
`;

const MapScrollArea = styled.div`
  height: 100%;
  width: 100%;
  overflow: scroll;
  display: flex;

  > .map-view {
    flex: none;
    margin: auto;
  }

  > .map-view > img {
    display: block;
  }
`;

const MapSelectorSlot = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 20;
`;

// 直接複用主頁面的完整互動地圖(WebMapView),讓使用者能在 AMR 詳細頁看到這台車
// 目前在地圖上的實際位置、點位與路徑——跟主頁一樣會顯示所有車輛。
// Scale/centerMap/AmrFilterCarCard 都是全域 atom,跟主頁共用同一份狀態,
// 所以離開這頁不會殘留「只顯示這台車」的篩選,離開時會把自己從高亮清單移除。
const AmrLiveMap: React.FC<{ amrId: string }> = ({ amrId }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const { data } = useMap();
  const setScale = useSetAtom(Scale);
  const [, setHintAmrId] = useAtom(AmrFilterCarCard);

  const mapScale = data?.scale;
  useEffect(() => {
    if (mapScale === undefined) return;
    setScale(mapScale);
  }, [mapScale, setScale]);

  useEffect(() => {
    setHintAmrId((prev) => new Set(prev).add(amrId));
    return () => {
      setHintAmrId((prev) => {
        if (!prev.has(amrId)) return prev;
        const next = new Set(prev);
        next.delete(amrId);
        return next;
      });
    };
  }, [amrId, setHintAmrId]);

  return (
    <MapPanelInner>
      <MapScrollArea draggable={false} ref={mapWrapRef}>
        <WebMapView mapRef={mapRef} mapWrapRef={mapWrapRef} />
      </MapScrollArea>
      <ZoomPad />
      <MapSelectorSlot>
        <MapSelector />
      </MapSelectorSlot>
    </MapPanelInner>
  );
};

export default AmrLiveMap;
