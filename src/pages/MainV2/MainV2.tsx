import React from "react";
import { Layout } from "antd";
import styled from "styled-components";
import Header from "@/components/Header";
import WebViewV2 from "./WebViewV2";

const MainLayout = styled(Layout)`
  height: var(--app-height);
`;

/** 首頁 (/), 畫布地圖版本; 舊首頁 (DOM 地圖) 留在 /main-v1 */
const MainV2: React.FC = () => {
  return (
    <MainLayout>
      <Header />
      <WebViewV2 />
    </MainLayout>
  );
};

export default MainV2;
