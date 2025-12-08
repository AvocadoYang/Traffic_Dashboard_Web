// ============= RegisterTable.tsx =============
import useRegisterAmr from "@/api/useRegisterAmr";
import { TableProps, Table, Button, Flex, Popconfirm, message } from "antd";
import { Dispatch, FC, SetStateAction } from "react";
import {
  CloseCircleOutlined,
  DeleteTwoTone,
  EditOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import styled from "styled-components";
import client from "@/api/axiosClient";
import { Err } from "@/utils/responseErr";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

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

const IndustrialTableContainer = styled.div`
  width: 100%;

  .ant-table {
    background: #ffffff;
    border: 1px solid #d9d9d9;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .ant-table-thead > tr > th {
    background: #fafafa;
    color: #262626;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 1px;
    border-bottom: 2px solid #d9d9d9;
    font-family: "Roboto Mono", monospace;
  }

  .ant-table-tbody > tr {
    background: #ffffff;
    transition: all 0.2s ease;
    font-family: "Roboto Mono", monospace;

    &:hover {
      background: #f0f5ff !important;
      box-shadow: 0 2px 4px rgba(24, 144, 255, 0.1);
    }
  }

  .ant-table-tbody > tr > td {
    border-bottom: 1px solid #f0f0f0;
    font-size: 12px;
    color: #595959;
  }
`;

const StatusIndicator = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
  color: ${({ $active }) => ($active ? "#52c41a" : "#8c8c8c")};

  &::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $active }) => ($active ? "#52c41a" : "#8c8c8c")};
    box-shadow: ${({ $active }) =>
      $active ? "0 0 8px rgba(82, 196, 26, 0.6)" : "none"};
  }
`;

const DataText = styled.span`
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  font-weight: 500;
  color: #262626;
`;

const RobotTypeBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  background: #e6f7ff;
  border: 1px solid #1890ff;
  border-radius: 4px;
  color: #1890ff;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  font-weight: 600;
`;

const IndustrialButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.5px;
  height: 32px;
  font-weight: 600;
  border-radius: 4px;
  transition: all 0.2s ease;

  &.delete-btn {
    background: #fff1f0;
    border: 1px solid #ff4d4f;
    color: #ff4d4f;

    &:hover {
      background: #ff4d4f;
      border-color: #ff4d4f;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(255, 77, 79, 0.3);
    }
  }

  &.edit-btn {
    background: #e6f7ff;
    border: 1px solid #1890ff;
    color: #1890ff;

    &:hover:not(:disabled) {
      background: #1890ff;
      border-color: #1890ff;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
    }

    &:disabled {
      background: #f5f5f5;
      border-color: #d9d9d9;
      color: #bfbfbf;
    }
  }

  &.active-btn {
    background: #f6ffed;
    border: 1px solid #52c41a;
    color: #52c41a;

    &:hover {
      background: #52c41a;
      border-color: #52c41a;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(82, 196, 26, 0.3);
    }
  }

  &.inactive-btn {
    background: #fafafa;
    border: 1px solid #8c8c8c;
    color: #595959;

    &:hover {
      background: #8c8c8c;
      border-color: #8c8c8c;
      color: #ffffff;
    }
  }

  &.reload-btn {
    background: #ffffff;
    border: 1px solid #d9d9d9;
    color: #595959;

    &:hover {
      background: #fafafa;
      border-color: #1890ff;
      color: #1890ff;
    }
  }
