import {
  Additional_Mission_Info,
  MissionInfo,
  useMissions,
} from "../../../../sockets/useMissions";
import {
  TableColumnsType,
  Table,
  Spin,
  ConfigProvider,
  Button,
  Flex,
  Tooltip,
  Tag,
  Checkbox,
} from "antd";
import { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { translate } from "@/i18n";
import { darkMode } from "@/utils/gloable";
import { useAtomValue } from "jotai";
import client from "@/api/axiosClient";
import { useMutation } from "@tanstack/react-query";
import useName from "@/api/useAmrName";
import MissionHistory from "./MissionHistory";
import { useRejectMission } from "@/sockets/useRejectMission";
import { DeleteOutlined, HistoryOutlined } from "@ant-design/icons";
import { MissionStatus } from "@/types/mission";
import I18nCancelReason from "@/i18n/I18nCancelReason";

const MISSION_SORT = [
  "executing",
  "assigned",
  "pending",
  "completed",
  "aborting",
  "canceled",
];

// Industrial Styled Components
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

const TaskInfo = styled.div<{ $isDark: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 8px 12px;
  background: ${({ $isDark }) => ($isDark ? "#0a0a0a" : "#fafafa")};
  border: 1px solid ${({ $isDark }) => ($isDark ? "#2a2a2a" : "#d9d9d9")};
  border-radius: 4px;
  transition: all 0.2s ease;
`;

const TaskTitle = styled.div<{ $isDark: boolean }>`
  font-size: 12px;
  font-weight: 600;
  color: ${({ $isDark }) => ($isDark ? "#00ff41" : "#262626")};
  margin-bottom: 4px;
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SubTitle = styled.div<{ $isDark: boolean }>`
  font-size: 11px;
  color: ${({ $isDark }) => ($isDark ? "#666" : "#8c8c8c")};
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: "Roboto Mono", monospace;

  &::before {
    content: "→";
    color: #1890ff;
    font-weight: bold;
  }
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
  border-radius: 4px;
  transition: all 0.2s ease;

  &.delete-btn {
    background: #fff1f0;
    border: 1px solid #ff4d4f;
    color: #ff4d4f;

    &:hover:not(:disabled) {
      background: #ff4d4f;
      border-color: #ff4d4f;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(255, 77, 79, 0.3);
    }

    &:disabled {
      background: #f5f5f5;
      border-color: #d9d9d9;
      color: #bfbfbf;
    }
  }

  &.history-btn {
    background: #e6f7ff;
    border: 1px solid #1890ff;
    color: #1890ff;

    &:hover {
      background: #1890ff;
      border-color: #1890ff;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
    }
  }
`;

const MissionIdTag = styled(Tag)`
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 8px;
  cursor: pointer;
`;

const AmrBadge = styled.span<{ $isDark: boolean }>`
  display: inline-block;
  padding: 2px 8px;
  background: ${({ $isDark }) => ($isDark ? "#0a0a0a" : "#e6f7ff")};
  border: 1px solid #1890ff;
  border-radius: 4px;
  color: #1890ff;
  font-family: "Roboto Mono", monospace;
  font-size: 13px;
  font-weight: 600;
`;

const StatusBadge = styled.span<{ $status: MissionStatus; $isDark: boolean }>`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;

  ${({ $status, $isDark }) => {
    const statusColors: Record<
      string,
      { bg: string; border: string; text: string }
    > = {
      executing: {
        bg: $isDark ? "#0a0a0a" : "#f6ffed",
        border: "#52c41a",
        text: "#52c41a",
      },
      assigned: {
        bg: $isDark ? "#0a0a0a" : "#e6f7ff",
        border: "#1890ff",
        text: "#1890ff",
      },
      pending: {
        bg: $isDark ? "#0a0a0a" : "#fff7e6",
        border: "#faad14",
        text: "#faad14",
      },
      completed: {
        bg: $isDark ? "#0a0a0a" : "#fafafa",
        border: "#8c8c8c",
        text: "#8c8c8c",
      },
      aborting: {
        bg: $isDark ? "#0a0a0a" : "#fff1f0",
        border: "#ff4d4f",
        text: "#ff4d4f",
      },
      canceled: {
        bg: $isDark ? "#0a0a0a" : "#fff1f0",
        border: "#ff4d4f",
        text: "#ff4d4f",
      },
    };

    const color = statusColors[$status.toLowerCase()] || statusColors.pending;
    return `
      background: ${color.bg};
      border: 1px solid ${color.border};
      color: ${color.text};
    `;
  }}
`;

const IndustrialCheckboxGroup = styled.div<{ $isDark: boolean }>`
  background: ${({ $isDark }) => ($isDark ? "#0a0a0a" : "#fafafa")};
  padding: 12px;
  border: 1px solid ${({ $isDark }) => ($isDark ? "#2a2a2a" : "#d9d9d9")};
  border-radius: 4px;
  margin-bottom: 16px;
  display: inline-block;
  width: 100%;

  .ant-checkbox-group {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  /* Label Text Style */
  .ant-checkbox-wrapper {
    color: ${({ $isDark }) => ($isDark ? "#00ff41" : "#262626")};
    font-family: "Roboto Mono", monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;

    &:hover .ant-checkbox-inner {
      border-color: #1890ff;
    }
  }

  /* Checkbox Box Style */
  .ant-checkbox-inner {
    background-color: ${({ $isDark }) => ($isDark ? "#000" : "#fff")};
    border-color: ${({ $isDark }) => ($isDark ? "#2a2a2a" : "#d9d9d9")};
    border-radius: 2px;
  }

  /* Checked State */
  .ant-checkbox-checked .ant-checkbox-inner {
    background-color: #1890ff;
    border-color: #1890ff;
  }

  /* Label when checked */
  .ant-checkbox-wrapper-checked {
    font-weight: 600;
  }
`;

type SelectMissionT = {
  amrId?: string;
  taskId?: string;
  missionId?: string;
  status?: string;
};

const defaultOpenColumn = ["amrId", "missionStatus", "taskInfo"];

const MissionTable = () => {
  const { t } = useTranslation();
  const isDark = useAtomValue(darkMode);
  const { data: name } = useName();
  const [selectionType] = useState<"checkbox" | "radio">("checkbox");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectInfo, setSelectInfo] = useState<MissionInfo[]>([]);
  const { missions } = useMissions();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 767);
  const [, setWindowHeight] = useState(window.innerHeight);
  const [isOpenMissionHistory, setIsOpenMissionHistory] = useState(false);
  const rejectMission = useRejectMission();
  const [checkedList, setCheckedList] = useState(defaultOpenColumn);

  const openHistory = () => {
    setIsOpenMissionHistory(true);
  };

  useEffect(() => {
    const updateHeight = () => setWindowHeight(window.innerHeight);
    window.addEventListener("resize", updateHeight);
    updateHeight();
    return () => window.removeEventListener("resize", updateHeight);
  }, [isMobile]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 767);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const columns: TableColumnsType<MissionInfo> = [
    {
      title: t("mission_history.mission_id"),
      dataIndex: "missionId",
      key: "missionId",
      sorter: (a, b) => a.id.localeCompare(b.id),
      width: 150,
      render: (missionId: string) => {
        const info = rejectMission?.[missionId];
        if (!info) return <MissionIdTag color="blue">{missionId}</MissionIdTag>;

        const tooltipContent = (
          <div
            style={{ maxWidth: 260, fontFamily: "Roboto Mono", fontSize: 11 }}
          >
            {info.map((entry, idx) => (
              <div key={idx} style={{ marginBottom: 4 }}>
                <strong>{entry.amrId}</strong>: {entry.reason}
              </div>
            ))}
          </div>
        );

        return (
          <Tooltip title={tooltipContent} color="blue" placement="right">
            <MissionIdTag color="blue">{missionId}</MissionIdTag>
          </Tooltip>
        );
      },
    },
    {
      title: "AMR",
      dataIndex: "amrId",
      key: "amrId",
      render: (code: string) => {
        return (
          <Tooltip title={code ? code : t("main_task_list.wait_suitable")}>
            <AmrBadge $isDark={isDark}>
              {code ? code.split("-")[3] : t("main_task_list.wait_suitable")}
            </AmrBadge>
          </Tooltip>
        );
      },
      filters: name?.amrs.map((amrInfo) => ({
        text: `${amrInfo.amrId}`,
        value: `${amrInfo.amrId}`,
      })),
      onFilter: (value, record) => record.amrId === value,
    },
    {
      title: t("mission.task_table.status"),
      dataIndex: "missionStatus",
      key: "missionStatus",
      render: (status: MissionStatus, record) => {
        if (
          record.status === MissionStatus.CANCELED ||
          record.status === MissionStatus.ABORTING
        ) {
          return (
            <Tooltip title={<I18nCancelReason reason={record.cancelReason} />}>
              <StatusBadge $status={status} $isDark={isDark}>
                {status}
              </StatusBadge>
            </Tooltip>
          );
        }

        return (
          <StatusBadge $status={status} $isDark={isDark}>
            {status}
          </StatusBadge>
        );
      },
      filters: MISSION_SORT.map((state) => ({
        text: `${translate("normal", state)}`,
        value: `${translate("normal", state)}`,
      })),
      onFilter: (value, record) => record.missionStatus === value,
    },
    {
      title: t("toolbar.mission.mission"),
      dataIndex: "taskInfo",
      key: "taskInfo",
      render: (_value, record: MissionInfo) => {
        if (typeof record.info === "string") {
          const parseData = JSON.parse(record.info) as Additional_Mission_Info;
          const fullName =
            parseData.missionFullName === null
              ? "-"
              : parseData.missionFullName;

          return (
            <TaskInfo $isDark={isDark}>
              <TaskTitle $isDark={isDark}>
                {typeof fullName === "string"
                  ? "-"
                  : fullName?.join(" - ") || "-"}
              </TaskTitle>
              <SubTitle $isDark={isDark}>{record.sub_name}</SubTitle>
            </TaskInfo>
          );
        }
        return <span>-</span>;
      },
    },
    {
      title: t("utils.cost_time"),
      dataIndex: "totalTime",
      key: "totalTime",
      render: (time: string) => (
        <span style={{ fontFamily: "Roboto Mono", fontWeight: 600 }}>
          {time ? `${time}m` : "-"}
        </span>
      ),
    },
  ].filter((item) => {
    if (!isMobile) return true;
    return item.key !== "taskInfo";
  });

  const newColumns = columns.map((item) => ({
    ...item,
    hidden: !checkedList.includes(item.key as string),
  }));

  const options = columns.map(({ key, title }) => ({
    label: title,
    value: key,
  }));

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedRowKey: React.Key[], selectedRows: MissionInfo[]) => {
      setSelectInfo(selectedRows);
      setSelectedRowKeys(selectedRowKey);
    },
    getCheckboxProps: (record: MissionInfo) => ({
      disabled: record.amrId === "Disabled User",
    }),
  };

  const deleteMissionMutation = useMutation({
    mutationFn: (deleteList: SelectMissionT[]) => {
      return client.post(
        "/api/missions/delete-mission",
        { selectedMission: deleteList },
        {
          headers: { authorization: `Bearer ${localStorage.getItem("_KMT")}` },
        },
      );
    },
    onSuccess: () => {
      setSelectedRowKeys([]);
      setSelectInfo([]);
    },
  });

  const handleDeleteMission = () => {
    if (selectInfo.length === 0) return;

    const convertArr = selectInfo
      .filter((v) => v.missionId !== null)
      .map((v) => ({
        amrId: v.amrId,
        missionId: v.missionId,
        status: v.missionStatus,
      }));

    deleteMissionMutation.mutate(convertArr);
  };

  if (!missions || !name?.amrs)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: "100%",
        }}
      >
        <Spin size="large" />
      </div>
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
      <MissionHistory
        isOpenMissionHistory={isOpenMissionHistory}
        setIsOpenMissionHistory={setIsOpenMissionHistory}
      />

      <ButtonWrapper>
        <Flex gap="middle" align="flex-start">
          <IndustrialButton
            className="delete-btn"
            onClick={handleDeleteMission}
            disabled={!selectInfo.length}
            loading={deleteMissionMutation.isPending}
            icon={<DeleteOutlined />}
          >
            {t("utils.delete")} ({selectInfo.length})
          </IndustrialButton>
          <IndustrialButton
            className="history-btn"
            onClick={openHistory}
            icon={<HistoryOutlined />}
          >
            {t("mission_history.open")}
          </IndustrialButton>
        </Flex>
      </ButtonWrapper>
      <IndustrialCheckboxGroup $isDark={isDark}>
        <div
          style={{
            marginBottom: 8,
            fontSize: 10,
            color: isDark ? "#666" : "#8c8c8c",
            fontFamily: "Roboto Mono",
          }}
        >
          {t("mission_history.column_select")}
        </div>
        <Checkbox.Group
          value={checkedList}
          options={options as any}
          onChange={(value) => {
            setCheckedList(value as string[]);
          }}
        />
      </IndustrialCheckboxGroup>
      <IndustrialTableContainer $isDark={isDark}>
        <Table
          columns={newColumns}
          style={{ width: "100%" }}
          rowSelection={{
            type: selectionType,
            ...rowSelection,
          }}
          dataSource={
            missions
              .sort((a, b) => {
                const isCompleteA = a.missionStatus === "completed";
                const isCompleteB = b.missionStatus === "completed";
                const typeDiff =
                  MISSION_SORT.indexOf(a.missionStatus as string) -
                  MISSION_SORT.indexOf(b.missionStatus as string);
                if (typeDiff !== 0) return typeDiff;
                if (isCompleteA && isCompleteB) {
                  return b.createdAt.getTime() - a.createdAt.getTime();
                }
                if (!isCompleteA && !isCompleteB) {
                  return a.order - b.order;
                }
                return (
                  MISSION_SORT.indexOf(a.missionStatus) -
                  MISSION_SORT.indexOf(b.missionStatus)
                );
              })
              .map((m) => ({
                ...m,
                missionStatus: translate("normal", m.missionStatus) || "",
                missionType: translate("normal", m.missionType) || "",
                manualMode: m.manualMode ? t("utils.yes") : t("utils.no"),
                emergencyBtn: m.emergencyBtn ? t("utils.yes") : t("utils.no"),
                recoveryBtn: m.recoveryBtn ? t("utils.yes") : t("utils.no"),
                totalTime:
                  m.completedAt && m.createdAt
                    ? Math.round(
                        (m.completedAt.getTime() -
                          (m.startedAt?.getTime() || 0)) /
                          6000,
                      ) / 10
                    : "",
              })) as []
          }
          bordered
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `TOTAL: ${total} MISSIONS`,
          }}
        />
      </IndustrialTableContainer>
    </ConfigProvider>
  );
};

export default memo(MissionTable);
