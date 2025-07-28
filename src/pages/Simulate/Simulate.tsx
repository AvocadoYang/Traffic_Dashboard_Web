import { Layout } from "antd";
import { Content } from "antd/es/layout/layout";
import MapView from "./mapComponents/MapView";
import { FC, useRef } from "react";
import ZoomPad from "./components/ZoomPad";
import MapTitle from "./mapComponents/components/MapTitle";
import IdleRobotPanel from "./components/AMR/IdleRobotPanel";
import SelectScript from "./components/SelectScript";
import WcsPad from "./components/WCS/WcsPad";
import Header from "../../components/Header";
import { useIsMobile } from "../../hooks/useIsMoblie";
import Timeline from "./components/Timeline/Timeline";
import SwitchPanelHeightBtn from "./components/Timeline/SwitchPanelHeightBtn";

const Simulate: FC = () => {
  const { isMobile } = useIsMobile();
  const mapRef = useRef(null);
  const mapWrapRef = useRef(null);

  return (
    <Layout style={{ height: `${isMobile ? "100dvh" : "100%"}` }}>
      <Header isMobile={isMobile} />
      <Content>
        <Layout style={{ height: "100%", width: "100%" }}>
          <div
            style={{
              height: "100%",
              width: "100%",
              overflow: "scroll",
            }}
            draggable={false}
            ref={mapWrapRef}
          >
            <MapView mapRef={mapRef} mapWrapRef={mapWrapRef} />
          </div>

          {/* 選取模擬的名稱會漂浮在地圖右上 */}
          <MapTitle isMobile />

          {/* 左上圓形 切換腳本  */}
          <SelectScript />
          <WcsPad />

          <SwitchPanelHeightBtn />

          {/* 左側未放置到地圖的車輛表 */}
          <IdleRobotPanel mapRef={mapRef} mapWrapRef={mapWrapRef} />
          <ZoomPad></ZoomPad>

          <Timeline />
        </Layout>
      </Content>
    </Layout>
  );
};

export default Simulate;
