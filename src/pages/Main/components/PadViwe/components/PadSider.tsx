import { Layout, Menu, MenuProps, theme, Badge } from 'antd';
import {
  ScheduleOutlined,
  GlobalOutlined,
  InsertRowAboveOutlined,
  AlertOutlined
} from '@ant-design/icons';
import { useState } from 'react';
import { viewBtn } from '@/pages/Main/global/jotai';
import { useAtom } from 'jotai';
import '../style.css';
import { ViewBtn } from '@/pages/Main/global/jotai';
import { useTranslation } from 'react-i18next';

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  onClick?: () => void, // 新增 onClick 參數
  children?: MenuItem[],
  type?: 'group'
): MenuItem {
  return {
    key,
    icon,
    children,
    onClick,
    label,
    type
  } as MenuItem;
}

const { Sider } = Layout;

const PadSider = () => {
  const [collapsed, setCollapsed] = useState(true);
  const { t } = useTranslation();
  const [_, setOpenEditLocationPanel] = useAtom(viewBtn);
  const {
    token: { colorBgContainer }
  } = theme.useToken();

  const handleViewChange = (itemType: number) => {
    setOpenEditLocationPanel(itemType);
  };

  const viewItem: MenuItem[] = [
    getItem(t('main.pad_view.sider.map_view'), '1', <GlobalOutlined className="map-icon" />, () =>
      handleViewChange(ViewBtn.mapView)
    ),
    getItem(
      t('main.pad_view.sider.mission_view'),
      '2',
      <ScheduleOutlined className="mission-icon" />,
      () => {
        handleViewChange(ViewBtn.missionView);
      }
    ),
    getItem(
      t('main.pad_view.sider.info_view'),
      '3',
      <InsertRowAboveOutlined className="info-icon" />,
      () => {
        handleViewChange(ViewBtn.infoView);
      }
    ),
    getItem(
      t('main.pad_view.sider.alert_view'),
      '4',
      <Badge count={12} size="small">
        <AlertOutlined className="alert-icon" />
      </Badge>,
      () => {
        handleViewChange(ViewBtn.alertView);
      }
    )
  ];

  return (
    <Sider
      width={200}
      style={{ background: colorBgContainer, width: 80, backgroundColor: '#f5f5f5' }}
      collapsed={collapsed}
      onCollapse={(value) => setCollapsed(value)}
    >
      <Menu
        mode="inline"
        className="pad-sider"
        defaultSelectedKeys={['2']}
        style={{ height: '100%', borderRight: 0, backgroundColor: '#f5f5f5' }}
        items={viewItem}
      />
    </Sider>
  );
};

export default PadSider;
