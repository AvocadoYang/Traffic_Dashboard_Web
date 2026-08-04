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
import { mq } from "@/styles/responsive";

const { Content } = Layout;

const WebViewContent = styled(Content)`
  width: 100%;
  overflow: hidden;
`;

const MapSplitter = styled(Splitter)`
  > .ant-splitter-panel:first-child,
  > .ant-splitter-panel:last-child,
  > .ant-splitter-bar {
    display: none;
  }

  > .ant-splitter-panel:not(:first-child):not(:last-child) {
    min-width: 100%;
  }

  > .ant-splitter-panel {
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  ${mq.web} {
    > .ant-splitter-panel:first-child,
    > .ant-splitter-panel:last-child {
      display: block;
    }

    > .ant-splitter-bar {
      display: flex;
    }

    > .ant-splitter-panel:not(:first-child):not(:last-child) {
      min-width: auto;
    }
  }
`;

const SidePanelInner = styled.div`
  height: 100%;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const MapPanelInner = styled.div`
  position: relative;
  height: 100%;
  overflow: hidden;
  background-color: #e6e6e7;
  display: flex;
  flex-direction: column;
`;

const MapScrollArea = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  overflow: scroll;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const CarCardSection = styled.div`
  flex: 0 0 30%;
  min-height: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.28) transparent;

  &::-webkit-scrollbar {
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.06);
    border-radius: 999px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.28);
    border-radius: 999px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.45);
  }

  && > * {
    min-height: 0;
    padding: var(--space-sm) var(--space-md);
  }

  && .ant-flex {
    flex-wrap: nowrap;
    justify-content: flex-start;
  }

  ${mq.web} {
    display: none;
  }
`;

const MapOverlay = styled.div`
  height: 100%;
  width: 100%;
`;

const MapSelectorSlot = styled.div`
  position: absolute;
  top: var(--space-sm);
  right: var(--space-sm);
  z-index: 20;
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
        <MapSplitter>
          <Splitter.Panel
            defaultSize="13%"
            collapsible={true}
            className={`${isDark ? "dark-mode-side" : ""}`}
          >
            <SidePanelInner>
              <CarCardWrap></CarCardWrap>
            </SidePanelInner>
          </Splitter.Panel>
          <Splitter.Panel
            defaultSize="67%"
            className={`${isDark ? "dark-mode-map" : ""}`}
          >
            <MapPanelInner>
              <MapScrollArea draggable={false} ref={mapWrapRef}>
                <WebMapView
                  mapRef={mapRef}
                  mapWrapRef={mapWrapRef}
                ></WebMapView>
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

              <CarCardSection>
                <CarCardWrap></CarCardWrap>
              </CarCardSection>

              <MapSelectorSlot>
                <MapSelector />
              </MapSelectorSlot>
            </MapPanelInner>
          </Splitter.Panel>
          <Splitter.Panel
            defaultSize="20%"
            collapsible={true}
            className={`${isDark ? "dark-mode-side" : ""}`}
          >
            <SidePanelInner>
              <MissionWrap></MissionWrap>
            </SidePanelInner>
          </Splitter.Panel>
        </MapSplitter>
        <JoystickPanelWrap />
      </ConfigProvider>
    </WebViewContent>
  );
};

export default memo(WebView);
