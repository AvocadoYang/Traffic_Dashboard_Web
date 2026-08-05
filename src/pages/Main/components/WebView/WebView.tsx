import {
  Button,
  ConfigProvider,
  Popover,
  Segmented,
  Splitter,
  Tooltip,
} from "antd";
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
import MissionDispatchPanel from "./components/MissionDispatchPanel";
import useMap from "@/api/useMap";
import JoystickPanelWrap from "../../Car_Card/JoystickPanelWrap";
import MapSelector from "@/components/MapSelector";
import styled, { css } from "styled-components";
import { mq } from "@/styles/responsive";
import { useTranslation } from "react-i18next";

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

type BottomView = "car" | "mission" | "dispatch";

const BottomPanelSection = styled.div<{ $view: BottomView }>`
  min-height: 0;
  display: flex;
  flex-direction: column;

  ${({ $view }) =>
    $view === "car"
      ? css`
          flex: 0 0 auto;
        `
      : css`
          flex: 0 1 auto;
          max-height: 60%;
        `}

  ${mq.web} {
    display: none;
  }
`;

const BottomPanelTabs = styled.div<{ $isDark: boolean }>`
  flex: 0 0 auto;
  padding: var(--space-xs) var(--space-md);
  background: ${({ $isDark }) => ($isDark ? "#1a1a1a" : "#f5f5f5")};
  border-top: 1px solid ${({ $isDark }) => ($isDark ? "#333" : "#d9d9d9")};
`;

const BottomPanelBody = styled.div<{ $view: BottomView }>`
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: ${({ $view }) => ($view === "car" ? "auto" : "hidden")};
  overflow-y: ${({ $view }) => ($view === "car" ? "hidden" : "auto")};
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.28) transparent;

  &::-webkit-scrollbar {
    width: 8px;
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

  ${({ $view }) =>
    $view === "car" &&
    css`
      && > * > .ant-flex {
        flex-wrap: nowrap;
        justify-content: flex-start;
      }
    `}
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
  const { t } = useTranslation();
  const [bottomView, setBottomView] = useState<BottomView>("car");

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
            Segmented: {
              trackBg: `${isDark ? "#0a0a0a" : "#ffffff"}`,
              itemColor: `${isDark ? "#8c8c8c" : "#595959"}`,
              itemHoverColor: `${isDark ? "#00ff41" : "#262626"}`,
              itemHoverBg: `${isDark ? "#262626" : "rgba(0,0,0,0.04)"}`,
              itemSelectedBg: `${isDark ? "#262626" : "#e6f4ff"}`,
              itemSelectedColor: `${isDark ? "#00ff41" : "#1890ff"}`,
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

              <BottomPanelSection $view={bottomView}>
                <BottomPanelTabs $isDark={isDark}>
                  <Segmented<BottomView>
                    block
                    value={bottomView}
                    onChange={setBottomView}
                    options={[
                      {
                        label: t("toolbar.amr_setting.robot"),
                        value: "car",
                      },
                      { label: t("utils.missions"), value: "mission" },
                      {
                        label: t("main.card_name.mission"),
                        value: "dispatch",
                      },
                    ]}
                  />
                </BottomPanelTabs>
                <BottomPanelBody $view={bottomView}>
                  {bottomView === "car" && <CarCardWrap></CarCardWrap>}
                  {bottomView === "mission" && <MissionWrap></MissionWrap>}
                  {bottomView === "dispatch" && (
                    <MissionDispatchPanel></MissionDispatchPanel>
                  )}
                </BottomPanelBody>
              </BottomPanelSection>

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
