import { useRemainSchedule } from "@/sockets/useRemainSchedule";
import { useScheduleStatus } from "@/sockets/useScheduleStatus";
import {
  TableColumnsType,
  Table,
  ConfigProvider,
  Tag,
  Tooltip,
  Badge,
  Button,
  Flex,
  message,
} from "antd";
import React, { FC, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { useAtomValue } from "jotai";
import { darkMode } from "@/utils/gloable";
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";

// Industrial Styled Components (matching MissionTable)
const IndustrialTableContainer = styled.div<{ $isDark: boolean }>`
  .ant-table {
    background: ${({ $isDark }) => ($isDark ? "#0f0f0f" : "#ffffff")};
    border: 1px solid ${({ $isDark }) => ($isDark ? "#2a2a2a" : "#d9d9d9")};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .ant-table-thead > tr > th {
    background: ${({ $isDark }) => ($isDark ? "#0a0a0a" : "#fafafa")};
    color: ${({ $isDark }) => ($isDark ? "#00ff41" : "#262626")};
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 1px;
    border-bottom: 2px solid
      ${({ $isDark }) => ($isDark ? "#2a2a2a" : "#d9d9d9")};
    font-family: "Roboto Mono", monospace;
  }

  .ant-table-tbody > tr {
    background: ${({ $isDark }) => ($isDark ? "#0f0f0f" : "#ffffff")};
    transition: all 0.2s ease;
    font-family: "Roboto Mono", monospace;

    &:hover {
      background: ${({ $isDark }) =>
        $isDark ? "#1a1a1a" : "#f0f5ff"} !important;
      box-shadow: 0 2px 4px rgba(24, 144, 255, 0.1);
    }
  }

  .ant-table-tbody > tr > td {
    border-bottom: 1px solid
      ${({ $isDark }) => ($isDark ? "#2a2a2a" : "#f0f0f0")};
    font-size: 12px;
    color: ${({ $isDark }) => ($isDark ? "#00ff41" : "#595959")};
  }

  .ant-pagination {
    font-family: "Roboto Mono", monospace;
  }
`;

const AmrBadge = styled.span<{ $isDark: boolean }>`
  display: inline-block;
  padding: 4px 12px;
  background: ${({ $isDark }) => ($isDark ? "#0a0a0a" : "#e6f7ff")};
  border: 1px solid #1890ff;
  border-radius: 4px;
  color: #1890ff;
  font-family: "Roboto Mono", monospace;
  font-size: 13px;
  font-weight: 600;
`;

const RouteInfo = styled.div<{ $isDark: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  background: ${({ $isDark }) => ($isDark ? "#0a0a0a" : "#fafafa")};
  border: 1px solid ${({ $isDark }) => ($isDark ? "#2a2a2a" : "#d9d9d9")};
  border-radius: 4px;
`;

const RouteNode = styled.div<{ $isDark: boolean; $isStart?: boolean }>`
  font-size: 11px;
  font-family: "Roboto Mono", monospace;
  color: ${({ $isDark, $isStart }) =>
    $isStart ? "#52c41a" : $isDark ? "#00ff41" : "#262626"};
  display: flex;
  align-items: center;
  gap: 6px;

  &::before {
    content: "${({ $isStart }) => ($isStart ? "→" : "⊙")}";
    color: ${({ $isStart }) => ($isStart ? "#52c41a" : "#1890ff")};
    font-weight: bold;
  }
`;

const PriorityBadge = styled.span<{ $priority: number; $isDark: boolean }>`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;

  ${({ $priority, $isDark }) => {
    if ($priority >= 80) {
      return `
        background: ${$isDark ? "#0a0a0a" : "#fff1f0"};
        border: 1px solid #ff4d4f;
        color: #ff4d4f;
      `;
    } else if ($priority >= 50) {
      return `
        background: ${$isDark ? "#0a0a0a" : "#fff7e6"};
        border: 1px solid #faad14;
        color: #faad14;
      `;
    } else {
      return `
        background: ${$isDark ? "#0a0a0a" : "#e6f7ff"};
        border: 1px solid #1890ff;
        color: #1890ff;
      `;
    }
  }}
`;

const TimeTag = styled(Tag)`
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
`;

const StatusHeader = styled.div<{ $isDark: boolean; $status: "1" | "0" }>`
  background: ${({ $isDark }) => ($isDark ? "#0a0a0a" : "#fafafa")};
  border: 1px solid ${({ $isDark }) => ($isDark ? "#2a2a2a" : "#d9d9d9")};
  border-left: 4px solid
    ${({ $status }) => ($status === "1" ? "#52c41a" : "#ff4d4f")};
  padding: 12px 16px;
  margin-bottom: 16px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const StatusText = styled.span<{ $isDark: boolean }>`
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ $isDark }) => ($isDark ? "#00ff41" : "#262626")};
`;

const ButtonWrapper = styled.div`
  width: 100%;
  padding: 0 0 16px 0;
`;

const IndustrialButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.5px;
  height: 36px;
  padding: 0 20px;
  font-weight: 600;
  border-radius: 2px; /* Sharper corners feel more industrial */
  transition: all 0.2s ease;

  /* PAUSE: Warning/Amber Aesthetic */
  &.pause-btn {
    background: #fffbe6; /* Light warning yellow */
    border: 1px solid #ffe58f;
    color: #d48806;

    &:hover:not(:disabled) {
      background: #faad14; /* Warning Gold */
      border-color: #faad14;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(250, 173, 20, 0.3);
    }
  }

  /* RESUME: Tactical Blue Aesthetic */
  &.resume-btn {
    background: #e6f7ff; /* Light processing blue */
    border: 1px solid #91d5ff;
    color: #096dd9;

    &:hover:not(:disabled) {
      background: #1890ff; /* Primary Action Blue */
      border-color: #1890ff;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
    }
  }

  /* DELETE: Hazard Red (Already good, just aligning style) */
  &.delete-btn {
    background: #fff1f0;
    border: 1px solid #ffa39e;
    color: #cf1322;

    &:hover:not(:disabled) {
      background: #ff4d4f;
      border-color: #ff4d4f;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(255, 77, 79, 0.3);
    }
  }

  &:disabled {
    background: #f5f5f5 !important;
    border-color: #d9d9d9 !important;
    color: #bfbfbf !important;
    cursor: not-allowed;
    box-shadow: none !important;
  }
`;

const SvgResumeStyle = styled.svg`
  fill: #096dd9;
  width: 1.2em;
`;
const SvgPauseStyle = styled.svg`
  fill: #d48806;
  width: 1.2em;
`;

type ScheduleDataType = {
  key: string;
  agv_id: string;
  start_time: string;
  priority: number;
  start_node: string;
  end_node: string;
};

const ScheduleTable: FC<{}> = () => {
  const { t } = useTranslation();
  const isDark = useAtomValue(darkMode);
  const remainSchedule = useRemainSchedule();
  const scheduleStatus = useScheduleStatus();
  const [messageApi, contextHolder] = message.useMessage();

  const cMutation = useMutation({
    mutationFn: (command: string) =>
      client.post("/api/missions/schedule-cmd", { cmd: command }),
    onSuccess: () => {
      messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const cmdHandleer = (cmd: string) => {
    cMutation.mutate(cmd);
  };

  const columns: TableColumnsType<ScheduleDataType> = [
    {
      title: "AMR ID",
      dataIndex: "agv_id",
      key: "agv_id",
      width: 150,
      // sorter: (a, b) => a.agv_id.localeCompare(b.agv_id),
      render: (agvId: string) => (
        <Tooltip title={agvId}>
          <AmrBadge $isDark={isDark}>{agvId.split("-")[3] || agvId}</AmrBadge>
        </Tooltip>
      ),
    },
    {
      title: t("mission_history.priority") || "Priority",
      dataIndex: "priority",
      key: "priority",
      width: 120,
      // sorter: (a, b) => b.priority - a.priority,
      render: (priority: number) => (
        <PriorityBadge $priority={priority} $isDark={isDark}>
          {priority}
        </PriorityBadge>
      ),
    },
    {
      title: "Route",
      key: "route",
      render: (_value, record: ScheduleDataType) => (
        <RouteInfo $isDark={isDark}>
          <RouteNode $isDark={isDark} $isStart>
            {record.start_node}
          </RouteNode>
          <RouteNode $isDark={isDark}>{record.end_node}</RouteNode>
        </RouteInfo>
      ),
    },
    {
      title: "Start Time",
      dataIndex: "start_time",
      key: "start_time",
      width: 180,
      // sorter: (a, b) =>
      //   new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      render: (time: string) => (
        <TimeTag icon={<ClockCircleOutlined />} color="blue">
          {time}
        </TimeTag>
      ),
    },
  ];

  const dataSource: ScheduleDataType[] = remainSchedule.map(
    (schedule, index) => ({
      key: `${schedule.agv_id}-${index}`,
      ...schedule,
    }),
  );

  return (
    <ConfigProvider
      theme={{
        components: {
          Table: {
            rowHoverBg: isDark ? "#1a1a1a" : "#f0f5ff",
          },
        },
      }}
    >
      {contextHolder}
      <StatusHeader $isDark={isDark} $status={scheduleStatus.status}>
        <StatusText $isDark={isDark}>Schedule System Status</StatusText>
        <Badge
          status={scheduleStatus.status === "1" ? "processing" : "error"}
          text={
            <span
              style={{
                fontFamily: "Roboto Mono",
                fontSize: 11,
                fontWeight: 600,
                color: scheduleStatus.status === "1" ? "#52c41a" : "#ff4d4f",
              }}
            >
              {scheduleStatus.status === "1" ? (
                <>
                  <CheckCircleOutlined /> ACTIVE
                </>
              ) : (
                <>
                  <CloseCircleOutlined /> INACTIVE
                </>
              )}
            </span>
          }
        />
      </StatusHeader>

      <ButtonWrapper>
        <Flex gap="middle" align="flex-start">
          <IndustrialButton
            onClick={() => cmdHandleer("clear")}
            className="delete-btn"
            icon={<DeleteOutlined />}
          >
            {t("upload.clear")}
          </IndustrialButton>

          <IndustrialButton
            onClick={() => cmdHandleer("resume")}
            className="resume-btn"
            icon={
              <SvgResumeStyle
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <title>play</title>
                <path d="M8,5.14V19.14L19,12.14L8,5.14Z" />
              </SvgResumeStyle>
            }
          >
            {t("upload.resume")}
          </IndustrialButton>

          <IndustrialButton
            onClick={() => cmdHandleer("pause")}
            className="pause-btn"
            icon={
              <SvgPauseStyle
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <title>pause</title>
                <path d="M14,19H18V5H14M6,19H10V5H6V19Z" />
              </SvgPauseStyle>
            }
          >
            {t("upload.pause")}
          </IndustrialButton>
        </Flex>
      </ButtonWrapper>

      <IndustrialTableContainer $isDark={isDark}>
        <Table
          columns={columns}
          dataSource={dataSource}
          bordered
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `TOTAL: ${total} SCHEDULES`,
          }}
        />
      </IndustrialTableContainer>
    </ConfigProvider>
  );
};

export default ScheduleTable;
