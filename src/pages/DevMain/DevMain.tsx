import React from "react";
import { Layout } from "antd";
import styled from "styled-components";

import Header from "../../components/Header";
import WebView from "./components/WebView/WebView";
import PadContent from "./components/PadViwe/components/PadContent";

// import { Scene } from './3D'
// import CarCardWrap from './Car_Card/CardWrap'
// import MissionWrap from './Mission_Card/MissionWrap'

const MainLayout = styled(Layout)`
  height: var(--app-height);
`;

const DevMain: React.FC = () => {
  return (
    <MainLayout>
      <Header />
      <WebView />
    </MainLayout>
  );
};

export default DevMain;
