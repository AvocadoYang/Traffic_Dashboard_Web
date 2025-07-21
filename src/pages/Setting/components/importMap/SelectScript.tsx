import client from '@/api/axiosClient';
import { useQuery } from '@tanstack/react-query';
import { Button, Empty, Flex, message, Table, Tag, Tooltip, Typography } from 'antd';
import { FC, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { array, boolean, object, string } from 'yup';
import { ErrorResponse } from '@/utils/globalType';
import { errorHandler } from '@/utils/utils';
import { InfoCircleOutlined } from '@ant-design/icons';
import { GlobalLoadingPage } from '@/utils/GlobalLoadingPage';

const schema = array(
  object({
    id: string().required(),
    name: string().required(),
    isUsing: boolean().required()
  }).optional()
).required();

const getAllScript = async () => {
  const { data } = await client.get<unknown>('api/simulate/all-script');
  const result = await schema.validate(data, { stripUnknown: true });
  return result;
};

type DataType = {
  id: string;
  name: string;
  isUsing: boolean;
};

interface SelectScriptProps {
  onSelect: (scriptId: string) => void;
  selectedScriptId: string | null;
}

const SelectScript: FC<SelectScriptProps> = ({ onSelect, selectedScriptId }) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['all-scripts'],
    queryFn: getAllScript,
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const [loadingScriptId, setLoadingScriptId] = useState<string | null>(null);

  const columns = [
    {
      title: t('sim.select_script.script'),
      dataIndex: 'scriptName',
      key: 'scriptName',
      render: (_: any, record: DataType) => (
        <Typography.Text strong={record.id === selectedScriptId}>{record.name}</Typography.Text>
      )
    },
    {
      title: t('sim.select_script.status'),
      dataIndex: 'status',
      key: 'status',
      render: (_: any, record: DataType) =>
        record.isUsing ? (
          <Tag color="green">{t('sim.select_script.using')}</Tag>
        ) : (
          <Tag color="gray">{t('sim.select_script.no_using')}</Tag>
        )
    },
    {
      title: '',
      dataIndex: 'action',
      key: 'action',
      render: (_: any, record: DataType) => {
        const isLoading = loadingScriptId === record.id;
        return (
          <Flex justify="end" gap="large">
            {record.isUsing ? null : (
              <Button
                type={record.id === selectedScriptId ? 'default' : 'primary'}
                onClick={() => {
                  setLoadingScriptId(record.id);
                  onSelect(record.id);
                  setLoadingScriptId(null); // Reset loading after selection
                }}
                loading={isLoading}
                disabled={isLoading || record.isUsing}
                style={{ transition: 'all 0.3s' }}
              >
                {record.id === selectedScriptId
                  ? t('sim.select_script.selected')
                  : t('sim.select_script.using_this')}
              </Button>
            )}
          </Flex>
        );
      }
    }
  ];

  if (isLoading) {
    return <GlobalLoadingPage />;
  }

  if (isError || !data) {
    return (
      <Empty
        description={t('sim.select_script.error_loading')}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      >
        <Button type="primary" onClick={() => refetch()}>
          {t('utils.retry')}
        </Button>
      </Empty>
    );
  }

  return (
    <>
      {contextHolder}
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {t('sim.select_script.title')}
        </Typography.Title>
        <Tooltip placement="left" title={t('import_map.info')}>
          <InfoCircleOutlined
            style={{ cursor: 'pointer', fontSize: 16 }}
            aria-label={t('import_map.info')}
          />
        </Tooltip>
      </Flex>
      <Table
        rowKey={(record) => record.id}
        columns={columns}
        dataSource={data as []}
        bordered
        size="middle"
        pagination={false}
        locale={{
          emptyText: (
            <Empty
              description={t('sim.select_script.no_scripts')}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )
        }}
        rowClassName={(record) => (record.id === selectedScriptId ? 'ant-table-row-selected' : '')}
      />
    </>
  );
};

export default memo(SelectScript, (prevProps, nextProps) => {
  return prevProps.selectedScriptId === nextProps.selectedScriptId;
});
