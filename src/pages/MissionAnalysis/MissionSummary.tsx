import React from 'react';
import { Card, Statistic } from 'antd';
import styled from 'styled-components';

const SummaryGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`;

const MissionSummary: React.FC = () => {
  // Mock data; replace with real data via props or API call
  const total = 150;
  const today = 12;
  const active = 9;
  const completed = 110;
  const failed = 5;
  const canceled = 14;
  const avgBatteryCost = 17;
  const avgDistance = 89.2;

  return (
    <SummaryGrid>
      <Card>
        <Statistic title="Total Missions" value={total} />
      </Card>
      <Card>
        <Statistic title="Missions Today" value={today} />
      </Card>
      <Card>
        <Statistic title="Active Missions" value={active} />
      </Card>
      <Card>
        <Statistic title="Completed" value={completed} />
      </Card>
      <Card>
        <Statistic title="Aborted / Canceled" value={failed + canceled} />
      </Card>
      <Card>
        <Statistic title="Avg. Battery Cost" value={avgBatteryCost} suffix="%" />
      </Card>
      <Card>
        <Statistic title="Avg. Distance" value={avgDistance} suffix="m" precision={1} />
      </Card>
    </SummaryGrid>
  );
};

export default MissionSummary;
