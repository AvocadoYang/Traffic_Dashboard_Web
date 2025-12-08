import { Button, ConfigProvider, Popover, Splitter, Tooltip } from "antd";
import { memo, useRef, useState } from "react";
import { Layout } from "antd";
import "./webview.css";
import ZoomPad from "./components/ZoomPad";
import ScalePad from "./components/ScalePad";
import WebMapView from "./components/WebMapView";
import { useAtomValue } from "jotai";
import CarCardWrap from "../../Car_Card/CardWrap";
import { darkMode } from "@/utils/gloable";
import MissionWrap from "../../Mission_Card/MissionWrap";
import MissionBtn from "./components/MissionBtn";
import CorningTest from "./components/CorningTest";
import ElevatorIO from "./components/ElevatorIO";
import TestBarcode from "./components/TestBarcode";
import ECS_online from "./components/ECS_online";
import DirectMove from "../missionModal/DirectMove";

const { Content } = Layout;
const WebView = () => {
  const mapRef = useRef(null);
  const mapWrapRef = useRef(null);
  const isDark = useAtomValue(darkMode);

  return (
    <Content style={{ width: "100%", overflow: "hidden" }}>
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
          <Splitter.Panel
            defaultSize="13%"
            collapsible={true}
            className={`${isDark ? "dark-mode-side" : ""}`}
            style={{ overflow: "hidden" }}
          >
            <CarCardWrap></CarCardWrap>
          </Splitter.Panel>
          <Splitter.Panel
            defaultSize="67%"
            style={{overflow: "hidden", backgroundColor: "#e6e6e7" }}
            className={`${isDark ? "dark-mode-map" : ""}`}
          >
          <div
              style={{
                height: "100%",
                width: "100%",
                overflow: "scroll",
                borderRadius: "6px",
                borderLeft: "2px solid #9b9b9b",
                borderRight: "2px solid #9b9b9b"
              }}
              draggable={false}
              ref={mapWrapRef}
            >
              <WebMapView mapRef={mapRef} mapWrapRef={mapWrapRef}></WebMapView>
            <div style={{  
              height: "100%",
              width: "100%",
            
            }}>
            <ZoomPad></ZoomPad>
            <ScalePad></ScalePad>
            {/* <MissionBtn></MissionBtn> */}
            <DirectMove></DirectMove>
            <ECS_online />
            {/* <ElevatorIO />
            <CorningTest></CorningTest>
            <TestBarcode /> */}
            </div>
            </div>
          </Splitter.Panel>
          <Splitter.Panel
            defaultSize="20%"
            collapsible={true}
            className={`${isDark ? "dark-mode-side" : ""}`}
          >
            <MissionWrap></MissionWrap>
          </Splitter.Panel>
        </Splitter>
      </ConfigProvider>
    </Content>
  );
};

export default memo(WebView);
