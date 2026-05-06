import React from "react";
import { Layout } from "antd";
import CommonTabs from "@/components/Common/Tab";
import CarCardWrap from "@/components/Main/Car/CardWrap";
import MissionWrap from "@/pages/Main/Mission_Card/MissionWrap";
import WebView from "./components/WebView/WebView";
import "./components/PadViwe/style.css";
// import PadView from "./components/PadViwe/PadView";
import { useIsMobile } from "@/hooks/useIsMoblie";


const items = [
  {
    key: '1',
    label: '車子資訊',
    children: <CarCardWrap />,
  },
  {
    key: '2',
    label: '任務資訊',
    children: <MissionWrap />,
  },
]

const Main: React.FC = () => {
  const { isDesktop } = useIsMobile();

  return (
    <Layout style={{ height: isDesktop ? "100%" : "100dvh" }}>
      {isDesktop ? (
        <WebView />
      ) : (
        <Layout style={{ height: "100%" }}>
          <CommonTabs items={items} />
        </Layout>
      )}
    </Layout>
  );
};

export default Main;