import {
  Button,
  Flex,
  Form,
  FormInstance,
  Input,
  InputNumber,
  InputRef,
  message,
  Popconfirm,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  TableColumnType,
  Typography
} from 'antd';
import { FC, memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { CloseOutlined, DeleteOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import { nanoid } from 'nanoid';
import { FilterDropdownProps } from 'antd/es/table/interface';
import { useSetAtom } from 'jotai';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import useMap from '@/api/useMap';
import { hoverRoad } from '@/utils/gloable';
import client from '@/api/axiosClient';
import { ErrorResponse } from '@/utils/globalType';
import { errorHandler } from '@/utils/utils';
import FormHr from '../../utils/FormHr';
import { SaveOutlined } from '@ant-design/icons';

type RoadListType = {
  id: string;
  roadId: string;
  validYawList?: string | number[];
  spot1Id: string;
  spot2Id: string;
  priority: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  disabled: boolean;
  limit: boolean;
  roadType: string;
};

type DataIndex = keyof RoadListType;

interface EditableCellProps extends React.HTMLAttributes<HTMLElement> {
  editing?: boolean;
  dataIndex?: string;
  title: string;
  children: React.ReactNode;
}

const yawOptions = ['0', '90', '180', '270', '*'].map((v) => ({
  value: v,
  label: v === '*' ? 'All Angles' : `${v}°`
}));

const whenAll = yawOptions.slice(1); // Exclude '*' option
const when0 = [
  { value: '0', label: '0°' },
  { value: '180', label: '180°' }
];
const when90 = [
  { value: '90', label: '90°' },
  { value: '270', label: '270°' }
];
const when180 = [
  { value: '0', label: '0°' },
  { value: '180', label: '180°' }
];
const when270 = [
  { value: '90', label: '90°' },
  { value: '270', label: '270°' }
];

interface EditableCellProps extends React.HTMLAttributes<HTMLElement> {
  editing?: boolean;
  dataIndex?: string;
  title: string;
  children: React.ReactNode;
  form?: FormInstance;
}

const EditableCell: FC<EditableCellProps> = ({
  editing,
  dataIndex,
  children,
  form,
  ...restProps
}) => {
  const { t } = useTranslation();
  const [chooseAngle, setChooseAngle] = useState<string>('');
  const [yawOption, setYawOption] = useState<typeof yawOptions>(whenAll);

  const levelOption = [
    { value: 5, label: t('edit_road_panel.low') },
    { value: 3, label: t('edit_road_panel.medium') },
    { value: 1, label: t('edit_road_panel.high') }
  ];

  useEffect(() => {
    if (!chooseAngle) {
      setYawOption(whenAll);
      return;
    }

    switch (chooseAngle) {
      case '*':
        setYawOption(whenAll);
        break;
      case '0':
        setYawOption(when0);
        break;
      case '90':
        setYawOption(when90);
        break;
      case '180':
        setYawOption(when180);
        break;
      case '270':
        setYawOption(when270);
        break;
      default:
        setYawOption(whenAll);
        break;
    }
  }, [chooseAngle]);

  useEffect(() => {
    if (editing && dataIndex === 'validYawList' && form) {
      const initialValue = form.getFieldValue('validYawList') || [];
      setChooseAngle(initialValue[0] || '');
    }
  }, [editing, dataIndex, form]);

  let inputNode;
  switch (dataIndex) {
    case 'spot1Id':
      inputNode = <InputNumber />;
      break;
    case 'spot2Id':
      inputNode = <InputNumber />;
      break;
    case 'disabled':
      inputNode = <Switch />;
      break;
    case 'limit':
      inputNode = <Switch />;
      break;
    case 'roadType':
      inputNode = (
        <Radio.Group buttonStyle="solid">
          <Radio.Button value="oneWayRoad">{t('edit_road_panel.single_road')}</Radio.Button>
          <Radio.Button value="twoWayRoad">{t('edit_road_panel.two_way_road')}</Radio.Button>
        </Radio.Group>
      );
      break;
    case 'priority':
      inputNode = <Select options={levelOption} style={{ minWidth: 120 }} />;
      break;
    case 'validYawList':
      inputNode = (
        <Select
          mode="multiple"
          options={yawOption}
          onChange={(value: string[]) => {
            setChooseAngle(value[0] || '');
          }}
          style={{ minWidth: 120 }}
          allowClear
          placeholder={t('utils.required')}
        />
      );
      break;
    default:
      inputNode = <Input />;
  }

  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          rules={[{ required: true, message: t('utils.required') }]}
        >
          {inputNode}
        </Form.Item>
      ) : (
        children
      )}
    </td>
  );
};

const ActiveBox = styled.div`
  min-width: 4em;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
`;

type DotStyle = { $active: boolean };

type SubmitRoad = {
  id: string;
  limit: boolean;
  spot1Id: number;
  spot2Id: number;
  roadType: string;
  priority: number;
  disabled: boolean;
  validYawList: number[] | string[];
};

