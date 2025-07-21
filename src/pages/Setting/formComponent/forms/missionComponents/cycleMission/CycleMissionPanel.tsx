import { Button, Flex, Popconfirm, Table, TableProps, message } from 'antd';
import { FC } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { CloseCircleOutlined, DeleteTwoTone, PlayCircleOutlined } from '@ant-design/icons';
import client from '@/api/axiosClient';
import { errorHandler } from '@/utils/utils';
import { ErrorResponse } from '@/utils/globalType';
import { useCycleMission } from '@/sockets/useCycleMission';
import FormHr from '@/pages/Setting/utils/FormHr';
import CycleForm from './CycleForm';

const NotActive = styled.div`
  min-width: 65px;
  min-height: 65px;
`;

const ActiveLogo = styled.div`
  width: 45px;
  aspect-ratio: 0.75;
  --c: no-repeat linear-gradient(#c30000 0 0);
  background:
    var(--c) 0% 50%,
    var(--c) 50% 50%,
    var(--c) 100% 50%;
  animation: l7 1s infinite linear alternate;

  @keyframes l7 {
    0% {
      background-size:
        20% 50%,
        20% 50%,
        20% 50%;
    }
    20% {
      background-size:
        20% 20%,
        20% 50%,
        20% 50%;
    }
    40% {
      background-size:
        20% 100%,
        20% 20%,
        20% 50%;
    }
    60% {
      background-size:
        20% 50%,
        20% 100%,
        20% 20%;
    }
    80% {
      background-size:
        20% 50%,
        20% 50%,
        20% 100%;
    }
    100% {
      background-size:
        20% 50%,
        20% 50%,
        20% 50%;
    }
  }
`;

const MinWid = styled.div`
  min-width: 10em;
`;

const PanelContainer = styled.div`
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  padding: 16px;
`;

const WideTable = styled(Table)`
  width: 100%;
  min-width: 600px;
  .ant-table {
    width: 100%;
  }
  .ant-table-container {
    width: 100%;
  }
`;

type CM = {
  isActive: boolean;
  amrId?: string;
  missionName: string;
  cycle_relate_id: string;
  mission_id: string;
};

const CycleMissionPanel: FC<{
  sortableId: string;
  attributes: import('@dnd-kit/core').DraggableAttributes;
  listeners: import('@dnd-kit/core/dist/hooks/utilities').SyntheticListenerMap | undefined;
}> = ({ attributes, listeners }) => {
  const { t } = useTranslation();
  const data = useCycleMission();
  const [messageApi, contextHolder] = message.useMessage();
  const deleteMutation = useMutation({
    mutationFn: (payload: { id: string }) => {
      return client.post(
        'api/setting/delete-cycle-mission',
        {
          cycle_id: payload.id
        },
        {
          headers: { authorization: `Bearer ${localStorage.getItem('_KMT')}` }
        }
      );
    },
    onSuccess: () => {
      void messageApi.success(t('utils.success'));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const activeMutation = useMutation({
    mutationFn: (payload: { id: string; isActive: boolean }) => {
      return client.post(
        'api/setting/active-cycle-mission',
        {
          cycle_id: payload.id,
          isActive: payload.isActive
        },
        {
          headers: { authorization: `Bearer ${localStorage.getItem('_KMT')}` }
        }
      );
    },
    onSuccess: () => {
      void messageApi.success(t('utils.success'));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const activeSwitch = (id: string, isActive: boolean) => {
    activeMutation.mutate({ id, isActive });
  };

  const deleteOne = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const columns: TableProps<CM>['columns'] = [
    {
      title: t('mission.cycle_mission.random'),
      dataIndex: 'missionName',
      key: 'missionName',
      width: '30%'
    },
    {
      title: t('mission.cycle_mission.car'),
      dataIndex: 'amrId',
      key: 'amrId',
      width: '25%',
      render(_, record) {
        return record.amrId ? record.amrId : t('mission.cycle_mission.random');
      }
    },
    {
      title: t('mission.cycle_mission.status'),
      dataIndex: 'status',
      key: 'status',
      width: '15%',
      render(_, record) {
        return record.isActive ? <ActiveLogo /> : <NotActive />;
      }
    },
    {
      key: 'action',
      width: '30%',
      render: (_, record) => (
        <MinWid>
          <Flex gap="middle">
            <Button
              color={record.isActive ? 'default' : 'primary'}
              variant="filled"
              icon={record.isActive ? <CloseCircleOutlined /> : <PlayCircleOutlined />}
              loading={activeMutation.isLoading}
              onClick={() => activeSwitch(record.cycle_relate_id, !record.isActive)}
            >
              {record.isActive
                ? t('mission.cycle_mission.stale')
                : t('mission.cycle_mission.executing')}
            </Button>
            {record.isActive ? (
              []
            ) : (
              <Popconfirm
                title="Sure to delete?"
                onConfirm={() => deleteOne(record.cycle_relate_id)}
              >
                <Button
                  icon={<DeleteTwoTone twoToneColor="#f30303" />}
                  color="danger"
                  variant="filled"
                  loading={deleteMutation.isLoading}
                  type="dashed"
                  danger
                >
                  {t('utils.delete')}
                </Button>
              </Popconfirm>
            )}
          </Flex>
        </MinWid>
      )
    }
  ];

  if (!data) return [];
  return (
    <>
      {contextHolder}
      <PanelContainer>
        <h3 className="drop_button_style" {...listeners} {...attributes}>
          {t('mission.cycle_mission.cycle_mission')}
        </h3>
        <FormHr />
        <Flex gap="middle" justify="flex-start" align="start" vertical>
          <CycleForm />
          <WideTable
            rowKey={(record) => (record as { cycle_relate_id: string }).cycle_relate_id as string}
            columns={columns as []}
            dataSource={data}
            pagination={{ pageSize: 4 }}
          />
        </Flex>
      </PanelContainer>
    </>
  );
};

export default CycleMissionPanel;
