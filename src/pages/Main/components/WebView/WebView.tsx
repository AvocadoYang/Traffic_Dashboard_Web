import { ConfigProvider, Splitter } from "antd";
import { memo, useRef } from "react";
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

const { Content } = Layout;
const WebView = () => {
  const mapRef = useRef(null);
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
            style={{ position: "relative", overflow: "hidden" }}
            className={`${isDark ? "dark-mode-map" : ""}`}
          >
            <Content
              className={`map-view-wrap ${isDark ? "dark-mode-map" : ""}`}
            >
              <WebMapView mapRef={mapRef}></WebMapView>
            </Content>
            <ZoomPad></ZoomPad>
            <ScalePad></ScalePad>
            <MissionBtn></MissionBtn>
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
