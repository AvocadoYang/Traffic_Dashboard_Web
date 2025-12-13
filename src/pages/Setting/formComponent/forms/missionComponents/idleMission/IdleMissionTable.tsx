import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import {
  CloseCircleOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Flex, Popconfirm, Table, message } from "antd";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { array, boolean, number, object, string } from "yup";

const getTopic = async () => {
  const { data } = await client.get<unknown>("api/setting/idle-task");

  const schema = () =>
    array(
      object({
        id: string().required(),
        idleMin: number().required(),
        active: boolean().required(),
        preventLocation: array(string().optional()).optional().nullable(),
        taskName: string().required(),
        taskId: string().required(),

        amr: array(
          object({
            fullName: string().optional(),
            id: string().optional(),
            isReal: boolean().optional(),
          })
        )
          .optional()
          .nullable(),
      }).required()
    ).required();

  return schema().validate(data, { stripUnknown: true });
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1em;
  align-items: flex-start;
  width: 100%;
`;

const IndustrialTable = styled(Table)`
  width: 100%;

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
      background: #e6fffb;

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

  &.reload-btn {
    background: #ffffff;
    border: 1px solid #d9d9d9;
    color: #595959;
    width: 36px;
    min-width: 36px;
    padding: 0;

    &:hover {
      background: #fafafa;
      border-color: #13c2c2;
      color: #13c2c2;
    }
  }

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
  background: #e6fffb;
  border: 1px solid #87e8de;
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  color: #13c2c2;
  text-transform: uppercase;
  display: inline-block;
`;

const LocationTag = styled.span`
  background: #fff1f0;
  border: 1px solid #ffccc7;
  color: #ff4d4f;
  padding: 2px 8px;
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  display: inline-block;
`;

const TimeValue = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  padding: 4px 12px;
  background: #e6fffb;
  border: 1px solid #13c2c2;
  color: #13c2c2;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  font-weight: 700;
`;

interface DataType {
  id: string;
  idleMin: number;
  active: boolean;
  preventLocation: string[] | null;
  taskName: string;
  taskId: string;

  amr: {
    isReal: boolean;
    fullName: string;
    id: string;
  }[];
}

const IdleMissionTable: FC = () => {
  const { t } = useTranslation();
  const { data: idleData, refetch } = useQuery(["idle-task"], getTopic);

  const [messageApi, contextHolder] = message.useMessage();

  const activeMutation = useMutation({
    mutationFn: (payload: { idle_id: string; isActive: boolean }) => {
      return client.post("api/setting/active-idle-task", payload);
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: { idle_id: string }) => {
      return client.post("api/setting/delete-idle-task", payload);
    },
    onSuccess() {
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleActive = (isActive: boolean, id: string) => {
    activeMutation.mutate({ idle_id: id, isActive });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ idle_id: id });
  };

  const columns = [
    {
      title: t("mission.idle_mission.status"),
      key: "active",
      dataIndex: "active",
      width: 140,
      render: (_v: unknown, record: DataType) => {
        return (
          <StatusBadge $active={record.active}>
            <StatusDot $active={record.active} />
            {record.active
              ? t("mission.idle_mission.executing")
              : t("mission.idle_mission.stale")}
          </StatusBadge>
        );
      },
    },
    {
      title: t("mission.idle_mission.car"),
      dataIndex: "amrId",
      key: "amrId",
      width: 200,
      render: (_: unknown, record: DataType) => {
        return (
          <AmrList>
            {record.amr.map((item, i) => (
              <AmrTag key={`${item.fullName}-${i}`}>{item.fullName}</AmrTag>
            ))}
          </AmrList>
        );
      },
    },
    {
      title: t("mission.idle_mission.idle_min"),
      dataIndex: "idleMin",
      key: "idleMin",
      width: 120,
      render: (_v: unknown, record: DataType) => {
        return <TimeValue>{record.idleMin} min</TimeValue>;
      },
    },
    {
      title: t("mission.idle_mission.mission"),
      dataIndex: "missionName",
      key: "missionName",
      render: (_v: unknown, record: DataType) => {
        return (
          <Flex align="center" gap="small">
            <ClockCircleOutlined style={{ color: "#13c2c2" }} />
            <span style={{ fontWeight: 600 }}>{record.taskName}</span>
          </Flex>
        );
      },
    },
    {
      title: t("mission.idle_mission.forbidden"),
      dataIndex: "preventLocation",
      key: "preventLocation",
      render: (_v: unknown, record: DataType) => {
        if (!record.preventLocation || record.preventLocation.length === 0) {
          return (
            <span
              style={{
                color: "#bfbfbf",
                fontStyle: "italic",
                fontSize: "11px",
                textTransform: "uppercase",
                fontFamily: "Roboto Mono, monospace",
              }}
            >
              [ None ]
            </span>
          );
        }

        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {record.preventLocation.map((location, index) => (
              <LocationTag key={index}>{location}</LocationTag>
            ))}
          </div>
        );
      },
    },
    {
      title: "Actions",
      width: 280,
      dataIndex: "operation",
      key: "operation",
      render(_v: unknown, record: DataType) {
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
              title="Delete idle mission?"
              description="Are you sure you want to delete this idle mission?"
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

  return (
    <Wrapper>
      {contextHolder}
      <IndustrialButton
        className="reload-btn"
        onClick={() => refetch()}
        icon={<ReloadOutlined />}
      />
      <IndustrialTable
        rowKey={(record) => record.id}
        columns={columns}
        dataSource={idleData as DataType[]}
        pagination={{
          pageSize: 10,
          showTotal: (total, range) => (
            <span style={{ fontFamily: "Roboto Mono, monospace" }}>
              {range[0]}-{range[1]} of {total}
            </span>
          ),
        }}
      />
    </Wrapper>
  );
};

export default IdleMissionTable;
