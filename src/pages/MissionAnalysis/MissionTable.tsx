import React from 'react';
import { Table, Tag } from 'antd';

const statusMap = {
  0: { color: 'blue', label: 'Pending' },
  1: { color: 'orange', label: 'Assigned' },
  2: { color: 'green', label: 'Executing' },
  3: { color: 'gray', label: 'Completed' },
  4: { color: 'red', label: 'Aborting' },
  5: { color: 'default', label: 'Canceled' }
};

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id' },
  { title: 'Order', dataIndex: 'order', key: 'order' },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (status: number) => {
      const s = statusMap[status] || {};
      return <Tag color={s.color}>{s.label}</Tag>;
    }
  },
  { title: 'Priority', dataIndex: 'priority', key: 'priority' },
  { title: 'Distance', dataIndex: 'totalDistanceTraveled', key: 'distance' }
];

const data = [
  { id: '1', order: 1, status: 2, priority: 2, totalDistanceTraveled: 134.5 },
  { id: '2', order: 2, status: 3, priority: 1, totalDistanceTraveled: 88.3 }
];

const MissionTable: React.FC = () => {
  return <Table columns={columns} dataSource={data} rowKey="id" />;
};

export default MissionTable;
