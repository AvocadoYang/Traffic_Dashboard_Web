import React from "react";
import { Card, Progress, Space, Typography } from "antd";
import styled from "styled-components";

const { Text } = Typography;

const AMRGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
`;

interface AMRInfo {
  id: string;
  battery: number;
  totalDistanceTraveled: number;
  batteryCost: number;
}

const amrs: AMRInfo[] = [
  { id: "AMR_001", battery: 78, totalDistanceTraveled: 104.5, batteryCost: 12 },
  { id: "AMR_002", battery: 45, totalDistanceTraveled: 67.3, batteryCost: 20 },
];

const AMRPerformance: React.FC = () => {
  return (
    <AMRGrid>
      {amrs.map((amr) => (
        <Card key={amr.id} title={amr.id}>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div>
              <Text strong>Battery Level</Text>
              <Progress percent={amr.battery} status="active" />
            </div>

            <div>
              <Text strong>Today’s Distance</Text>
              <div>{amr.totalDistanceTraveled} meters</div>
            </div>

            <div>
              <Text strong>Battery Cost Today</Text>
              <div>{amr.batteryCost}%</div>
            </div>
          </Space>
        </Card>
      ))}
    </AMRGrid>
  );
};

export default AMRPerformance;