const Dot = styled.div<DotStyle>`
  border-radius: 99%;
  width: 7px;
  height: 7px;
  background-color: ${(prop) => (prop.$active ? '#979797' : '#2bea00')};
`;

const RoadList: React.FC<{
  sortableId: string;
  attributes: import('@dnd-kit/core').DraggableAttributes;
  listeners: import('@dnd-kit/core/dist/hooks/utilities').SyntheticListenerMap | undefined;
}> = ({ attributes, listeners }) => {
  const { data: currentMap } = useMap();
  const searchInput = useRef<InputRef>(null);
  const [messageApi, contextHolders] = message.useMessage();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const isEditing = (record: RoadListType) => record.roadId === editingKey;
  const setHoverRoad = useSetAtom(hoverRoad);
  const [formRoad] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const deleteRoadMutation = useMutation({
    mutationFn: (roadId: string) => client.post('api/setting/delete-edit-road', { roadId }),
    onSuccess: () => {
      void messageApi.success('success');
      queryClient.refetchQueries({ queryKey: ['map'] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const editRoadMutation = useMutation({
    mutationFn: (payload: SubmitRoad) => client.post('api/setting/edit-edit-road', payload),
    onSuccess: () => {
      void messageApi.success('success');
      queryClient.refetchQueries({ queryKey: ['map'] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const deleteMultiRoadMutation = useMutation({
    mutationFn: (roadId: string[]) => client.post('api/setting/delete-multi-edit-road', { roadId }),
    onSuccess: () => {
      void messageApi.success('success');
      queryClient.refetchQueries({ queryKey: ['map'] });
      setSelectedRowKeys([]);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const handleSearch = (confirm: FilterDropdownProps['confirm']) => confirm();
  const handleReset = (clearFilters: () => void) => clearFilters();
  const handleHover = (id: string) => id && setHoverRoad(id);
  const handleMouseLeave = () => setHoverRoad('');

  const getColumnSearchProps = (dataIndex: DataIndex): TableColumnType<RoadListType> => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleSearch(confirm)}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            color="primary"
            variant="filled"
            onClick={() => handleSearch(confirm)}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            {t('utils.search')}
          </Button>
          <Button
            color="default"
            variant="filled"
            onClick={() => clearFilters && handleReset(clearFilters)}
            size="small"
            style={{ width: 90 }}
          >
            {t('utils.reset')}
          </Button>
          <Button type="link" size="small" onClick={() => confirm({ closeDropdown: false })}>
            {t('utils.filter')}
          </Button>
          <Button type="link" size="small" onClick={() => close()}>
            {t('utils.cancel')}
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
    ),
    onFilter: (value, record) =>
      record[dataIndex]
        ?.toString()
        .toLowerCase()
        .includes((value as string).toLowerCase()) as boolean,
    filterDropdownProps: {
      onOpenChange: (visible) => {
        if (visible) setTimeout(() => searchInput.current?.select(), 100);
      }
    },
    render: (text: string) => text
  });

  const edit = (record: Partial<RoadListType> & { roadId: string }) => {
    const validYawList =
      record.validYawList === '*'
        ? ['*']
        : (record.validYawList as number[]).map((c) => c.toString());
    formRoad.setFieldsValue({
      spot1Id: record.spot1Id,
      spot2Id: record.spot2Id,
      limit: record.limit,
      priority: record.priority,
      roadType: record.roadType,
      disabled: record.disabled,
      validYawList
    });
    setEditingKey(record.roadId);
  };

  const cancel = () => setEditingKey(null);

  const save = (key: string) => {
    const payload: SubmitRoad = {
      id: key,
      spot1Id: formRoad.getFieldValue('spot1Id') as number,
      spot2Id: formRoad.getFieldValue('spot2Id') as number,
      roadType: formRoad.getFieldValue('roadType') as string,
      limit: formRoad.getFieldValue('limit') as boolean,
      priority: formRoad.getFieldValue('priority'),
      disabled: formRoad.getFieldValue('disabled') as boolean,
      validYawList: formRoad.getFieldValue('validYawList') as number[] | string[]
    };

    editRoadMutation.mutate(payload);
    formRoad.setFieldsValue(payload);
    setEditingKey(null);
  };

  const deleteMultiItem = () => {
    if (selectedRowKeys.length === 0) return;
    deleteMultiRoadMutation.mutate(selectedRowKeys as string[]);
  };

  const columns = [
    {
      title: t('edit_road_panel.start_point'),
      dataIndex: 'spot1Id',
      key: 'spot1Id',
      editable: true,
      minWidth: 120, // Enough for IDs like "12345"
      sorter: (a: RoadListType, b: RoadListType) => Number(a.spot1Id) - Number(b.spot2Id),
      ...getColumnSearchProps('spot1Id')
    },
    {
      title: t('edit_road_panel.end_point'),
      dataIndex: 'spot2Id',
      key: 'spot2Id',
      editable: true,
      minWidth: 120, // Enough for IDs like "12345"
      sorter: (a: RoadListType, b: RoadListType) => Number(a.spot2Id) - Number(b.spot1Id),
      ...getColumnSearchProps('spot2Id')
    },
    {
      title: t('utils.point_type'),
      dataIndex: 'roadType',
      key: 'roadType',
      editable: true,
      minWidth: 150, // Space for "Single Road" or "Two-Way Road"
      render: (_v: unknown, record: RoadListType) =>
        record.roadType === 'oneWayRoad'
          ? t('edit_road_panel.single_road')
          : t('edit_road_panel.two_way_road'),
      sorter: (a: RoadListType, b: RoadListType) => a.roadType.localeCompare(b.roadType)
    },
    {
      title: t('edit_road_panel.yaw'),
      dataIndex: 'validYawList',
      key: 'validYawList',
      editable: true,
      minWidth: 80,
      render: (_: unknown, record: RoadListType) => record.validYawList?.toString() || ''
    },
    {
      title: t('edit_road_panel.priority'),
      dataIndex: 'priority',
      key: 'priority',
      editable: true,
      minWidth: 80,
      render: (_: unknown, record: RoadListType) => {
        const level = record.priority;
        if (level === 1) return t('edit_road_panel.low');
        if (level === 5) return t('edit_road_panel.high');
        return t('edit_road_panel.medium');
      }
    },
    {
      title: t('edit_road_panel.limit'),
      dataIndex: 'limit',
      key: 'limit',
      editable: true,
      minWidth: 50,
      render: (_: unknown, record: RoadListType) => (record.limit ? t('utils.yes') : t('utils.no'))
    },
    {
      title: t('edit_road_panel.disabled'),
      key: 'disabled',
      dataIndex: 'disabled',
      editable: true,
      minWidth: 100,
      render: (_v: unknown, record: RoadListType) => (
        <ActiveBox>
          <Dot $active={record.disabled as boolean} />{' '}
          <>{record.disabled ? t('utils.yes') : t('utils.no')}</>
        </ActiveBox>
      )
    },
    {
      title: '',
      dataIndex: 'operation',
      key: nanoid(),
      minWidth: 150,
      render(_v: unknown, record: RoadListType) {
        const editable = isEditing(record);
        return editable ? (
          <Flex gap="small">
            <Typography.Link onClick={() => save(record.id)} style={{ marginRight: 8 }}>
              <Button variant="filled" color="primary" htmlType="submit" icon={<SaveOutlined />}>
                {t('utils.save')}
              </Button>
            </Typography.Link>
            <Typography.Link onClick={() => cancel()} style={{ marginRight: 8 }}>
              <Button icon={<CloseOutlined />} color="default" variant="filled" type="link">
                {t('utils.cancel')}
              </Button>
            </Typography.Link>
          </Flex>
        ) : (
          <Flex gap="small">
            <Button
              onClick={() => edit(record)}
              icon={<EditOutlined />}
              color="primary"
              variant="filled"
              type="link"
            >
              {t('utils.edit')}
            </Button>
            <Popconfirm
              title="Delete the task"
              description="Are you sure to delete this road?"
              onConfirm={() => deleteRoadMutation.mutate(record.roadId)}
              onCancel={cancel}
              okText="Yes"
              cancelText="No"
            >
              <Button
                icon={<DeleteOutlined color="#ff0707" />}
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
    if (!col.editable) return col;
    return {
      ...col,
      onCell: (record: RoadListType) => ({
        record,
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record)
      })
    };
  });

  return (
    <>
      {contextHolders}
      <h3 className="drop_button_style" {...listeners} {...attributes}>
        {t('edit_road_panel.road_table')}
      </h3>
      <FormHr />
      <Flex
        gap="middle"
        justify="flex-start"
        align="start"
        vertical
        onMouseLeave={handleMouseLeave}
      >
        <Button
          onClick={deleteMultiItem}
          loading={deleteMultiRoadMutation.isLoading}
          disabled={selectedRowKeys.length === 0}
          color="danger"
          variant="filled"
        >
          {t('utils.delete')}
        </Button>
        <Form form={formRoad} component={false}>
          <Table
            dataSource={currentMap?.roads}
            rowKey={(v) => v.roadId}
            rowSelection={{
              type: 'checkbox',
              onChange: (selectedRowKeys: React.Key[]) => setSelectedRowKeys([...selectedRowKeys])
            }}
            components={{ body: { cell: EditableCell } }}
            onRow={(record) => ({
              onMouseEnter: () => handleHover(record.roadId)
            })}
            columns={mergedColumns as []}
            pagination={{ pageSize: 8 }}
          />
        </Form>
      </Flex>
    </>
  );
};

export default memo(RoadList);
