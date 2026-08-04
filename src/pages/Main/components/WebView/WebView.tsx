import { Button, ConfigProvider, Popover, Splitter, Tooltip } from "antd";
import { memo, useEffect, useRef, useState } from "react";
import { Layout } from "antd";
import "./webview.css";
import ZoomPad from "./components/ZoomPad";
import ScalePad from "./components/ScalePad";
import WebMapView from "./components/WebMapView";
import { useAtomValue, useSetAtom } from "jotai";
import CarCardWrap from "../../Car_Card/CardWrap";
import { centerMap, darkMode, Scale } from "@/utils/gloable";
import MissionWrap from "../../Mission_Card/MissionWrap";
import MissionBtn from "./components/MissionBtn";
import CorningTest from "./components/CorningTest";
import ElevatorIO from "./components/ElevatorIO";
import TestBarcode from "./components/TestBarcode";
import ECS_online from "./components/ECS_online";
import DirectMove from "../missionModal/DirectMove";
import useMap from "@/api/useMap";
import JoystickPanelWrap from "../../Car_Card/JoystickPanelWrap";
import MapSelector from "@/components/MapSelector";
import styled from "styled-components";

const { Content } = Layout;

const WebViewContent = styled(Content)`
  width: 100%;
  overflow: hidden;
`;

const SidePanel = styled(Splitter.Panel)`
  overflow: hidden;
`;

const MapPanel = styled(Splitter.Panel)`
  overflow: hidden;
  background-color: #e6e6e7;
  position: relative;
`;

const MapSelectorSlot = styled.div`
  position: absolute;
  top: var(--space-sm);
  right: var(--space-sm);
  z-index: 20;
`;

const MapScrollArea = styled.div`
  height: 100%;
  width: 100%;
  overflow: scroll;
`;

const MapOverlay = styled.div`
  height: 100%;
  width: 100%;
`;

const WebView = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const isDark = useAtomValue(darkMode);
  const currentMapInfo = useMap();
  const setScale = useSetAtom(Scale);
  const cm = useAtomValue(centerMap);

  useEffect(() => {
    // 1. 提早 return 確保邏輯乾淨
    if (!mapWrapRef.current || !currentMapInfo?.data) return;

    const { scrollX, scrollY, scale } = currentMapInfo.data;

    // 2. 先將 Ref 存入局部變數，解決 setTimeout 內的 null 檢查問題
    const container = mapWrapRef.current;

    const timer = setTimeout(() => {
      // 3. 使用條件判斷或非空斷言確保數值存在
      if (scrollX !== undefined) container.scrollLeft = scrollX;
      if (scrollY !== undefined) container.scrollTop = scrollY;
      if (scale !== undefined) {
        setScale(scale);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [currentMapInfo, cm]); // 注意：如果 currentMapInfo 是非同步取得，依賴項應包含它

  return (
    <WebViewContent>
      <ConfigProvider
        theme={{
          components: {
            Splitter: {
              colorFill: `${isDark ? "#ff8800" : "rgba(0,0,0,0.15)"}`,
              controlItemBgActiveHover: `${isDark ? "#ffa00a" : "#bae0ff"}`,
              controlItemBgHover: `${isDark ? "#262626" : "rgba(0,0,0,0.04)"}`,
            },
          },
        }}
      >
        <Splitter>
          <SidePanel
            defaultSize="13%"
            collapsible={true}
            className={`${isDark ? "dark-mode-side" : ""}`}
          >
            <CarCardWrap></CarCardWrap>
          </SidePanel>
          <MapPanel
            defaultSize="67%"
            className={`${isDark ? "dark-mode-map" : ""}`}
          >
            <MapSelectorSlot>
              <MapSelector />
            </MapSelectorSlot>
            <MapScrollArea draggable={false} ref={mapWrapRef}>
              <WebMapView mapRef={mapRef} mapWrapRef={mapWrapRef}></WebMapView>
              <MapOverlay>
                <ZoomPad></ZoomPad>
                {/* <MissionBtn></MissionBtn> */}
                <DirectMove></DirectMove>
                {/* <ECS_online />
            <ElevatorIO />
            <CorningTest></CorningTest>
            <TestBarcode /> */}
              </MapOverlay>
            </MapScrollArea>
          </MapPanel>
          <SidePanel
            defaultSize="20%"
            collapsible={true}
            className={`${isDark ? "dark-mode-side" : ""}`}
          >
            <MissionWrap></MissionWrap>
          </SidePanel>
        </Splitter>
        <JoystickPanelWrap />
      </ConfigProvider>
    </WebViewContent>
  );
};

export default memo(WebView);
