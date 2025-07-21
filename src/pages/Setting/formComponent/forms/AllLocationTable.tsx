import './form.css';
import {
  InputNumber,
  Select,
  InputRef,
  TableColumnType,
  Typography,
  Input,
  Checkbox,
  Button,
  message,
  Popconfirm,
  Flex
} from 'antd';
import { useSetAtom } from 'jotai';
import { LocationType } from '@/utils/jotai';
import { useRef, useState } from 'react';
import { FilterDropdownProps } from 'antd/es/table/interface';
import { useTranslation } from 'react-i18next';
import { tooltipProp } from '@/utils/gloable';
import { SearchOutlined, DeleteTwoTone, EditOutlined, CloseOutlined } from '@ant-design/icons';
import { EditableCellProps, DataIndex } from './antd';

import React, { memo } from 'react';
import { Space, Table, Tag, Form } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '@/api/axiosClient';
import { ErrorResponse } from '@/utils/globalType';
import { errorHandler } from '@/utils/utils';
import useMap from '@/api/useMap';
import FormHr from '../../utils/FormHr';
import SubmitButton from '@/utils/SubmitButton';

const pointTypeWithColor = {
  Extra: '#2d7df6',
  Charging: '#e7ab29',
  Dispatch: '#7fc035',
  Storage: '#e06a0a',
  Standby: '#e0dcd8'
};

