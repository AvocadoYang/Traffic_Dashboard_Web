import { nanoid } from 'nanoid';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Flex,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Radio,
  Table,
  Typography,
  message
} from 'antd';
import { CloseOutlined, DeleteTwoTone, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import TextArea from 'antd/es/input/TextArea';
import useWarningTable from '@/api/useWarningTable';
import client from '@/api/axiosClient';
import { ErrorResponse } from '@/utils/globalType';
import { errorHandler } from '@/utils/utils';

interface WarningRecord {
  id: number;
  is_open_buzzer: boolean;
  info_ch: string;
  info_en: string;
  solution_ch: string;
  solution_en: string;
  sensor_location_en: string;
  sensor_location_ch: string;
  genre_id: string;
  genre_name_ch: string;
  genre_name_en: string;
}

interface EditableCellProps extends React.HTMLAttributes<HTMLElement> {
  editing: boolean;
  dataIndex: string;

  title: string;
  record: WarningRecord;
  index: number;
  children: React.ReactNode;
}

const EditableCell: React.FC<EditableCellProps> = ({
  editing,
  dataIndex,
  children,
  ...restProps
}) => {
  const { t } = useTranslation();
  let inputNode;
  switch (dataIndex) {
    case 'id':
      inputNode = <InputNumber />;
      break;
    case 'is_open_buzzer':
      inputNode = (
        <Radio.Group>
          <Radio value={false}>{t('utils.no')}</Radio>
          <Radio value>{t('utils.yes')}</Radio>
        </Radio.Group>
      );
      break;
    case 'info_ch':
      inputNode = <TextArea />;
      break;
    case 'info_en':
      inputNode = <TextArea />;
      break;
    case 'solution_ch':
      inputNode = <TextArea />;
      break;
    case 'solution_en':
      inputNode = <TextArea />;
      break;

    default:
      <Input />;
  }

  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          rules={[
            {
              required: true,
              message: 'Please Input !'
            }
          ]}
        >
          {inputNode}
        </Form.Item>
      ) : (
        children
      )}
    </td>
  );
};

const WarningListTable: FC = () => {
  const { t } = useTranslation();
  const { data: warningData, refetch } = useWarningTable();
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const isEditing = (record: WarningRecord) => record?.id === editingKey;

  const editMutation = useMutation({
    mutationFn: (payload: WarningRecord) => {
      return client.post('api/setting/edit-warning', payload);
    },
    onSuccess() {
      messageApi.success('success');

      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: { id: number }) => {
      return client.post('api/setting/delete-warning', payload);
    },
    onSuccess: async () => {
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const edit = (record: Partial<WarningRecord> & { id: number }) => {
    form.setFieldValue('id', record.id);
    form.setFieldValue('is_open_buzzer', record.is_open_buzzer);
    form.setFieldValue('info_ch', record.info_ch);
    form.setFieldValue('info_en', record.info_en);
    form.setFieldValue('solution_ch', record.solution_ch);
    form.setFieldValue('solution_en', record.solution_en);

    setEditingKey(record.id);
  };

  const cancel = () => {
    setEditingKey(null);
  };

  const handleDelete = (record: Partial<WarningRecord> & { id: number }) => {
    deleteMutation.mutate({ id: record.id });
  };

  const save = (key: number) => {
    const data = form.getFieldsValue() as WarningRecord;

    const payload = {
      ...data,
      origin_id: key
    };

    editMutation.mutate(payload);
    setEditingKey(null);
  };

  const columns = [
    {
      title: t('file.warning_list.error_code'),
      dataIndex: 'id',
      key: 'id',
      editable: true,
      sorter: (a: WarningRecord, b: WarningRecord) => a.id - b.id
    },
    {
      title: t('file.warning_list.buzzer'),
      dataIndex: 'is_open_buzzer',
      key: 'is_open_buzzer',
      editable: true,
      render(_: unknown, record: WarningRecord) {
        return record.is_open_buzzer ? t('utils.yes') : t('utils.no');
      }
    },
    {
      title: t('file.warning_list.info_ch'),
      dataIndex: 'info_ch',
      key: 'info_ch',
      editable: true
    },
    {
      title: t('file.warning_list.info_en'),
      dataIndex: 'info_en',
      key: 'info_en',
      editable: true
    },

    {
      title: t('file.warning_list.solution_ch'),
      dataIndex: 'solution_ch',
      key: 'solution_ch',
      editable: true
    },

    {
      title: t('file.warning_list.solution_en'),
      dataIndex: 'solution_en',
      key: 'solution_en',
      editable: true
    },
    {
      title: '',
      width: 30,
      dataIndex: 'operation',
      key: nanoid(),

      render(_v: unknown, record: WarningRecord) {
        const editable = isEditing(record);

        return editable ? (
          <Flex gap="small">
            <Typography.Link
              onClick={() => {
                save(record.id);
              }}
              style={{ marginRight: 8 }}
            >
              <Button icon={<SaveOutlined />} color="primary" variant="filled" type="link">
                {t('utils.save')}
              </Button>
            </Typography.Link>
            <Typography.Link
              onClick={() => {
                cancel();
              }}
              style={{ marginRight: 8 }}
            >
              <Button icon={<CloseOutlined />} color="danger" variant="filled" type="link">
                {t('utils.cancel')}
              </Button>
            </Typography.Link>
          </Flex>
        ) : (
          <Flex gap="small">
            <Typography.Link
              disabled={editingKey !== null}
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
              onConfirm={() => handleDelete(record)}
              onCancel={cancel}
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
      }
    }
  ];

  const mergedColumns = columns.map((col) => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record: WarningRecord) => ({
        record,
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record)
      })
    };
  });

  return (
    <>
      {contextHolder}

      <Form form={form} component={false}>
        <Table

          rowKey={(record) => record.id}
          components={{
            body: {
              cell: EditableCell
            }
          }}
          columns={mergedColumns}
          dataSource={warningData as WarningRecord[]}
        />
      </Form>
    </>
  );
};

export default WarningListTable;
