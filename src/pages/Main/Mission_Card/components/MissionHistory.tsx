import { Drawer, Table, Tag, Space, Typography, Button } from 'antd';
import { Dispatch, FC, SetStateAction, useState } from 'react';
import { ColumnsType } from 'antd/es/table';
import moment from 'moment';
import {
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  MinusCircleOutlined
} from '@ant-design/icons';
import useAllMissionHistory from '@/api/useMissionHistory';
import { useTranslation } from 'react-i18next';
import './addonStyle.css';

// Define the Mission interface based on your schema
interface Mission {
  id: string;
  order?: number;
  priority?: number;
  send_by: number;
  amrId: string;
  status: number;
  sub_name?: string;
  manualMode: boolean;
  emergencyBtn: boolean;
  recoveryBtn: boolean;
  createdAt?: Date;
  assignedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  warningIdList?: Array<number>;
  batteryCost: number;
  batteryRateWhenStarted: number;
  totalDistanceTraveled: number;
  info?: any;
  message?: string;
}

enum Send_By {
  /**未知 */
  UNKNOWN,

  /**交管 */
  RCS,

  /**第三方的API */
  WCS,

  //**使用者於界面上派發 */
  USER
}

const MissionHistory: FC<{
  isOpenMissionHistory: boolean;
  setIsOpenMissionHistory: Dispatch<SetStateAction<boolean>>;
}> = ({ isOpenMissionHistory, setIsOpenMissionHistory }) => {
  const { t } = useTranslation();
  const [pagination, setPagination] = useState<{ page: number; pageSize: number }>({
    page: 1,
    pageSize: 10
  });

  const { data: missions, isLoading, error, refetch } = useAllMissionHistory(pagination);

  const closeHistory = () => {
    setIsOpenMissionHistory(false);
  };

  // Define table columns
  const columns: ColumnsType<Mission> = [
    {
      title: t('mission_history.mission_id'),
      dataIndex: 'id',
      key: 'id',
      sorter: (a, b) => a.id.localeCompare(b.id),
      width: 150
    },
    {
      title: t('mission_history.amr_id'),
      dataIndex: 'amrId',
      key: 'amrId',
      sorter: (a, b) => a.amrId.localeCompare(b.amrId),
      width: 120
    },
    {
      title: t('mission_history.status'),
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: t('mission_history.pending'), value: 0 },
        { text: t('mission_history.assigned'), value: 1 },
        { text: t('mission_history.executing'), value: 2 },
        { text: t('mission_history.completed'), value: 3 },
        { text: t('mission_history.aborting'), value: 4 },
        { text: t('mission_history.canceled'), value: 5 }
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: number) => {
        let color = 'blue';
        let text = t('mission_history.pending');
        let icon = <SyncOutlined spin />;

        switch (status) {
          case 0:
            color = 'blue';
            text = t('mission_history.pending');
            icon = <SyncOutlined spin />;
            break;
          case 1:
            color = 'orange';
            text = t('mission_history.assigned');
            icon = <SyncOutlined />;
            break;
          case 2:
            color = 'gold';
            text = t('mission_history.executing');
            icon = <LoadingOutlined />;
            break;
          case 3:
            color = 'green';
            text = t('mission_history.completed');
            icon = <CheckCircleOutlined />;
            break;
          case 4:
            color = 'red';
            text = t('mission_history.aborting');
            icon = <CloseCircleOutlined />;
            break;
          case 5:
            color = 'gray';
            text = t('mission_history.canceled');
            icon = <MinusCircleOutlined />;
            break;
        }

        return (
          <Tag color={color} icon={icon}>
            {text}
          </Tag>
        );
      },
      width: 150
    },

    {
      title: t('mission_history.full_name'),
      dataIndex: 'full_name',
      key: 'full_name',
      sorter: (a, b) => (a.sub_name || '').localeCompare(b.sub_name || ''),
      render: (full_name: string[]) => full_name?.join(', ') || 'N/A',
      width: 150
    },
    {
      title: t('mission_history.sub_name'),
      dataIndex: 'sub_name',
      key: 'sub_name',
      sorter: (a, b) => (a.sub_name || '').localeCompare(b.sub_name || ''),
      render: (text) => text || 'N/A',
      width: 150
    },
    {
      title: t('mission_history.category'),
      dataIndex: 'category',
      key: 'category',
      sorter: (a, b) => (a.sub_name || '').localeCompare(b.sub_name || ''),
      render: (category: string[]) => category?.join(', ') || 'N/A',
      width: 150
    },

    {
      title: t('mission_history.priority'),
      dataIndex: 'priority',
      key: 'priority',
      sorter: (a, b) => (a.priority || 0) - (b.priority || 0),
      render: (priority) => priority || 'N/A',
      width: 100
    },
    {
      title: t('mission_history.send_by'),
      dataIndex: 'send_by',
      key: 'send_by',
      sorter: (a, b) => a.send_by - b.send_by,
      render(value: Send_By) {
        switch (value) {
          case Send_By.UNKNOWN:
            return t('mission_history.unknown');
          case Send_By.RCS:
            return t('mission_history.rcs');
          case Send_By.WCS:
            return t('mission_history.wcs');
          case Send_By.USER:
            return t('mission_history.user');
          default:
            return t('mission_history.unknown');
        }
      },
      width: 100
    },
    {
      title: t('mission_history.created_at'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a, b) => moment(a.createdAt).unix() - moment(b.createdAt).unix(),
      render: (date) => (date ? moment(date).format('YYYY-MM-DD HH:mm:ss') : 'N/A'),
      width: 180
    },
    {
      title: t('mission_history.started_at'),
      dataIndex: 'startedAt',
      key: 'startedAt',
      sorter: (a, b) => moment(a.startedAt).unix() - moment(b.startedAt).unix(),
      render: (date) => (date ? moment(date).format('YYYY-MM-DD HH:mm:ss') : 'N/A'),
      width: 180
    },
    {
      title: t('mission_history.completed_at'),
      dataIndex: 'completedAt',
      key: 'completedAt',
      sorter: (a, b) => moment(a.completedAt).unix() - moment(b.completedAt).unix(),
      render: (date) => (date ? moment(date).format('YYYY-MM-DD HH:mm:ss') : 'N/A'),
      width: 180
    },
    {
      title: t('mission_history.total_time'),
      key: 'totalTime',
      render: (_, record) => {
        if (record.startedAt && record.completedAt) {
          const duration = moment.duration(
            moment(record.completedAt).diff(moment(record.startedAt))
          );
          const minutes = Math.floor(duration.asMinutes());
          const seconds = duration.seconds();
          return duration.asMilliseconds() >= 0
            ? `${minutes} ${t('mission_history.min')} ${seconds} ${t('mission_history.sec')}`
            : 'N/A';
        }
        return 'N/A';
      },
      sorter: (a, b) => {
        if (!a.startedAt || !a.completedAt || !b.startedAt || !b.completedAt) return 0;
        const durationA = moment(a.completedAt).diff(moment(a.startedAt));
        const durationB = moment(b.completedAt).diff(moment(b.startedAt));
        return durationA - durationB;
      },
      width: 140
    },
    {
      title: t('mission_history.battery_cost'),
      dataIndex: 'batteryCost',
      key: 'batteryCost',
      sorter: (a, b) => a.batteryCost - b.batteryCost,
      render: (cost) => `${cost}%`,
      width: 120
    },
    {
      title: t('mission_history.distance_traveled'),
      dataIndex: 'totalDistanceTraveled',
      key: 'totalDistanceTraveled',
      sorter: (a, b) => a.totalDistanceTraveled - b.totalDistanceTraveled,
      render: (distance) =>
        `${distance.toFixed(2)} ${t('mission_history.distance_traveled').split('（')[1].replace('）', '')}`,
      width: 150
    },
    {
      title: t('mission_history.manual_mode'),
      dataIndex: 'manualMode',
      key: 'manualMode',
      render: (manual) =>
        manual ? (
          <Tag color="purple">{t('mission_history.manual')}</Tag>
        ) : (
          <Tag color="blue">{t('mission_history.auto')}</Tag>
        ),
      filters: [
        { text: t('mission_history.manual'), value: true },
        { text: t('mission_history.auto'), value: false }
      ],
      onFilter: (value, record) => record.manualMode === value,
      width: 120
    },
    {
      title: t('mission_history.emergency_btn'),
      dataIndex: 'emergencyBtn',
      key: 'emergencyBtn',
      render: (emergency) =>
        emergency ? (
          <Tag color="red">{t('mission_history.pressed')}</Tag>
        ) : (
          <Tag color="green">{t('mission_history.not_pressed')}</Tag>
        ),
      filters: [
        { text: t('mission_history.pressed'), value: true },
        { text: t('mission_history.not_pressed'), value: false }
      ],
      onFilter: (value, record) => record.emergencyBtn === value,
      width: 120
    },
    {
      title: t('mission_history.recovery_btn'),
      dataIndex: 'recoveryBtn',
      key: 'recoveryBtn',
      render: (recovery) =>
        recovery ? (
          <Tag color="orange">{t('mission_history.pressed')}</Tag>
        ) : (
          <Tag color="green">{t('mission_history.not_pressed')}</Tag>
        ),
      filters: [
        { text: t('mission_history.pressed'), value: true },
        { text: t('mission_history.not_pressed'), value: false }
      ],
      onFilter: (value, record) => record.recoveryBtn === value,
      width: 120
    },
    {
      title: t('mission_history.warning_id_list'),
      dataIndex: 'warningIdList',
      key: 'warningIdList',
      render: (warningIdList: number[] | null) =>
        warningIdList && warningIdList.length > 0
          ? warningIdList.join(', ')
          : t('mission_history.none'),
      sorter: (a, b) => {
        const aList = a.warningIdList || [];
        const bList = b.warningIdList || [];
        return aList.length - bList.length; // Sort by number of warnings
      },
      filters: [
        { text: t('mission_history.has_warnings'), value: true },
        { text: t('mission_history.no_warnings'), value: false }
      ],
      onFilter: (value, record) => {
        const hasWarnings = !!(record.warningIdList && record.warningIdList.length > 0);
        return value ? hasWarnings : !hasWarnings;
      },
      width: 150
    },
    {
      title: t('mission_history.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            onClick={() => {
              console.log(t('mission_history.view'), record.id);
            }}
          >
            {t('mission_history.view')}
          </Button>
        </Space>
      ),
      width: 100
    }
  ];

  return (
    <Drawer
      title={
        <div className="flex items-center justify-between">
          <Typography.Title level={4} className="!m-0">
            {t('mission_history.title')}
          </Typography.Title>
          <Button type="primary" icon={<SyncOutlined />} onClick={() => refetch()}>
            {t('mission_history.refresh')}
          </Button>
        </div>
      }
      size="large"
      closable
      onClose={closeHistory}
      open={isOpenMissionHistory}
      width={1400}
      className="mission-history-drawer"
    >
      {error ? (
        <div className="text-red-500 text-center">
          <ExclamationCircleOutlined className="mr-2" />
          {t('mission_history.error_loading')}: {(error as { message: string }).message}
        </div>
      ) : (
        <Table
          columns={columns as []}
          dataSource={missions?.data}
          loading={isLoading}
          rowKey="id"
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: missions?.pagination.total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => t('mission_history.total_missions', { count: total }),
            onChange: (page, pageSize) => {
              setPagination({ page, pageSize });
            }
          }}
          scroll={{ x: 1400 }}
          className="shadow-md rounded-lg"
          rowClassName={(_, index) => (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')}
        />
      )}
    </Drawer>
  );
};

export default MissionHistory;
