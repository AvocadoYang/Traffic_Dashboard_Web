import React from "react";
import { Layout } from "antd";
import styled from "styled-components";
import WebView from "./components/WebView/WebView";
import Header from "../../components/Header";

// import CarCardWrap from './Car_Card/CardWrap'
// import MissionWrap from './Mission_Card/MissionWrap'

const MainLayout = styled(Layout)`
  height: var(--app-height);
`;

const Main: React.FC = () => {
  return (
    <MainLayout>
      <Header />
      <WebView />
    </MainLayout>
  );
};

export default Main;
