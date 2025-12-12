import { Button, Flex, message, Popconfirm, Skeleton, Table } from "antd";
import {
  CloseCircleOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import styled from "styled-components";
import useBLCS from "@/api/useBeforeleftChargeStation";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";

interface DataType {
  id: string;
  active: boolean;
  amrId: string[];
  missionId: string;
  name: string;
}

const IndustrialTable = styled(Table)`
  .ant-table {
    border: 1px solid #d9d9d9;
    border-radius: 0;
    font-family: "Roboto Mono", monospace;
  }

  .ant-table-thead > tr > th {
    background: #fafafa;
    border-bottom: 2px solid #d9d9d9;
    color: #595959;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;
    padding: 12px 16px;

    &::before {
      display: none;
    }
  }

  .ant-table-tbody > tr {
    transition: all 0.2s;
    position: relative;

    &:hover {
      background: #f9f0ff;

      &::before {
        width: 4px;
      }

      td {
        background: transparent;
      }
    }
  }

  .ant-table-tbody > tr > td {
    border-bottom: 1px solid #f0f0f0;
    padding: 12px 16px;
    font-size: 12px;
  }
`;

const IndustrialButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 32px;
  font-weight: 600;
  border-radius: 0;
  transition: all 0.2s ease;

  &.activate-btn {
    background: #ffffff;
    border: 1px solid #52c41a;
    color: #52c41a;

    &:hover {
      background: #f6ffed;
      border-color: #73d13d;
      color: #73d13d;
    }
  }

  &.deactivate-btn {
    background: #ffffff;
    border: 1px solid #faad14;
    color: #faad14;

    &:hover {
      background: #fffbe6;
      border-color: #ffc53d;
      color: #ffc53d;
    }
  }

  &.delete-btn {
    background: #ffffff;
    border: 1px solid #ff4d4f;
    color: #ff4d4f;

    &:hover {
      background: #fff1f0;
      border-color: #ff7875;
      color: #ff7875;
    }
  }
`;

const StatusBadge = styled.div<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: ${({ $active }) => ($active ? "#f6ffed" : "#fafafa")};
  border: 1px solid ${({ $active }) => ($active ? "#52c41a" : "#d9d9d9")};
  color: ${({ $active }) => ($active ? "#52c41a" : "#8c8c8c")};
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const StatusDot = styled.div<{ $active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $active }) => ($active ? "#52c41a" : "#8c8c8c")};
  box-shadow: 0 0 8px
    ${({ $active }) =>
      $active ? "rgba(82, 196, 26, 0.5)" : "rgba(140, 140, 140, 0.3)"};
`;

const AmrList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const AmrTag = styled.span`
  padding: 2px 8px;
  background: #f9f0ff;
  border: 1px solid #d3adf7;
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  color: #722ed1;
  text-transform: uppercase;
  display: inline-block;
`;

export const BeforeLeftChargeStationTable: FC = () => {
  const { data, isLoading, refetch } = useBLCS();
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const activeMutation = useMutation({
    mutationFn: (payload: { id: string; isActive: boolean }) => {
      return client.post("api/setting/active-BLCS", payload);
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: { id: string }) => {
      return client.post("api/setting/delete-BLCS", payload);
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleActive = (isActive: boolean, id: string) => {
    activeMutation.mutate({ id, isActive });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const columns = [
    {
      title: t("mission.before_left_charge_station_mission.status"),
      key: "active",
      dataIndex: "active",
      width: 140,
      render: (_v: unknown, record: DataType) => {
        return (
          <StatusBadge $active={record.active}>
            <StatusDot $active={record.active} />
            {record.active
              ? t("mission.before_left_charge_station_mission.executing")
              : t("mission.before_left_charge_station_mission.stale")}
          </StatusBadge>
        );
      },
    },
    {
      title: t("mission.before_left_charge_station_mission.mission"),
      dataIndex: "name",
      key: "name",
      render: (text: string) => (
        <Flex align="center" gap="small">
          <ThunderboltOutlined style={{ color: "#722ed1" }} />
          <span style={{ fontWeight: 600 }}>{text}</span>
        </Flex>
      ),
    },
    {
      title: t("mission.before_left_charge_station_mission.car"),
      dataIndex: "amrId",
      key: "amrId",
      render: (_v: unknown, record: DataType) => {
        return (
          <AmrList>
            {record.amrId.map((s, i) => {
              const subName = s.split("-").slice(1).join("-");
              return <AmrTag key={`${subName}-${i}`}>{subName}</AmrTag>;
            })}
          </AmrList>
        );
      },
    },
    {
      title: "Actions",
      dataIndex: "option",
      key: "option",
      width: 280,
      render: (_v: unknown, record: DataType) => {
        return (
          <Flex gap="small" wrap="wrap">
            {record.active ? (
              <IndustrialButton
                className="deactivate-btn"
                onClick={() => handleActive(false, record.id)}
                icon={<CloseCircleOutlined />}
                size="small"
              >
                Stop
              </IndustrialButton>
            ) : (
              <IndustrialButton
                className="activate-btn"
                onClick={() => handleActive(true, record.id)}
                icon={<PlayCircleOutlined />}
                size="small"
              >
                Start
              </IndustrialButton>
            )}
            <Popconfirm
              title="Delete configuration?"
              description="Are you sure you want to delete this configuration?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <IndustrialButton
                className="delete-btn"
                icon={<DeleteOutlined />}
                size="small"
              >
                Delete
              </IndustrialButton>
            </Popconfirm>
          </Flex>
        );
      },
    },
  ];

  if (isLoading) return <Skeleton />;
  return (
    <>
      {contextHolder}
      <IndustrialTable
        rowKey={(record: any) => record.missionId}
        columns={columns as []}
        dataSource={data as DataType[]}
        pagination={{
          pageSize: 10,
          showTotal: (total, range) => (
            <span style={{ fontFamily: "Roboto Mono, monospace" }}>
              {range[0]}-{range[1]} of {total}
            </span>
          ),
        }}
      />
    </>
  );
};

export default BeforeLeftChargeStationTable;
