import React, { FC, useState } from 'react';
import {
  DeleteTwoTone,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  ImportOutlined,
  MenuOutlined
} from '@ant-design/icons';
import { Button, Flex, Popconfirm, Table, Tag, Tooltip, Typography, message } from 'antd';
import { ColumnsType } from 'antd/es/table';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import client from '@/api/axiosClient';
import ImportMissionForm from './ImportMissionForm';
import { Robot_Mission_Slice_Table } from './mission';
import { Err } from '@/utils/responseErr';
import useTaskHumanRobot from '@/api/useTaskHumanRobot';

interface RowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  'data-row-key': string;
  'children': React.ReactNode;
}

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
  background-color: ${(prop) => (prop.$active ? '#979797' : '#2bea00')};
`;

const DataRow = ({ children, ...props }: RowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: props['data-row-key']
  });

  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Transform.toString(transform && { ...transform, scaleY: 1 })?.replace(
      /translate3d\(([^,]+),/,
      'translate3d(0,'
    ),
    transition,
    ...(isDragging ? { position: 'relative', zIndex: 9999 } : {})
  };

  return (
    <tr {...props} ref={setNodeRef} style={style} {...attributes}>
      {React.Children.map(children, (child) => {
        if ((child as React.ReactElement).key === 'sort') {
          return React.cloneElement(child as React.ReactElement, {
            children: (
              <MenuOutlined
                ref={setActivatorNodeRef}
                style={{ touchAction: 'none', cursor: 'move' }}
                {...listeners}
              />
            )
          });
        }
        return child;
      })}
    </tr>
  );
};

const HumanRobotTaskTable: FC<{
  showModal: (key: string) => void;
  selectedMissionKey: string;
  selectedMissionCar: string;
}> = ({ showModal, selectedMissionKey, selectedMissionCar }) => {
  const { data: taskDataSource } = useTaskHumanRobot(selectedMissionKey);

  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [importConfig, setImportConfig] = useState<{ order: number; key: string } | null>(null);
  const [showImportMission, setShowImportMission] = useState(false);
  const sortTaskMutation = useMutation({
    mutationFn: (data: {
      keyAndSort: { key: string; order: number }[];
      missionTitleId: string;
    }) => {
      return client.post('api/setting/update-task-order', data);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['all-relate-task-human-robot', selectedMissionKey]
      });
    },
    onError(error: Err) {
      messageApi.error(error.response.data.message);
    }
  });
  const deleteTaskMutation = useMutation({
    mutationFn: (payload: { key: string; keyAndOrder: { key: string; order: number }[] }) => {
      return client.post('api/setting/delete-task', {
        missionTitleId: selectedMissionKey,
        targetKey: payload.key,
        newOrder: payload.keyAndOrder
      });
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['all-relate-task-human-robot'] });
    },
    onError(error: Err) {
      messageApi.error(error.response.data.message);
    }
  });

  const disableMutation = useMutation({
    mutationFn: (payload: { id: string; disable: boolean; missionTitleId: string }) => {
      return client.post('api/setting/disable-task', payload);
    },
    onSuccess: async () => {
      void messageApi.success(t('utils.success'));
      await queryClient.refetchQueries({ queryKey: ['all-relate-task-human-robot'] });
    },
    onError(error: Err) {
      messageApi.error(error.response.data.message);
    }
  });

  const deleteTask = (key: string) => {
    if (!taskDataSource) return;
    const targetIndex = taskDataSource.findIndex((v) => v?.id === key);
    if (targetIndex === -1) return;
    const updatedDataSource = taskDataSource.filter((v) => v?.id !== key);
    const updatedDataSourceWithOrder = updatedDataSource.map((item, index) => ({
      ...item,
      order: index
    }));
    const keyAndOrder = updatedDataSourceWithOrder.map((v) => ({
      key: v.id as string,
      order: v.order
    }));

    deleteTaskMutation.mutate({ key, keyAndOrder });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!taskDataSource) return;
    if (active.id !== over?.id) {
      const activeIndex = taskDataSource.findIndex((i) => i?.id === active.id);
      const overIndex = taskDataSource.findIndex((i) => i?.id === over?.id);
      const newData = arrayMove(taskDataSource, activeIndex, overIndex);

      const sorData = newData.map((v, i) => ({
        ...v,
        order: i
      }));
      // console.log(sorData);

      const keyAndSort = sorData.map((v) => ({ key: v.id as string, order: v.order }));

      sortTaskMutation.mutate({
        keyAndSort,
        missionTitleId: selectedMissionKey
      });

      queryClient.setQueryData(['all-relate-task-human-robot', selectedMissionKey], sorData);
    }
  };

  const disableTask = (id: string, disable: boolean) => {
    disableMutation.mutate({ id, disable, missionTitleId: selectedMissionKey });
  };

  const showImportMissionModal = (order: number) => {
    setShowImportMission(true);
    setImportConfig({ key: selectedMissionKey, order: order + 1 });
  };

  const carTrans = (value: string) => {
    switch (value) {
      case 'F':
        return t('car_control_translate.F');
      case 'B':
        return t('car_control_translate.B');
      case 'S':
        return t('car_control_translate.S');
      case 'H':
        return t('car_control_translate.H');
      case 'W':
        return t('car_control_translate.W');
      default:
        return value;
    }
  };

  const columns: ColumnsType<Robot_Mission_Slice_Table> = [
    {
      title: t('mission.task_table.sort'),
      key: 'sort',
      width: 100
    },
    {
      title: t('mission.task_table.sort'),
      key: 'order',
      dataIndex: 'order',
      render(_, record) {
        return record.process_order;
      }
    },
    {
      title: t('mission.task_table.status'),
      key: 'status',
      dataIndex: 'status',
      width: 100,
      render: (_v, record) => {
        return (
          <ActiveBox>
            <Dot $active={record.disable as boolean} />{' '}
            <>
              {record.disable ? t('mission.task_table.inactive') : t('mission.task_table.active')}
            </>
          </ActiveBox>
        );
      }
    },
    {
      title: t('mission.task_table.action'),
      children: [
        {
          title: t('mission.task_table.action'),
          dataIndex: 'genre',
          key: 'genre',
          width: 100,
          render: (_, record) => {
            return record.operation.type.map((v, i) => {
              return <Typography key={`${v}-${i}`}>{carTrans(v)}</Typography>;
            });
          }
        },

        {
          title: t('mission.task_table_human_robot.control'),
          dataIndex: 'control',
          key: 'control',

          render: (_, record) => {
            return record.operation.control.map((v, i) => <Tag key={`${v}-${i}`}>{v}</Tag>);
          }
        },
        {
          title: t('mission.task_table_human_robot.detail'),
          dataIndex: 'param',
          key: 'param',
          width: 200,
          render: (_v, record) => {
            return record.operation.param.map((paramObj, i) => {
              return (
                <Flex key={`${paramObj.value}-${i}`}>{`${paramObj.joint}: ${paramObj.value}`}</Flex>
              );
            });
          }
        },
        {
          title: t('mission.task_table.location'),
          dataIndex: 'locationId',
          key: 'locationId',
          render: (_, record) => {
            return record.operation.locationId;
          }
        }
      ]
    },
    {
      title: '',
      dataIndex: '',
      width: 150,
      render: (_v, record) => {
        return (
          <Flex gap="small">
            <Popconfirm title="Sure to delete?" onConfirm={() => deleteTask(record.id)}>
              <Button
                icon={<DeleteTwoTone twoToneColor="#f30303" />}
                color="danger"
                variant="filled"
                type="link"
              >
                {t('utils.delete')}
              </Button>
            </Popconfirm>

            <Button
              onClick={() => showModal(record.id)}
              icon={<EditOutlined />}
              color="primary"
              variant="filled"
              type="link"
            >
              {t('utils.edit')}
            </Button>

            <Button
              onClick={() => showImportMissionModal(record.process_order)}
              icon={<ImportOutlined />}
              color="primary"
              variant="filled"
              type="link"
            >
              {t('mission.task_table.import_mission')}
            </Button>

            <Tooltip
              placement="right"
              title={
                record.disable
                  ? t('mission.task_table.in_use')
                  : t('mission.task_table.stop_this_process')
              }
            >
              {record.disable ? (
                <Button
                  onClick={() => disableTask(record.id, false)}
                  icon={<EyeInvisibleOutlined />}
                  color="primary"
                  variant="filled"
                  type="link"
                ></Button>
              ) : (
                <Button
                  onClick={() => disableTask(record.id, true)}
                  icon={<EyeOutlined />}
                  color="primary"
                  variant="filled"
                  type="link"
                ></Button>
              )}
            </Tooltip>
          </Flex>
        );
      }
    }
  ];

  if (!taskDataSource) return [];
  return (
    <>
      {contextHolder}

      <DndContext onDragEnd={onDragEnd}>
        <SortableContext
          items={taskDataSource.map((i) => i?.id || '')}
          strategy={verticalListSortingStrategy}
        >
          <Table
            components={{
              body: {
                row: DataRow
              }
            }}
            rowKey={(record) => record?.id as string}
            columns={columns as []}
            dataSource={taskDataSource}
            bordered
            pagination={{ pageSize: 50 }}
          />
        </SortableContext>
      </DndContext>
      <ImportMissionForm
        showImportMission={showImportMission}
        setShowImportMission={setShowImportMission}
        selectedMissionCar={selectedMissionCar}
        importConfig={importConfig}
      />
    </>
  );
};

export default HumanRobotTaskTable;
