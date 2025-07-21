import useCustomCargoFormat from '@/api/useCustomCargoFormat';
import { Button, Flex, message, Popconfirm, Table, TableColumnsType } from 'antd';
import { DeleteTwoTone, EditOutlined } from '@ant-design/icons';
import { FC, useState } from 'react';
import ReactJsonView from '@uiw/react-json-view';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { ErrorResponse } from '@/utils/globalType';
import { errorHandler } from '@/utils/utils';
import client from '@/api/axiosClient';

interface DataType {
  id: string;
  is_default: boolean;
  custom_name: string;
  format: string;
}

import CargoFormatModal from './CargoFormatModal'; // import the shared modal

const DataTable: FC = () => {
  const { data, refetch } = useCustomCargoFormat();
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [editingRecord, setEditingRecord] = useState<DataType | null>(null);

  const editMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      is_default: boolean;
      custom_name: string;
      format: string;
    }) => client.post('/api/setting/edit-custom-cargo-format', payload),
    onSuccess: () => {
      messageApi.success(t('utils.success'));
      setEditingRecord(null);
      refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: { id: string }) =>
      client.post('/api/setting/delete-custom-cargo-format', payload),
    onSuccess: () => {
      messageApi.success(t('utils.success'));
      refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const handleEdit = (record: DataType) => {
    setEditingRecord(record);
  };

  const columns: TableColumnsType<DataType> = [
    {
      title: t('customCargo.name'),
      dataIndex: 'custom_name',
      key: 'custom_name',
      width: 200
    },
    {
      title: t('customCargo.isDefault'),
      dataIndex: 'is_default',
      key: 'is_default',
      width: 100,
      render: (isDefault: boolean) => (isDefault ? '✅' : '-')
    },
    {
      title: '',
      render: (_v, record) => (
        <>
          <Flex gap="small">
            <Button
              type="link"
              icon={<EditOutlined />}
              color="primary"
              variant="filled"
              onClick={() => handleEdit(record)}
            >
              {t('utils.edit')}
            </Button>
            <Popconfirm
              title={t('customCargo.warn')}
              description={t('customCargo.delete_desc')}
              onConfirm={() => handleDelete(record.id)}
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
        </>
      )
    }
  ];

  return (
    <>
      {contextHolder}
      <Table<DataType>
        rowKey={(record) => record.id}
        columns={columns}
        expandable={{
          expandedRowRender: (record) => (
            <ReactJsonView
              displayDataTypes={false}
              value={JSON.parse(record.format)}
              collapsed={false}
              enableClipboard={false}
              style={{ fontSize: 14 }}
            />
          ),
          rowExpandable: (record) => record.custom_name !== 'Not Expandable'
        }}
        dataSource={data as DataType[]}
      />

      {editingRecord && (
        <CargoFormatModal
          open={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          initialValues={{
            custom_name: editingRecord.custom_name,
            is_default: editingRecord.is_default,
            format: JSON.parse(editingRecord.format)
          }}
          onSubmit={(values) =>
            editMutation.mutate({
              id: editingRecord.id,
              ...values
            })
          }
          loading={editMutation.isLoading}
        />
      )}
    </>
  );
};
export default DataTable;