const EditableCell: React.FC<EditableCellProps> = ({
  editing,
  dataIndex,
  children,
  ...restProps
}) => {
  const { t } = useTranslation();
  const pointTypeOption = [
    { value: 'Extra', label: t('utils.location_property.none') },
    { value: 'Charging', label: t('utils.location_property.charge_station') },
    { value: 'Dispatch', label: t('utils.location_property.prepare_side') },
    { value: 'Storage', label: t('utils.location_property.shelve') },
    { value: 'Standby', label: t('utils.location_property.wait_side') }
  ];

  const canRotateOption = [
    { value: true, label: t('utils.yes') },
    { value: false, label: t('utils.no') }
  ];

  let inputNode;

  switch (dataIndex) {
    case 'locationId':
      inputNode = <InputNumber />;
      break;
    case 'x':
      inputNode = <InputNumber style={{ width: '150px' }} />;
      break;
    case 'y':
      inputNode = <InputNumber style={{ width: '150px' }} />;
      break;
    case 'areaType':
      inputNode = <Select options={pointTypeOption} style={{ width: '150px' }} />;
      break;

    case 'canRotate':
      inputNode = <Select options={canRotateOption} />;
      break;
    default:
      <InputNumber />;
  }

  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          hasFeedback
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

export type LocationSubmit = {
  oldLocationId: string;
  newLocationId: string;
  x: number;
  y: number;
  areaType: string;
  rotation: number;
  canRotate: boolean;
};

const AllLocationTable: React.FC<{
  sortableId: string;
  attributes: import('@dnd-kit/core').DraggableAttributes;
  listeners: import('@dnd-kit/core/dist/hooks/utilities').SyntheticListenerMap | undefined;
}> = ({ listeners, attributes }) => {
  const [locationPanelForm] = Form.useForm();
  const searchInput = useRef<InputRef>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const { data: mapData } = useMap();
  const setTooltip = useSetAtom(tooltipProp);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [messageApi, contextHolders] = message.useMessage();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const saveLocationMutation = useMutation({
    mutationFn: (payload: LocationType) => {
      return client.post('api/setting/edit-edit-loc', payload);
    },
    onSuccess: () => {
      void messageApi.success(t('utils.success'));
      queryClient.refetchQueries({ queryKey: ['map'] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const deleteLocationMutation = useMutation({
    mutationFn: (data: { id: string; locationId: string }) => {
      return client.post('api/setting/delete-edit-loc', data);
    },
    onSuccess: () => {
      void messageApi.success(t('utils.success'));
      queryClient.refetchQueries({ queryKey: ['map'] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const deleteMultiLocationMutation = useMutation({
    mutationFn: (id: string[]) => {
      return client.post('api/setting/delete-multi-edit-loc', {
        id
      });
    },
    onSuccess: () => {
      void messageApi.success('success');
      queryClient.refetchQueries({ queryKey: ['map'] });
      setSelectedRowKeys([]);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const deleteMultiItem = () => {
    if (selectedRowKeys.length === 0) return;

    deleteMultiLocationMutation.mutate(selectedRowKeys as string[]);
  };

  const isEditing = (record: LocationType) => record.locationId === editingKey;

  const edit = (record: Partial<LocationType> & { locationId: string }) => {
    locationPanelForm.setFieldValue('x', Number(record.x));
    locationPanelForm.setFieldValue('y', Number(record.y));
    locationPanelForm.setFieldValue('canRotate', record.canRotate);
    locationPanelForm.setFieldValue('areaType', record.areaType);
    locationPanelForm.setFieldValue('locationId', record.locationId);
    setEditingKey(record.locationId);
  };

  /** About search function */
  const handleSearch = (confirm: FilterDropdownProps['confirm']) => {
    confirm();
  };

  const handleReset = (clearFilters: () => void) => {
    clearFilters();
  };

  const getColumnSearchProps = (dataIndex: DataIndex): TableColumnType<LocationType> => ({
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
          <Button
            type="link"
            size="small"
            onClick={() => {
              confirm({ closeDropdown: false });
            }}
          >
            {t('utils.filter')}
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              close();
            }}
          >
            {t('utils.cancel')}
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
    ),
    onFilter: (value, record) => {
      const fieldValue = record[dataIndex];
      if (fieldValue === undefined || fieldValue === null) return false;
      return fieldValue
        .toString()
        .toLowerCase()
        .includes((value as string).toLowerCase());
    },
    filterDropdownProps: {
      onOpenChange: (visible) => {
        if (visible) {
          setTimeout(() => searchInput.current?.select(), 100);
        }
      }
    },

    render: (text: string) => text
  });

  // --------------------------

  const savePos = (id: string, oldLocationId: string) => {
    const payload = locationPanelForm.getFieldsValue() as LocationType;
    const isNegative = Number(payload.locationId) <= 0;

    if (isNegative) {
      messageApi.warning(t('edit_location_panel.save_pose_notify.is_a_navigate'));
      return;
    }

    const sanitizedPayload = {
      ...payload,
      id,
      newLocationId: payload.locationId.toString(),
      oldLocationId
    };

    saveLocationMutation.mutate(sanitizedPayload);
  };

  const cancel = () => {
    setEditingKey(null);
  };

  const save = (id: string, locationId: string) => {
    savePos(id, locationId);
    setEditingKey(null);
  };

  const deleteLocationInList = (id: string | undefined, locationId: string) => {
    if (!id) {
      messageApi.error('id is missed');
      return;
    }
    deleteLocationMutation.mutate({ id, locationId });
  };

  const handleHover = (locationId: string, x: number, y: number) => {
    setTooltip({
      x,
      y,
      locationId
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  const columns = [
    {
      title: t('utils.location'),
      dataIndex: 'locationId',
      key: 'locationId',
      editable: true,
      width: '16%',
      sorter: (a: LocationType, b: LocationType) => Number(a.locationId) - Number(b.locationId),
      ...getColumnSearchProps('locationId')
    },
    {
      title: 'X',
      dataIndex: 'x',
      width: '8%',
      editable: true,
      key: 'x'
    },
    {
      title: 'Y',
      dataIndex: 'y',
      width: '8%',
      editable: true,
      key: 'y'
    },
    {
      title: '是否可旋轉',
      dataIndex: 'canRotate',
      key: 'canRotate',
      width: '20%',
      editable: true,
      render: (_: unknown, record: LocationType) => {
        return <Checkbox checked={record.canRotate} />;
      }
    },
    {
      title: t('utils.point_type'),
      dataIndex: 'areaType',
      editable: false,
      key: 'areaType',
      width: '20%',
      sorter: (a: LocationType, b: LocationType) => a.areaType.localeCompare(b.areaType),
      render: (_: unknown, record: LocationType) => {
        switch (record.areaType) {
          case 'Extra':
            return (
              <Tag color={pointTypeWithColor[record.areaType]} key={record.areaType}>
                {t('utils.location_property.none')}
              </Tag>
            );
          default:
            return (
              <Tag color={pointTypeWithColor[record.areaType]} key={record.areaType}>
                {record.areaType}
              </Tag>
            );
        }
      }
    },
    {
      dataIndex: 'operation',
      key: 'operation',

      render: (_: unknown, record: LocationType) => {
        const editable = isEditing(record);
        return editable ? (
          <Flex gap="small">
            <Typography.Link
              onClick={() => {
                if (record.id && record.locationId) {
                  save(record.id, record.locationId);
                } else {
                  messageApi.warning('id is missed');
                }
              }}
              style={{ marginRight: 8 }}
            >
              <SubmitButton isModel={false} text="save" form={locationPanelForm} />
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
              description={t('edit_location_panel.table_notify.are_you_sure')}
              onConfirm={() => deleteLocationInList(record.id, record.locationId)}
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
      onCell: (record: LocationType) => ({
        record,
        inputtype: col.dataIndex,
        dataIndex: col.dataIndex,
        key: col.key,
        title: col.title,
        editing: isEditing(record)
      })
    };
  });
  return (
    <>
      {contextHolders}
      <div onMouseLeave={handleMouseLeave}>
        <h3 className="drop_button_style" {...listeners} {...attributes}>
          {t('sider_output_form_name.locationList')}
        </h3>
        <FormHr></FormHr>
        <Flex
          gap="middle"
          justify="flex-start"
          align="start"
          vertical
          onMouseLeave={handleMouseLeave}
        >
          <Button
            onClick={() => deleteMultiItem()}
            icon={<DeleteTwoTone twoToneColor="#f30303" />}
            loading={deleteMultiLocationMutation.isLoading}
            disabled={selectedRowKeys.length === 0}
            color="danger"
            variant="filled"
          >
            {t('utils.delete')}
          </Button>
          <Form form={locationPanelForm} component={false}>
            <Table
              rowSelection={{
                type: 'checkbox',
                onChange: (selectedRowKeys: React.Key[]) => {
                  setSelectedRowKeys([...selectedRowKeys]);
                }
              }}
              rowKey={(property) => property.id}
              components={{
                body: {
                  cell: EditableCell
                }
              }}
              dataSource={mapData?.locations.map((loc) => {
                return { ...loc, x: loc.x.toFixed(3), y: loc.y.toFixed(3) };
              })}
              columns={mergedColumns as []}
              pagination={{
                onChange: cancel,
                pageSize: 8
              }}
              onRow={(record) => {
                return {
                  onMouseEnter: () =>
                    handleHover(record.locationId, Number(record.x), Number(record.y))
                };
              }}
              bordered
            />
          </Form>
        </Flex>
      </div>
    </>
  );
};

export default memo(AllLocationTable);
