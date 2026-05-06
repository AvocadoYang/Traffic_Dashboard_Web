import React from "react";
import styled from "styled-components";
import './style.css'
import {
  Layout,
  Tabs,
} from "antd";
import PageHeader from "./components/Header";
import {
  VideoCameraOutlined,
} from "@ant-design/icons";

import "react-circular-progressbar/dist/styles.css";
import { TabOne } from "./components";
import { useIsMobile } from "@/hooks/useIsMoblie";
const { Content } = Layout;
const { TabPane } = Tabs;

const PageWrapper = styled(Layout)`
 background-color: #f9f9f9;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const Section = styled.div`
  padding: 0px 24px 0px 24px;
  height: 100% !important;
`;



const MonitorCenter: React.FC = () => {

  return (
      <PageWrapper>
        <PageHeader></PageHeader>
      <Content style={{ padding: '0px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        
          <Tabs defaultActiveKey="1">
            <TabPane tab={<span><VideoCameraOutlined /> 即時資訊</span>} key="1" style={{ }}>
                <TabOne></TabOne>
            </TabPane>
            
            <TabPane tab={<span><VideoCameraOutlined /> 歷史紀錄</span>} key="2">
               <div>123</div>
            </TabPane>
          </Tabs>
        
      
      </Content>
    </PageWrapper>
  );
}

export default MonitorCenter