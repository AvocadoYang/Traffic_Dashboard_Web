import React, { FC, useState } from 'react';
import {
  DeleteTwoTone,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  ImportOutlined,
  MenuOutlined
} from '@ant-design/icons';
import { Button, Flex, Popconfirm, Table, Tooltip, message, Descriptions } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import client from '@/api/axiosClient';
import useTaskFork from '../../../../../../api/useTaskFork';
import ImportMissionForm from './ImportMissionForm';
import CarControlTranslate from './CarControlTranslate';
import { Fork_mission_Slice } from './mission';
import { Err } from '@/utils/responseErr';
import './style/index.css';

interface RowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  'data-row-key': string;
  'children': React.ReactNode;
}

const DataRow = ({ children, ...props }: RowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: props['data-row-key'] });

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

const ForkTaskTable: FC<{
  showModal: (key: string) => void;
  selectedMissionKey: string;
  selectedMissionCar: string;
}> = ({ showModal, selectedMissionKey, selectedMissionCar }) => {
  const { data: taskDataSource } = useTaskFork(selectedMissionKey);
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [importConfig, setImportConfig] = useState<{ order: number; key: string } | null>(null);
  const [showImportMission, setShowImportMission] = useState(false);

  const sortTaskMutation = useMutation({
    mutationFn: (data: { keyAndSort: { key: string; order: number }[]; missionTitleId: string }) =>
      client.post('api/setting/update-task-order', data),
    onSuccess: () =>
      queryClient.refetchQueries({ queryKey: ['all-relate-task-fork', selectedMissionKey] }),
    onError: (error: Err) => messageApi.error(error.response.data.message)
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (payload: { key: string; keyAndOrder: { key: string; order: number }[] }) =>
      client.post('api/setting/delete-task', {
        missionTitleId: selectedMissionKey,
        targetKey: payload.key,
        newOrder: payload.keyAndOrder
      }),
    onSuccess: () => queryClient.refetchQueries({ queryKey: ['all-relate-task-fork'] }),
    onError: (error: Err) => messageApi.error(error.response.data.message)
  });

  const disableMutation = useMutation({
    mutationFn: (payload: { id: string; disable: boolean; missionTitleId: string }) =>
      client.post('api/setting/disable-task', payload),
    onSuccess: async () => {
      messageApi.success(t('utils.success'));
      await queryClient.refetchQueries({ queryKey: ['all-relate-task-fork'] });
    },
    onError: (error: Err) => messageApi.error(error.response.data.message)
  });

  const deleteTask = (key: string) => {
    if (!taskDataSource) return;
    const updatedDataSource = taskDataSource.filter((v) => v?.id !== key);
    const keyAndOrder = updatedDataSource.map((v, i) => ({ key: v?.id as string, order: i }));
    deleteTaskMutation.mutate({ key, keyAndOrder });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!taskDataSource || active.id === over?.id) return;
    const activeIndex = taskDataSource.findIndex((i) => i?.id === active.id);
    const overIndex = taskDataSource.findIndex((i) => i?.id === over?.id);
    const newData = arrayMove(taskDataSource, activeIndex, overIndex);
    const keyAndSort = newData.map((v, i) => ({ key: v?.id as string, order: i }));
    sortTaskMutation.mutate({
      keyAndSort,
      missionTitleId: selectedMissionKey
    });
    queryClient.setQueryData(['all-relate-task-fork', selectedMissionKey], newData);
  };

  const disableTask = (id: string, disable: boolean) =>
    disableMutation.mutate({ id, disable, missionTitleId: selectedMissionKey });

  const showImportMissionModal = (order: number) => {
    setShowImportMission(true);
    setImportConfig({ key: selectedMissionKey, order: order + 1 });
  };

  const columns: ColumnsType<Fork_mission_Slice> = [
    {
      title: t('mission.task_table.expand'),
      key: 'sort',
      width: 50,
      render: () => <MenuOutlined style={{ cursor: 'move' }} />
    },
    {
      title: t('mission.task_table.sort'),
      dataIndex: 'process_order',
      width: 80
    },
    {
      title: t('mission.task_table.status'),
      dataIndex: 'disable',
      width: 100,
      render: (disable: boolean) => (
        <Flex align="center" gap="small">
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: disable ? '#979797' : '#2bea00'
            }}
          />
          {disable ? t('mission.task_table.inactive') : t('mission.task_table.active')}
        </Flex>
      )
    },
    {
      title: t('mission.task_table.action'),
      dataIndex: 'operation',
      width: 150,
      render: (operation) => (operation.type ? <CarControlTranslate word={operation.type} /> : '-')
    },
    {
      title: t('mission.task_table.location'),
      dataIndex: ['operation', 'id'],
      width: 120,
      render: (_, record) => {
        return record.operation.locationId;
      }
    },
    {
      title: '',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Flex gap="small" wrap="wrap">
          <Popconfirm title={t('utils.delete_warn')} onConfirm={() => deleteTask(record.id)}>
            <Button type="link" danger icon={<DeleteTwoTone twoToneColor="#f30303" />}>
              {t('utils.delete')}
            </Button>
          </Popconfirm>
          <Button type="link" icon={<EditOutlined />} onClick={() => showModal(record.id)}>
            {t('utils.edit')}
          </Button>
          <Button
            type="link"
            icon={<ImportOutlined />}
            onClick={() => showImportMissionModal(record.process_order)}
          >
            {t('mission.task_table.import_mission')}
          </Button>
          <Tooltip
            title={
              record.disable
                ? t('mission.task_table.in_use')
                : t('mission.task_table.stop_this_process')
            }
          >
            <Button
              type="link"
              icon={record.disable ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={() => disableTask(record.id, !record.disable)}
            />
          </Tooltip>
        </Flex>
      )
    }
  ];

  const getLocationModeLabel = (isDefineId: string | undefined): string => {
    const locationModeMap: Record<string, string> = {
      custom: t('mission.task_table.custom'),
      auto: t('mission.task_table.select'),
      select: t('mission.task_table.is_selectable'),
      available_charge_station: t('mission.task_table.available_charge_station'),
      prepare_point: t('mission.task_table.prepare_point'),
      back_to_load_place: t('mission.task_table.back_to_load_place_desc')
    };
    return isDefineId && locationModeMap[isDefineId] ? locationModeMap[isDefineId] : '-';
  };

  const expandedRowRender = (record: Fork_mission_Slice) => (
    <Descriptions bordered column={2} size="small">
      {/* control */}
      <Descriptions.Item label={t('mission.task_table.action')}>
        {JSON.stringify(record.operation.control) || '-'}
      </Descriptions.Item>

      {/* control */}
      <Descriptions.Item label={t('mission.task_table.location')}>
        {JSON.stringify(record.operation.locationId) || '-'}
      </Descriptions.Item>

      {/* 等待 wait */}
      <Descriptions.Item label={t('mission.task_table.wait')}>
        {record.operation.wait ?? '-'}
      </Descriptions.Item>

      {/* 位置選擇模式 is define id */}
      <Descriptions.Item label={t('mission.task_table.is_custom_location')}>
        {getLocationModeLabel(record.operation.is_define_id)}
      </Descriptions.Item>

      <Descriptions.Item label={''}>{'-'}</Descriptions.Item>
      <Descriptions.Item label={''}>{'-'}</Descriptions.Item>

      {/* 轉角選擇	 is defined yaw*/}
      <Descriptions.Item label={t('mission.task_table.is_custom_yaw')}>
        {record.operation.is_define_yaw === 0
          ? t('mission.task_table.custom')
          : record.operation.is_define_yaw === 1
            ? t('mission.task_table.by_target_shelf_setting')
            : record.operation.is_define_yaw === 2
              ? t('mission.task_table.calculate_by_agv_and_shelf_angle')
              : '-'}
      </Descriptions.Item>

      {/* yaw 轉角值	 */}
      <Descriptions.Item label={t('mission.task_table.yaw')}>
        {record.operation.yaw ?? '-'}
      </Descriptions.Item>

      {/* 小車專用	 */}
      {/* <Descriptions.Item label={t('mission.task_table.auto_preparatory_point')}>
        {record.operation.auto_preparatory_point ? t('utils.yes') : t('utils.no')}
      </Descriptions.Item> */}

      {/* is defined height 貨架高設定	 */}
      <Descriptions.Item label={t('mission.task_table.is_define_heigh')}>
        {record.io.fork.is_define_height === 'custom'
          ? t('mission.task_table.custom')
          : record.io.fork.is_define_height === 'auto'
            ? t('mission.task_table.select')
            : record.io.fork.is_define_height === 'select'
              ? t('mission.task_table.is_selectable')
              : '-'}
      </Descriptions.Item>

      {/* height 枒杈高	 */}
      <Descriptions.Item label={t('mission.task_table.height')}>
        {record.io.fork.height ?? '-'}
      </Descriptions.Item>

      {/* is defined height 貨架高設定	 */}
      {/* <Descriptions.Item label={t('mission.task_table.has_cargo_to_process')}>
        {record.operation.hasCargoToProcess ? t('utils.yes') : t('utils.no')}
      </Descriptions.Item> */}

      <Descriptions.Item label={''}>{'-'}</Descriptions.Item>
      <Descriptions.Item label={''}>{'-'}</Descriptions.Item>

      {/* tolerance 不知道這是啥問捷克 */}
      <Descriptions.Item label={t('mission.task_table.tolerance')}>
        {record.operation.tolerance || '-'}
      </Descriptions.Item>

      {/* lookahead 不知道這是啥問捷克	 */}
      <Descriptions.Item label={t('mission.task_table.lookahead')}>
        {record.operation.lookahead || '-'}
      </Descriptions.Item>

      {/* camera config 不知道這是啥問捷克 */}
      <Descriptions.Item label={'camera config'}>
        {record.io.camera.config || '-'}
      </Descriptions.Item>

      {/* camera modify_dis 不知道這是啥問捷克	 */}
      <Descriptions.Item label={'camera modify dis'}>
        {record.io.camera.modify_dis || '-'}
      </Descriptions.Item>

      <Descriptions.Item label={''}>{'-'}</Descriptions.Item>
      <Descriptions.Item label={''}>{'-'}</Descriptions.Item>

      {/* 等待其他車 wait other	 */}
      <Descriptions.Item label={t('mission.task_table.amr_list')}>
        {record.operation.waitOtherAmr || '-'}
      </Descriptions.Item>

      {/* 先等或是後等 wait genre	 */}
      <Descriptions.Item label={t('mission.task_table.wait_genre')}>
        {record.operation.waitGenre === 'execute_first'
          ? t('mission.task_table.execute_first')
          : record.operation.waitGenre === 'wait_other_finish'
            ? t('mission.task_table.wait_other_finish')
            : '-'}
      </Descriptions.Item>
    </Descriptions>
  );

  if (!taskDataSource) return null;

  return (
    <>
      {contextHolder}
      <DndContext onDragEnd={onDragEnd}>
        <SortableContext
          items={taskDataSource.map((i) => i?.id || '')}
          strategy={verticalListSortingStrategy}
        >
          <Table
            components={{ body: { row: DataRow } }}
            rowKey="id"
            columns={columns}
            dataSource={taskDataSource as []}
            expandable={{ expandedRowRender }}
            bordered
            pagination={{ pageSize: 50 }}
          />
        </SortableContext>
      </DndContext>
      <ImportMissionForm
        showImportMission={showImportMission}
        setShowImportMission={setShowImportMission}
        importConfig={importConfig}
        selectedMissionCar={selectedMissionCar}
      />
    </>
  );
};

export default ForkTaskTable;
