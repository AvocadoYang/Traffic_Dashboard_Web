import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import FormHr from '../../../utils/FormHr';
import {
  Button,
  ColorPicker,
  Flex,
  message,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography
} from 'antd';
import { DeleteTwoTone, EditOutlined } from '@ant-design/icons';
import useMap from '@/api/useMap';
import { nanoid } from 'nanoid';
import { tagColor } from '../../../utils/utils';
import { ZoneTableData } from '../antd';
import EditZoneTable from './component/EditZoneTable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '@/api/axiosClient';
import { ErrorResponse } from '@/utils/globalType';
import { errorHandler } from '@/utils/utils';

const ZoneTable: React.FC<{
  sortableId: string;
  attributes: import('@dnd-kit/core').DraggableAttributes;
  listeners: import('@dnd-kit/core/dist/hooks/utilities').SyntheticListenerMap | undefined;
}> = ({ listeners, attributes, sortableId }) => {
  const { data } = useMap();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [oldData, setOldData] = useState<ZoneTableData | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const { t } = useTranslation();
  const [messageApi, contextHolders] = message.useMessage();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (zoneId: string[]) => {
      return client.post(`api/setting/delete-edit-zone`, {
        zoneIds: zoneId
      });
    },
    onSuccess: (__data, zonIds) => {
      void messageApi.success('success');

      setSelectedRowKeys((pre) => {
        return [...pre].filter((zoneId) => !zonIds.includes(zoneId as string));
      });
      console.log(selectedRowKeys);
      queryClient.refetchQueries({ queryKey: ['map'] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  //選擇要修改的區域列, 並且設定表單
  const edit = (record: Partial<ZoneTableData> & { id: string }) => {
    const isValidRecord = (
      record: Partial<ZoneTableData> & { id: string }
    ): record is ZoneTableData & { id: string } => {
      return Object.values(record).every((value) => value !== undefined);
    };
    if (!isValidRecord(record)) return;
    const data = {
      id: record.id,
      backgroundColor: record.backgroundColor,
      category: record.category,
      endPoint: record.endPoint,
      startPoint: record.startPoint,
      tagSetting: record.tagSetting,
      name: record.name
    };
    setOldData(data);
    setEditingKey(record.id);
  };

  const columns = [
    {
      title: t('zone_table_form.zone_name'),
      dataIndex: 'name',
      key: 'name',
      editable: true,
      width: '16%'
    },
    {
      title: t('zone_table_form.start_point'),
      dataIndex: 'startPoint',
      key: 'startPoint',
      render: (data) => {
        return (
          <Flex justify="center" align="center" vertical>
            <p>{`X: ${(data.startX as number).toFixed(2)}`}</p>
            <p>{`Y: ${(data.startY as number).toFixed(2)}`}</p>
          </Flex>
        );
      },
      editable: true,
      width: '16%'
    },
    {
      title: t('zone_table_form.end_point'),
      dataIndex: 'endPoint',
      key: 'endPoint',
      editable: true,
      render: (data) => {
        return (
          <Flex justify="center" align="center" vertical>
            <p>{`X: ${(data.endX as number).toFixed(2)}`}</p>
            <p>{`Y: ${(data.endY as number).toFixed(2)}`}</p>
          </Flex>
        );
      },
      width: '16%'
    },
    {
      title: t('zone_table_form.zone_attr'),
      dataIndex: 'category',
      key: 'category',
      editable: true,
      render: (data) => {
        return (
          <Space wrap style={{ fontWeight: 'bold' }}>
            {(data as string[]).map((tag) => {
              return (
                <Tag color={tagColor(tag)} key={nanoid()}>
                  {tag}
                </Tag>
              );
            })}
          </Space>
        );
      },
      width: '23%'
    },
    {
      title: t('zone_table_form.zone_color'),
      dataIndex: 'backgroundColor',
      key: 'backgroundColor',
      render: (data) => {
        // console.log(data)
        return <ColorPicker disabled defaultValue={data}></ColorPicker>;
      },
      editable: true,
      width: '6%'
    },
    {
      dataIndex: 'operation',
      key: 'operation',
      render: (_, record: ZoneTableData) => {
        return (
          <Flex vertical align="center" justify="space-between" gap={'middle'}>
            <Typography.Link
              onClick={() => {
                edit(record);
              }}
            >
              <Button icon={<EditOutlined />} color="primary" variant="filled" type="link">
                {t('utils.edit')}
              </Button>
            </Typography.Link>
            <Popconfirm
              title={t('utils.delete')}
              description={t('edit_location_panel.table_notify.are_you_sure')}
              onConfirm={() => deleteMutation.mutate([record.id])}
              okText={t('utils.yes')}
              cancelText={t('utils.no')}
            >
              <Button
                icon={<DeleteTwoTone twoToneColor="#f30303" />}
                color="danger"
                variant="filled"
                type="link"
              >
                {t('utils.delete')}
              </Button>
            </Popconfirm>
          </Flex>
        );
      },
      width: '12%'
    }
  ];

  if (!data) return;
  return (
    <>
      {contextHolders}
      <h3 className="drop_button_style" {...listeners} {...attributes}>
        {!editingKey ? t('sider_output_form_name.zoneTable') : t('edit_zone_panel.edit_zone')}
      </h3>
      <FormHr></FormHr>
      {!editingKey ? (
        <Flex gap="middle" justify="flex-start" align="start" vertical>
          <Popconfirm
            title={t('utils.delete')}
            description={t('edit_location_panel.table_notify.are_you_sure')}
            onConfirm={() => deleteMutation.mutate(selectedRowKeys as string[])}
            okText={t('utils.yes')}
            cancelText={t('utils.no')}
          >
            <Button
              icon={<DeleteTwoTone twoToneColor="#f30303" />}
              disabled={selectedRowKeys.length === 0}
              color="danger"
              variant="filled"
            >
              {t('utils.delete')}
            </Button>
          </Popconfirm>
          <Table
            rowSelection={{
              type: 'checkbox',
              onChange: (selectedRowKeys: React.Key[]) => {
                setSelectedRowKeys([...selectedRowKeys]);
              }
            }}
            rowKey={(record) => record.id}
            columns={columns}
            dataSource={data.zones as unknown as ZoneTableData[]}
          ></Table>
        </Flex>
      ) : (
        <EditZoneTable
          setEditingKey={setEditingKey}
          editingKey={editingKey}
          oldData={oldData}
          sortableId={sortableId}
        ></EditZoneTable>
      )}
    </>
  );
};

export default memo(ZoneTable);
