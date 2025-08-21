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
import TableSchedule from "./components/Timeline/TableView/TableSchedule";
import OpenScheduleTableBtn from "./components/Timeline/OpenScheduleTableBtn";
import InsertModal from "./components/Timeline/InsertModal";
import { ShiftCargoModal } from "./components/Timeline/ShiftCargoModal";
import { SpawnCargoModal } from "./components/Timeline/SpawnCargoModal";
import InsertFixMissionModal from "./components/Timeline/InsertFixMissionModal";
import InsertRangeGroupSpawnCargoModal from "./components/Timeline/InsertRangeGroupSpawnCargoModal";
import InsertRangeGroupShiftCargoModal from "./components/Timeline/InsertRangeGroupShiftCargoModal";

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

          {/**試定區域生成貨物 */}
          <InsertRangeGroupSpawnCargoModal />

          {/**試定區域轉移貨物 */}
          <InsertRangeGroupShiftCargoModal />

          {/**設並固定range的區域隨機任務 */}
          <InsertFixMissionModal />

          {/**編輯或是新增任務的modal */}
          <InsertModal />

          {/**時間軸插入生成或是轉移貨物 */}
          <ShiftCargoModal />

          {/**時間軸插入生成或是轉移貨物 */}
          <SpawnCargoModal />

          {/**時間軸改變高度 */}
          <SwitchPanelHeightBtn />

          <OpenScheduleTableBtn />

          {/* 時間軸任務用table表示 */}
          <TableSchedule></TableSchedule>

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
