import useRegisterAmr from '@/api/useRegisterAmr';
import { TableProps, Table, Button, Flex, Popconfirm, message } from 'antd';
import { t } from 'i18next';
import { Dispatch, FC, SetStateAction } from 'react';
import {
  CloseCircleOutlined,
  DeleteTwoTone,
  EditOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import styled from 'styled-components';
import client from '@/api/axiosClient';
import { Err } from '@/utils/responseErr';
import { useMutation } from '@tanstack/react-query';

interface DataType {
  id: string;
  full_name: string;
  serialNum: string;
  is_enable: boolean;
  Robot_type: {
    id: string;
    name: string;
    value: string;
  };
}

type When_Finish = {
  id?: string;
  robot_type: string;
  full_name: string;
  serialNum: string;
};

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

const RegisterTable: FC<{
  isEdit: boolean;
  setIsEdit: Dispatch<SetStateAction<boolean>>;
  editData: When_Finish | undefined;
  setEditData: Dispatch<SetStateAction<When_Finish | undefined>>;
}> = ({ isEdit, setIsEdit, setEditData }) => {
  const { data, refetch } = useRegisterAmr();
  const [messageApi, contextHolder] = message.useMessage();

  const deleteMutation = useMutation({
    mutationFn: (payload: { id: string }) => {
      return client.post('api/setting/delete-register-robot', payload);
    },
    onSuccess: async () => {
      messageApi.success(t('utils.success'));
      refetch();
    },
    onError(error: Err) {
      messageApi.error(error.response.data.message);
    }
  });

  const enableMutation = useMutation({
    mutationFn: (payload: { id: string; isEnable: boolean }) => {
      return client.post('api/setting/enable-register-robot', payload);
    },
    onSuccess: async () => {
      messageApi.success(t('utils.success'));
      refetch();
    },
    onError(error: Err) {
      messageApi.error(error.response.data.message);
    }
  });

  const handleEdit = (record: DataType) => {
    setIsEdit(true);
    setEditData({
      id: record.id,
      robot_type: record.Robot_type.value,
      full_name: record.full_name,
      serialNum: record.serialNum
    });
  };

  const handleActive = (isActive: boolean, id: string) => {
    enableMutation.mutate({ id, isEnable: isActive });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const columns: TableProps<DataType>['columns'] = [
    {
      title: t('mission.before_left_charge_station_mission.status'),
      key: 'active',
      dataIndex: 'active',
      width: 100,
      render: (_v: unknown, record: DataType) => {
        return (
          <ActiveBox>
            <Dot $active={record.is_enable as boolean} />{' '}
            <>
              {record.is_enable
                ? t('setting_amr.register_amr.executing')
                : t('setting_amr.register_amr.stale')}
            </>
          </ActiveBox>
        );
      }
    },
    {
      title: 'full_name',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (text) => <a>{text}</a>
    },
    {
      title: 'serialNum',
      dataIndex: 'serialNum',
      key: 'serialNum'
    },
    {
      title: 'robot_type',
      dataIndex: 'robot_type',
      key: 'robot_type',
      render: (_, record) => {
        return record.Robot_type.name;
      }
    },
    {
      title: '',
      dataIndex: 'option',
      key: 'option',
      width: 50,
      render: (_v: unknown, record: DataType) => {
        return (
          <>
            <Flex gap="small">
              {record.is_enable ? (
                <Button
                  onClick={() => handleActive(false, record.id)}
                  icon={<CloseCircleOutlined />}
                  color="default"
                  variant="filled"
                  type="link"
                >
                  {t('utils.inactive')}
                </Button>
              ) : (
                <Button
                  onClick={() => handleActive(true, record.id)}
                  icon={<PlayCircleOutlined />}
                  color="primary"
                  variant="filled"
                  type="link"
                >
                  {t('utils.active')}
                </Button>
              )}

              <Button
                disabled={isEdit}
                onClick={() => handleEdit(record)}
                icon={<EditOutlined />}
                color="primary"
                variant="filled"
                type="link"
              >
                {t('utils.edit')}
              </Button>

              <Popconfirm title="Sure to delete?" onConfirm={() => handleDelete(record.id)}>
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
        );
      }
    }
  ];

  return (
    <>
      {contextHolder}
      <Table<DataType>
        rowKey={(record) => record.id}
        columns={columns}
        dataSource={data as DataType[]}
      />
      ;
    </>
  );
};

export default RegisterTable;
