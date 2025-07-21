import { FC } from 'react';
import { CloseCircleOutlined, DeleteTwoTone, PlayCircleOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import styled from 'styled-components';
import { Button, Flex, Popconfirm, Table, message } from 'antd';
import { nanoid } from 'nanoid';
import { useTranslation } from 'react-i18next';
import { ErrorResponse } from '@/utils/globalType';
import { errorHandler } from '@/utils/utils';
import client from '@/api/axiosClient';
import { useAbortMissionWhenHasCargo } from '@/api/useAbortMissionWhenHasCargo';

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
  $active: boolean;
};

const Dot = styled.div<DotStyle>`
  border-radius: 99%;
  width: 7px;
  height: 7px;
  background-color: ${(prop) => (prop.$active ? '#2bea00' : '#979797')};
`;

interface DataType {
  id: string;
  amrId: string[];
  active: boolean;
  taskName: string;
  taskId: string;
}

const AbortCargoMissionTable: FC = () => {
  const { t } = useTranslation();
  const { data: abortData, refetch } = useAbortMissionWhenHasCargo();

  const [messageApi, contextHolder] = message.useMessage();

  const activeMutation = useMutation({
    mutationFn: (payload: { id: string; isActive: boolean }) => {
      return client.post('api/setting/active-abort-when-has-cargo', payload);
    },
    onSuccess: () => {
      void messageApi.success(t('utils.success'));
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: { id: string }) => {
      return client.post('api/setting/delete-abort-when-has-cargo', payload);
    },
    onSuccess() {
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const handleActive = (isActive: boolean, id: string) => {
    activeMutation.mutate({ id, isActive });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const columns = [
    {
      title: t('mission.topic_mission.status'),
      key: 'active',
      dataIndex: 'active',
      width: 100,
      render: (_v: unknown, record: DataType) => {
        return (
          <ActiveBox>
            <Dot $active={record.active as boolean} />{' '}
            <>
              {record.active
                ? t('mission.topic_mission.executing')
                : t('mission.topic_mission.stale')}
            </>
          </ActiveBox>
        );
      }
    },
    {
      title: t('mission.topic_mission.car'),
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
      title: t('mission.topic_mission.mission'),
      dataIndex: 'missionName',
      key: 'missionName',
      width: 300,

      render: (_v: unknown, record: DataType) => {
        return record.taskName;
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
                    {t('mission.topic_mission.stale')}
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
                    {t('mission.topic_mission.executing')}
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
      <Table
        rowKey={(record) => record.id}
        columns={columns}
        dataSource={abortData as DataType[]}
      />
    </Wrapper>
  );
};

export default AbortCargoMissionTable;
