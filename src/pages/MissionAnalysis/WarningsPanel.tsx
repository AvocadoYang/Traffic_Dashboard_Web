import React from 'react';
import { Card, List } from 'antd';

const warnings = [
  { id: 1, message: 'Low battery on AMR_001' },
  { id: 2, message: 'Emergency button triggered on AMR_003' }
];

const WarningsPanel: React.FC = () => {
  return (
    <Card title="Warnings">
      <List dataSource={warnings} renderItem={(item) => <List.Item>{item.message}</List.Item>} />
    </Card>
  );
};

export default WarningsPanel;
