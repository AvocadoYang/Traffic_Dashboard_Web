import { AlertOutlined, SafetyOutlined, ExperimentOutlined, HeatMapOutlined } from "@ant-design/icons";
import { Button, Card, Space, Table } from "antd";
import { useState } from "react";
import styled from "styled-components";

const GlassCard = styled(Card)`
  backdrop-filter: blur(12px);
  background-color: rgba(255, 255, 255, 0.25) !important;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  width: 100%;
  
`;

const ScrollableTableWrapper = styled.div`
  height: 95%;
  overflow-y: auto;
`;


const MiddleContext = styled.div`
  max-width: 8em;
  background-color: #ffa;

`;

const allRecords = [
    { key: "1", type: "安全帽", time: "2025-07-22 09:10", location: "A1", event: "未戴安全帽" },
    { key: "2", type: "氣體", time: "2025-07-22 09:20", location: "B3", event: "CO2 過高" },
    { key: "3", type: "熱源", time: "2025-07-22 09:25", location: "C2", event: "熱源異常" },
    { key: "4", type: "安全帽", time: "2025-07-22 09:28", location: "A2", event: "未戴安全帽" },
    { key: "5", type: "氣體", time: "2025-07-22 09:30", location: "B1", event: "VOC 濃度異常" },
    { key: "6", type: "氣體", time: "2025-07-22 09:32", location: "B2", event: "H2S 濃度異常" },
    { key: "7", type: "熱源", time: "2025-07-22 09:33", location: "C3", event: "熱源異常" },
    { key: "8", type: "安全帽", time: "2025-07-22 09:34", location: "A3", event: "未戴安全帽" },
    { key: "9", type: "氣體", time: "2025-07-22 09:35", location: "B3", event: "CO2 過高" },
    { key: "10", type: "熱源", time: "2025-07-22 09:36", location: "C4", event: "熱源異常" },
    { key: "9", type: "安全帽", time: "2025-07-22 09:34", location: "A3", event: "未戴安全帽" },
    { key: "10", type: "安全帽", time: "2025-07-22 09:34", location: "A3", event: "未戴安全帽" },
    { key: "11", type: "安全帽", time: "2025-07-22 09:34", location: "A3", event: "未戴安全帽" },
    { key: "12", type: "安全帽", time: "2025-07-22 09:34", location: "A3", event: "未戴安全帽" },
    { key: "13", type: "安全帽", time: "2025-07-22 09:34", location: "A3", event: "未戴安全帽" },
    { key: "14", type: "安全帽", time: "2025-07-22 09:34", location: "A3", event: "未戴安全帽" },
    { key: "15", type: "安全帽", time: "2025-07-22 09:34", location: "A3", event: "未戴安全帽" },
    { key: "16", type: "安全帽", time: "2025-07-22 09:34", location: "A3", event: "未戴安全帽" },
    { key: "17", type: "安全帽", time: "2025-07-22 09:34", location: "A3", event: "未戴安全帽" },
    { key: "18", type: "安全帽", time: "2025-07-22 09:34", location: "A3", event: "未戴安全帽" },
    { key: "19", type: "安全帽", time: "2025-07-22 09:34", location: "A3", event: "未戴安全帽" },
    { key: "20", type: "安全帽", time: "2025-07-22 09:34", location: "A3", event: "未戴安全帽" },
    { key: "21", type: "安全帽", time: "2025-07-22 09:34", location: "A3", event: "未戴安全帽" },
    { key: "22", type: "安全帽", time: "2025-07-22 09:34", location: "A3", event: "未戴安全帽" },
    { key: "23", type: "安全帽", time: "2025-07-22 09:34", location: "A3", event: "未戴安全帽" },
    { key: "24", type: "安全帽", time: "2025-07-22 09:34", location: "A3", event: "未戴安全帽" },
    { key: "25", type: "安全帽", time: "2025-07-22 09:34", location: "A3", event: "未戴安全帽" },
    { key: "26", type: "安全帽", time: "2025-07-22 09:34", location: "A3", event: "未戴安全帽" },
    { key: "27", type: "安全帽", time: "2025-07-22 09:34", location: "A3", event: "未戴安全帽" },
    { key: "28", type: "安全帽", time: "2025-07-22 09:34", location: "A3", event: "未戴安全帽" },
  ];


const columns = [
    { title: "時間", dataIndex: "time", key: "time", width: 150   },
    { title: "地點", dataIndex: "location", key: "location",width: 150 },
    { title: "事件", dataIndex: "event", key: "event" },
  ];
  

const EventTable = () => {
    const [filterType, setFilterType] = useState("全部");
    const filteredData = filterType === "全部" ? allRecords : allRecords.filter(item => item.type === filterType);
    return (
      <div style={{ width: "100%", height: "75%", padding: "10px"}}>

        <Space wrap size={"small"}>
            <Button icon={<AlertOutlined />} onClick={() => setFilterType("全部")}>全部</Button>
            <Button icon={<SafetyOutlined />} onClick={() => setFilterType("安全帽")}>安全帽</Button>
            <Button icon={<ExperimentOutlined />} onClick={() => setFilterType("氣體")}>氣體</Button>
            <Button icon={<HeatMapOutlined />} onClick={() => setFilterType("熱源")}>熱源</Button>
        </Space>
          <ScrollableTableWrapper>
            <Table
              style={{ marginTop: 16 }}
              columns={columns}
              dataSource={filteredData}
              pagination={false}
              size="small"
            />
          </ScrollableTableWrapper>
        </div>
    )
      
    
}

export default EventTable