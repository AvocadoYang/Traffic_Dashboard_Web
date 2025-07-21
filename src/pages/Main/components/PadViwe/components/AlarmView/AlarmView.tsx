import { Space } from 'antd';
import { memo, useState } from 'react';
import { MutedOutlined, FileOutlined } from '@ant-design/icons';

const AlarmView = () => {
  const [display, setDisplay] = useState(0);
  return (
    <Space style={{ margin: '10px 0 10px 0' }}>
      <Space
        onClick={() => setDisplay(0)}
        className={display == 0 ? 'alarm-wrap' : ''}
        style={{ cursor: 'pointer' }}
      >
        <MutedOutlined className={display == 0 ? 'alarm-icon' : ''} />
        <p className={display == 0 ? 'alarm-text' : ''}>123</p>
      </Space>
      /
      <Space
        onClick={() => setDisplay(1)}
        className={display == 1 ? 'error-list-wrap' : ''}
        style={{ cursor: 'pointer' }}
      >
        <FileOutlined className={display == 1 ? 'error-list-icon' : ''} />
        <p className={display == 1 ? 'error-list-text' : ''}>234</p>
      </Space>
    </Space>
  );
};

export default memo(AlarmView);
