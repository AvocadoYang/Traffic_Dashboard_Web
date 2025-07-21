import React from 'react';
import { Card } from 'antd';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import styled from 'styled-components';

const ChartWrapper = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
`;

const statusData = [
  { name: 'Pending', value: 10 },
  { name: 'Assigned', value: 15 },
  { name: 'Executing', value: 8 },
  { name: 'Completed', value: 40 },
  { name: 'Aborting', value: 2 },
  { name: 'Canceled', value: 5 }
];

const COLORS = ['#108ee9', '#fa8c16', '#52c41a', '#13c2c2', '#f5222d', '#d9d9d9'];

const ChartsOverview: React.FC = () => {
  return (
    <ChartWrapper>
      <Card title="Mission Status Distribution">
        <PieChart width={300} height={300}>
          <Pie
            data={statusData}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label
          >
            {statusData.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </Card>
    </ChartWrapper>
  );
};

export default ChartsOverview;
