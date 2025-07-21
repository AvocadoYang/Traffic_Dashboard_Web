import dayjs from 'dayjs';
import { Dispatch, FC, SetStateAction } from 'react';
import {
  CloseCircleOutlined,
  EditOutlined,
  PlayCircleOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import styled from 'styled-components';
import { Button, Flex, FormInstance, Popconfirm, Table, message } from 'antd';
import { nanoid } from 'nanoid';
import { useTranslation } from 'react-i18next';
import client from '@/api/axiosClient';
import useSchedule from '@/api/useSchedule';
import { ErrorResponse } from '@/utils/globalType';
import { errorHandler } from '@/utils/utils';

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
  active: boolean;
  amrId?: string[];
  schedule: string;
  missionId?: string;
  missionName: string;
}

const TimeStyle = styled.div`
  display: flex;
  flex-direction: column;
`;

const ScheduleTable: FC<{
  setIsModalOpen: Dispatch<SetStateAction<boolean>>;
  form: FormInstance<unknown>;
  setSelectId: Dispatch<SetStateAction<string | null>>;
}> = ({ form, setIsModalOpen, setSelectId }) => {
  const { t } = useTranslation();
  const { data: schedule, refetch } = useSchedule();

  const [messageApi, contextHolder] = message.useMessage();

  const numberToDigitsArray = (num: string): number[] => {
    return num.split('').map((digit) => parseInt(digit, 10));
  };

  const activeMutation = useMutation({
    mutationFn: (payload: { id: string; isActive: boolean }) => {
      return client.post('api/setting/active-schedule', payload);
    },
    onSuccess: () => {
      void messageApi.success(t('utils.success'));
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const addMutation = useMutation({
    mutationFn: () => {
      return client.post('api/setting/add-schedule');
    },
    onSuccess: () => {
      void messageApi.success(t('utils.success'));
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const handleAdd = () => {
    addMutation.mutate();
  };

  const deleteMutation = useMutation({
    mutationFn: (payload: { id: string }) => {
      return client.post('api/setting/remove-schedule', payload);
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

  const handleEdit = (id: string) => {
    if (!schedule) return;
    setIsModalOpen(true);
    setSelectId(id);

    const data = schedule.find((v) => v.id === id);

    const [day, min, sec] = data?.schedule.split('-') as string[];

    const week = numberToDigitsArray(day);
    const time = dayjs(`${min}:${sec}`, 'HH:mm');

    form.setFieldValue('amrId', data?.amrId);
    form.setFieldValue('missionId', data?.missionId);
    form.setFieldValue('day', week);
    form.setFieldValue('time', time);
  };

  const columns = [
    {
      title: t('mission.schedule_mission.status'),
      key: 'active',
      dataIndex: 'active',
      width: 100,
      render: (_v: unknown, record: DataType) => {
        return (
          <ActiveBox>
            <Dot $active={record.active as boolean} />{' '}
            <>
              {record.active
                ? t('mission.schedule_mission.executing')
                : t('mission.schedule_mission.stale')}
            </>
          </ActiveBox>
        );
      }
    },
    {
      title: t('mission.schedule_mission.car'),
      dataIndex: 'amrId',
      key: 'amrId',
      width: 150,
      editable: true
    },
    {
      title: t('mission.schedule_mission.what_time'),
      dataIndex: 'schedule',
      key: 'schedule',
      width: 120,
      editable: true,
      sorter: (a: DataType, b: DataType) => {
        const hourA = a.schedule.split('-')[1];
        const hourB = b.schedule.split('-')[1];
        return Number(hourA) - Number(hourB);
      },
      render: (_v: unknown, record: DataType) => {
        const [week, hour, minus] = record.schedule.split('-');

        return (
          <TimeStyle>
            <span>{`星期: ${week}`}</span>
            <span>{`${hour}:${minus}`}</span>
          </TimeStyle>
        );
      }
    },
    {
      title: t('mission.schedule_mission.mission'),
      dataIndex: 'missionName',
      key: 'missionName',
      width: 300,
      sorter: (a: DataType, b: DataType) => a.missionName.localeCompare(b.missionName),
      editable: true,
      render: (_v: unknown, record: DataType) => {
        return record.missionName;
      }
    },
    {
      title: '',
      width: 30,
      dataIndex: 'operation',
      key: nanoid(),

      render(_v: unknown, record: DataType) {
        return (
          <Flex gap="small">
            {record.active ? (
              <Button
                onClick={() => handleActive(false, record.id)}
                icon={<CloseCircleOutlined />}
                color="default"
                variant="filled"
                type="link"
              >
                {' '}
                {t('utils.inactive')}
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => handleActive(true, record.id)}
                  icon={<PlayCircleOutlined />}
                  color="primary"
                  variant="filled"
                  type="link"
                >
                  {t('utils.active')}
                </Button>
              </>
            )}

            <Button
              onClick={() => handleEdit(record.id)}
              color="purple"
              variant="filled"
              icon={<EditOutlined />}
            >
              {t('mission.add_mission.edit_info')}
            </Button>

            <Popconfirm title="Sure to delete?" onConfirm={() => handleDelete(record.id)}>
              <Button color="danger" variant="filled">
                {t('utils.delete')}
              </Button>
            </Popconfirm>
          </Flex>
        );
      }
    }
  ];

  return (
    <Wrapper>
      {contextHolder}
      <Button icon={<PlusOutlined />} color="primary" variant="filled" onClick={() => handleAdd()}>
        {t('utils.add')}
      </Button>
      <Table rowKey={() => nanoid()} columns={columns} dataSource={schedule as DataType[]} />
    </Wrapper>
  );
};

export default ScheduleTable;
