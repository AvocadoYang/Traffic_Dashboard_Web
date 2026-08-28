import { DispatchWidget } from "@/api/useMissionDispatchBoard";
import useMap from "@/api/useMap";
import MapSelector from "@/components/MapSelector";
import WebMapView from "@/pages/Main/components/WebView/components/WebMapView";
import ZoomPad from "@/pages/Main/components/WebView/components/ZoomPad";
import { Scale } from "@/utils/gloable";
import { useSetAtom } from "jotai";
import React, { FC, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import DispatchItemFrame from "./DispatchItemFrame";
import {
  MAX_MAP_WIDGET_SIZE,
  MIN_WIDGET_HEIGHT,
  MIN_WIDGET_WIDTH,
} from "./gridConstants";

const Card = styled.div<{ $width: number; $height: number }>`
  width: ${({ $width }) => $width}px;
  height: ${({ $height }) => $height}px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #f0f0f0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
`;

const TitleBar = styled.div`
  padding: 8px 12px;
  font-weight: 600;
  font-size: 13px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const MapPanelInner = styled.div`
  position: relative;
  flex: 1;
  overflow: hidden;
  background-color: #e6e6e7;
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
  z-index: 4;
`;

// 直接複用主頁面的 WebMapView,跟主頁/AMR詳細頁共用同一份 Scale/地圖選擇等全域 atom,
// 所以縮放/切換樓層會跟其他地圖畫面同步,不是每個小卡片各自獨立的視角。
const MapViewWidgetCard: FC<{
  widget: DispatchWidget;
  editMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onResizeEnd: (width: number, height: number) => void;
}> = ({ widget, editMode, onEdit, onDelete, onResizeEnd }) => {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const { data } = useMap();
  const setScale = useSetAtom(Scale);

  const mapScale = data?.scale;
  useEffect(() => {
    if (mapScale === undefined) return;
    setScale(mapScale);
  }, [mapScale, setScale]);

  return (
    <DispatchItemFrame
      id={widget.id}
      x={widget.x}
      y={widget.y}
      width={widget.width}
      height={widget.height}
      editMode={editMode}
      minWidth={MIN_WIDGET_WIDTH}
      maxWidth={MAX_MAP_WIDGET_SIZE}
      minHeight={MIN_WIDGET_HEIGHT}
      maxHeight={MAX_MAP_WIDGET_SIZE}
      onEdit={onEdit}
      onDelete={onDelete}
      onResizeEnd={onResizeEnd}
    >
      {({ width, height }) => (
        <Card $width={width} $height={height}>
          <TitleBar>
            {widget.title || t("mission_dispatch_board.map_view_widget")}
          </TitleBar>
          <MapPanelInner>
            <MapScrollArea draggable={false} ref={mapWrapRef}>
              <WebMapView mapRef={mapRef} mapWrapRef={mapWrapRef} />
            </MapScrollArea>
            <ZoomPad />
            <MapSelectorSlot>
              <MapSelector />
            </MapSelectorSlot>
          </MapPanelInner>
        </Card>
      )}
    </DispatchItemFrame>
  );
};

export default MapViewWidgetCard;
