 
import { FC } from 'react';
import { CloseCircleOutlined, DeleteTwoTone, PlayCircleOutlined } from '@ant-design/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { Button, Flex, Popconfirm, Table, message } from 'antd';
import { nanoid } from 'nanoid';
import { useTranslation } from 'react-i18next';
import { array, boolean, number, object, string } from 'yup';
import client from '@/api/axiosClient';
import { ErrorResponse } from '@/utils/globalType';
import { errorHandler } from '@/utils/utils';

const getTopic = async () => {
  const { data } = await client.get<unknown>('api/setting/idle-task');

  const schema = () =>
    array(
      object({
        id: string().required(),
        amrId: array(string().required()).required(),
        idleMin: number().required(),
        active: boolean().required(),
        preventLocation: array(string().optional()).optional().nullable(),
        taskName: string().required(),
        taskId: string().required()
      }).required()
    ).required();

  return schema().validate(data, { stripUnknown: true });
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1em;
  align-items: flex-start;
`;

const ActiveBox = styled.div`
  min-width: 4em;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
`;

type DotStyle = {
  $active: boolean
}

const Dot = styled.div<DotStyle>`
  border-radius: 99%;
  width: 7px;
  height: 7px;
  background-color: ${(prop) => (prop.$active ? '#2bea00' : '#979797')};
`;

interface DataType {
  id: string
  amrId: string[]
  idleMin: number
  active: boolean
  preventLocation: string[] | null
  taskName: string
  taskId: string
}

const IdleMissionTable: FC = () => {
  const { t } = useTranslation();
  const { data: idleData, refetch } = useQuery(['idle-task'], getTopic);

  const [messageApi, contextHolder] = message.useMessage();

  const activeMutation = useMutation({
    mutationFn: (payload: { idle_id: string; isActive: boolean }) => {
      return client.post('api/setting/active-idle-task', payload);
    },
    onSuccess: () => {
      void messageApi.success(t('utils.success'));
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: { idle_id: string }) => {
      return client.post('api/setting/delete-idle-task', payload);
    },
    onSuccess() {
       
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const handleActive = (isActive: boolean, id: string) => {
    activeMutation.mutate({ idle_id: id, isActive });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ idle_id: id });
  };

  const columns = [
    {
      title: t('mission.idle_mission.status'),
      key: 'active',
      dataIndex: 'active',
      width: 100,
      render: (_v: unknown, record: DataType) => {
        return (
          <ActiveBox>
            <Dot $active={record.active as boolean} />{' '}
            <>
              {record.active
                ? t('mission.idle_mission.executing')
                : t('mission.idle_mission.stale')}
            </>
          </ActiveBox>
        );
      }
    },
    {
      title: t('mission.idle_mission.car'),
      dataIndex: 'amrId',
      key: 'amrId',
      width: 150,
      render: (_: unknown, record: DataType) => {
        return record.amrId.map((item, i) => {
          return <p key={`${item}-${i}`}>{item} ,</p>;
        });
      }
    },
    {
      title: t('mission.idle_mission.idle_min'),
      dataIndex: 'idleMin',
      key: 'idleMin',
      width: 300,

      render: (_v: unknown, record: DataType) => {
        return record.idleMin;
      }
    },

    {
      title: t('mission.idle_mission.mission'),
      dataIndex: 'missionName',
      key: 'missionName',
      width: 300,

      render: (_v: unknown, record: DataType) => {
        return record.taskName;
      }
    },

    {
      title: t('mission.idle_mission.forbidden'),
      dataIndex: 'preventLocation',
      key: 'preventLocation',
      width: 300,

      render: (_v: unknown, record: DataType) => {
        if (!record.preventLocation || record.preventLocation.length === 0) {
          return <span style={{ color: '#999', fontStyle: 'italic' }}>None</span>;
        }

        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {record.preventLocation.map((location, index) => (
              <span
                key={index}
                style={{
                  backgroundColor: '#f0f0f0',
                  color: '#333',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                {location}
              </span>
            ))}
          </div>
        );
      }
    },

    {
      title: '',
      width: 30,
      dataIndex: 'operation',
      key: nanoid(),
       
      render(_v: unknown, record: DataType) {
        return (
          <>
            <Flex gap="small">
              {record.active ? (
                <>
                  <Button
                    onClick={() => handleActive(false, record.id)}
                    icon={<CloseCircleOutlined />}
                    color="default"
                    variant="filled"
                    type="link"
                  >
                    {' '}
                    {t('mission.idle_mission.stale')}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => handleActive(true, record.id)}
                    icon={<PlayCircleOutlined />}
                    color="primary"
                    variant="filled"
                    type="link"
                  >
                    {t('mission.idle_mission.executing')}
                  </Button>
                </>
              )}

              <Popconfirm title="Sure to delete?" onConfirm={() => handleDelete(record.id)}>
                <Button
                  icon={<DeleteTwoTone twoToneColor="#f30303" />}
                  color="danger"
                  variant="filled"
                >
                  {t('utils.delete')}
                </Button>
              </Popconfirm>
            </Flex>
          </>
        );
      }
    }
  ];

  return (
    <Wrapper>
      {contextHolder}
      <Table rowKey={(record) => record.id} columns={columns} dataSource={idleData as DataType[]} />
    </Wrapper>
  );
};

export default IdleMissionTable;