`;

const RegisterTable: FC<{
  isEdit: boolean;
  setIsEdit: Dispatch<SetStateAction<boolean>>;
  editData: When_Finish | undefined;
  setEditData: Dispatch<SetStateAction<When_Finish | undefined>>;
}> = ({ isEdit, setIsEdit, setEditData }) => {
  const { data, refetch } = useRegisterAmr();
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useTranslation();

  const deleteMutation = useMutation({
    mutationFn: (payload: { id: string }) => {
      return client.post("api/setting/delete-register-robot", payload);
    },
    onSuccess: async () => {
      messageApi.success(t("utils.success"));
      refetch();
    },
    onError(error: Err) {
      messageApi.error(error.response.data.message);
    },
  });

  const enableMutation = useMutation({
    mutationFn: (payload: { id: string; isEnable: boolean }) => {
      return client.post("api/setting/enable-register-robot", payload);
    },
    onSuccess: async () => {
      messageApi.success(t("utils.success"));
      refetch();
    },
    onError(error: Err) {
      messageApi.error(error.response.data.message);
    },
  });

  const handleEdit = (record: DataType) => {
    setIsEdit(true);
    setEditData({
      id: record.id,
      robot_type: record.Robot_type.value,
      full_name: record.full_name,
      serialNum: record.serialNum,
    });
  };

  const handleActive = (isActive: boolean, id: string) => {
    enableMutation.mutate({ id, isEnable: isActive });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const columns: TableProps<DataType>["columns"] = [
    {
      title: t("mission.before_left_charge_station_mission.status"),
      key: "active",
      dataIndex: "active",
      width: "15%",
      render: (_v: unknown, record: DataType) => {
        return (
          <StatusIndicator $active={record.is_enable}>
            {record.is_enable
              ? t("setting_amr.register_amr.executing")
              : t("setting_amr.register_amr.stale")}
          </StatusIndicator>
        );
      },
    },
    {
      title: "FULL NAME",
      dataIndex: "full_name",
      key: "full_name",
      width: "20%",
      render: (text) => <DataText>{text}</DataText>,
    },
    {
      title: "SERIAL NUMBER",
      dataIndex: "serialNum",
      key: "serialNum",
      width: "25%",
      render: (text) => <DataText>{text}</DataText>,
    },
    {
      title: "ROBOT TYPE",
      dataIndex: "robot_type",
      key: "robot_type",
      width: "15%",
      render: (_, record) => {
        return <RobotTypeBadge>{record.Robot_type.name}</RobotTypeBadge>;
      },
    },
    {
      title: "ACTIONS",
      dataIndex: "option",
      key: "option",
      width: "25%",
      render: (_v: unknown, record: DataType) => {
        return (
          <Flex gap="small" wrap>
            {record.is_enable ? (
              <IndustrialButton
                className="inactive-btn"
                onClick={() => handleActive(false, record.id)}
                icon={<CloseCircleOutlined />}
                size="small"
              >
                {t("utils.inactive")}
              </IndustrialButton>
            ) : (
              <IndustrialButton
                className="active-btn"
                onClick={() => handleActive(true, record.id)}
                icon={<PlayCircleOutlined />}
                size="small"
              >
                {t("utils.active")}
              </IndustrialButton>
            )}

            <IndustrialButton
              className="edit-btn"
              disabled={isEdit}
              onClick={() => handleEdit(record)}
              icon={<EditOutlined />}
              size="small"
            >
              {t("utils.edit")}
            </IndustrialButton>

            <Popconfirm
              title={t("utils.delete_warn") || "Sure to delete?"}
              onConfirm={() => handleDelete(record.id)}
            >
              <IndustrialButton
                className="delete-btn"
                icon={<DeleteTwoTone twoToneColor="#ff4d4f" />}
                size="small"
              >
                {t("utils.delete")}
              </IndustrialButton>
            </Popconfirm>
          </Flex>
        );
      },
    },
  ];

  return (
    <IndustrialTableContainer>
      {contextHolder}
      <div style={{ marginBottom: 16 }}>
        <IndustrialButton
          className="reload-btn"
          onClick={() => refetch()}
          icon={<ReloadOutlined />}
        >
          {t("utils.reload")}
        </IndustrialButton>
      </div>
      <Table<DataType>
        rowKey={(record) => record.id}
        columns={columns}
        dataSource={data as DataType[]}
        bordered
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `TOTAL: ${total} ROBOTS`,
        }}
      />
    </IndustrialTableContainer>
  );
};

export default RegisterTable;
