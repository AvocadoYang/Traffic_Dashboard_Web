import { etaText } from "@/utils/eta";
import {
  Additional_Mission_Info,
  MissionInfo,
  useMissions,
} from "../../../../sockets/useMissions";
import { usePermission } from "@/utils/permissions";
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
import styled, { css, keyframes } from "styled-components";
import { amrId2ColorRainbow } from "@/utils/utils";
import { translate } from "@/i18n";
import { darkMode } from "@/utils/gloable";
import { useAtomValue } from "jotai";
import client from "@/api/axiosClient";
import { useMutation } from "@tanstack/react-query";
import useName from "@/api/useAmrName";
import MissionHistory from "./MissionHistory";
import { useRejectMission } from "@/sockets/useRejectMission";
import {
  DeleteOutlined,
  FilterOutlined,
  HistoryOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import MissionRejectHint, {
  needsFix,
  rejectEntries,
} from "@/components/MissionRejectHint";
import { MissionStatus } from "@/types/mission";
import I18nCancelReason from "@/i18n/I18nCancelReason";
import { themeAtom } from "@/theme";

const MISSION_SORT = [
  "executing",
  "assigned",
  "pending",
  "waiting",
  "completed",
  "aborting",
  "canceled",
];

// 表格: 不畫直線格線, 細邊框 + 圓角; 表頭用小字, 不再全大寫等寬字
const IndustrialTableContainer = styled.div<{ $isDark: boolean }>`
  .ant-table {
    background-color: var(--c-bg);
    background-image: var(--panel-sheen);
    border: 1px solid var(--c-border);
    border-radius: 0;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  }

  .ant-table-thead > tr > th {
    background: transparent;
    color: var(--c-text-muted);
    font-weight: 600;
    font-size: var(--font-sm); /* 表頭有中文, 不要再小 */
    letter-spacing: 0.12em;
    padding: 8px 10px;
    border-bottom: 1px solid var(--c-border);
    white-space: nowrap;

    &::before {
      display: none; /* 表頭欄位之間的分隔線 */
    }
  }

  .ant-table-tbody > tr {
    background: transparent;
    transition: background-color 0.15s ease;
  }

  .ant-table-tbody > tr > td {
    padding: 10px;
    border-bottom: 1px solid var(--c-border);
    font-size: 12.5px;
    color: var(--c-text);
    vertical-align: middle;
  }

  .ant-table-tbody > tr:last-child > td {
    border-bottom: 0;
  }

  .ant-pagination {
    font-variant-numeric: tabular-nums;
  }
`;

// 任務內容: 任務名稱 + 下一行灰字的子任務名, 不再包一個框
const TaskInfo = styled.div<{ $isDark: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
`;

const TaskTitle = styled.div<{ $isDark: boolean }>`
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--c-text);
`;

const SubTitle = styled.div<{ $isDark: boolean }>`
  font-size: var(--font-sm);
  line-height: 1.4;
  color: var(--c-text-muted);
  display: flex;
  align-items: center;
  gap: 4px;

  &::before {
    content: "→";
    color: var(--c-header-accent);
  }
`;

const ButtonWrapper = styled.div`
  width: 100%;
  padding: 0 0 12px 0;
`;

const IndustrialButton = styled(Button)`
  font-size: 12px;
  height: 30px;
  padding: 0 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  border-radius: 0;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;

  &.delete-btn {
    background: transparent;
    border: 1px solid var(--c-border);
    color: var(--c-danger);

    &:hover:not(:disabled) {
      background: var(--c-danger);
      color: #ffffff;
    }

    &:disabled {
      background: transparent;
      border-color: var(--c-border);
      color: var(--c-text-muted);
    }
  }

  &.history-btn {
    background: transparent;
    border: 1px solid var(--c-border);
    color: var(--c-text-secondary);

    &:hover {
      border-color: var(--c-text-muted);
      color: var(--c-text);
    }
  }
`;

const MissionIdTag = styled(Tag)`
  font-size: var(--font-sm);
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 0;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
`;

// 車號: 前面一顆車輛識別色的小點 (跟地圖、車輛卡片同色); 還沒派到車的是虛線框
const AmrBadge = styled.span<{ $isDark: boolean; $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 2px 9px 2px 7px;
  border-radius: 0;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  ${({ $color }) =>
    $color
      ? css`
          background: var(--c-bg-subtle);
          border: 1px solid var(--c-border);
          color: var(--c-text);

          &::before {
            content: "";
            flex-shrink: 0;
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: ${$color};
          }
        `
      : css`
          border: 1px dashed var(--c-border-strong);
          color: var(--c-text-muted);
          font-weight: 600;
        `}
`;

type StatusTone =
  "success" | "info" | "warning" | "waiting" | "muted" | "danger";
// 狀態顏色看任務狀態的數字。以前是拿翻譯後的字 (例如「🤖 進行中」) 去對英文代號, 永遠對不到, 全部變成黃色
const STATUS_TONE: Record<number, StatusTone> = {
  [MissionStatus.EXECUTING]: "success",
  [MissionStatus.ASSIGNED]: "info",
  [MissionStatus.PENDING]: "warning",
  [MissionStatus.WAITING]: "waiting",
  [MissionStatus.COMPLETED]: "muted",
  [MissionStatus.ABORTING]: "danger",
  [MissionStatus.CANCELED]: "danger",
};
const TONE_COLOR: Record<
  StatusTone,
  { bg: string; dot: string; text: string }
> = {
  success: {
    bg: "var(--c-success-soft)",
    dot: "var(--c-success)",
    text: "var(--c-text)",
  },
  info: {
    bg: "var(--c-header-accent-soft)",
    dot: "var(--c-header-accent)",
    text: "var(--c-header-accent)",
  },
  warning: {
    bg: "var(--c-warning-soft)",
    dot: "var(--c-warning)",
    text: "var(--c-text)",
  },
  waiting: {
    bg: "transparent",
    dot: "var(--c-warning)",
    text: "var(--c-text-secondary)",
  },
  muted: {
    bg: "var(--c-bg-subtle)",
    dot: "var(--c-border-strong)",
    text: "var(--c-text-muted)",
  },
  danger: {
    bg: "var(--c-danger-soft)",
    dot: "var(--c-danger)",
    text: "var(--c-danger)",
  },
};
/** 狀態翻譯字串前面帶 emoji (別的頁面還在用), 任務欄裡拿掉, 改用色點 */
const stripEmoji = (label: string) =>
  label.replace(/^(?:\p{Extended_Pictographic}|\u200d|\uFE0F|\s)+/u, "");

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

const StatusBadge = styled.span<{ $tone: StatusTone; $isDark: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 9px 2px 8px;
  border-radius: 0;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
  background: ${({ $tone }) => TONE_COLOR[$tone].bg};
  color: ${({ $tone }) => TONE_COLOR[$tone].text};
  border: 1px solid
    ${({ $tone }) => ($tone === "waiting" ? "var(--c-warning)" : "transparent")};

  &::before {
    content: "";
    flex-shrink: 0;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ $tone }) => TONE_COLOR[$tone].dot};
    /* 進行中的那顆點慢慢呼吸 (只動透明度) */
    ${({ $tone }) =>
      $tone === "success" &&
      css`
        animation: ${pulse} 1.8s ease-in-out infinite;
      `}
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      animation: none;
    }
  }
`;

const IndustrialCheckboxGroup = styled.div<{ $isDark: boolean }>`
  background: var(--c-bg-subtle);
  padding: 12px;
  border: 1px solid var(--c-header-border);
  border-radius: 0;
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
    color: var(--c-text);
    font-family: "Roboto Mono", monospace;
    font-size: var(--font-sm);
    text-transform: uppercase;
    letter-spacing: 0.5px;

    &:hover .ant-checkbox-inner {
      border-color: var(--c-header-accent);
    }
  }

  /* Checkbox Box Style */
  .ant-checkbox-inner {
    background-color: var(--c-bg);
    border-color: var(--c-header-border);
    border-radius: 0;
  }

  /* Checked State */
  .ant-checkbox-checked .ant-checkbox-inner {
    background-color: var(--c-header-accent);
    border-color: var(--c-header-accent);
  }

  /* Label when checked */
  .ant-checkbox-wrapper-checked {
    font-weight: 600;
  }
`;

type SelectMissionT = {
  amrId?: string | null;
  taskId?: string;
  missionId?: string;
  status?: string;
};

const defaultOpenColumn = ["amrId", "missionStatus", "taskInfo", "eta"];

const MissionTable = () => {
  const { t } = useTranslation();
  const can = usePermission();
  const isDark = useAtomValue(darkMode);
  // antd 的 token 不能吃 var(),要餵真實色碼,所以這裡直接拿 palette
  const { colors } = useAtomValue(themeAtom);
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
  const [showFilters, setShowFilters] = useState(false);

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

  const allColumns: TableColumnsType<MissionInfo> = [
    {
      title: t("mission_history.mission_id"),
      dataIndex: "missionId",
      key: "missionId",
      sorter: (a, b) => a.missionId.localeCompare(b.missionId),
      width: 150,
      render: (missionId: string) => {
        const info = rejectEntries(rejectMission?.[missionId]);
        if (!info.length)
          return <MissionIdTag color="blue">{missionId}</MissionIdTag>;

        const tooltipContent = (
          <div
            style={{
              maxWidth: 260,
              fontFamily: "Roboto Mono",
              fontSize: "var(--font-xs)",
            }}
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
      width: 76,
      render: (code: string) => {
        return (
          <Tooltip title={code ? code : t("main_task_list.wait_suitable")}>
            <AmrBadge
              $isDark={isDark}
              $color={code ? amrId2ColorRainbow(code) : undefined}
            >
              {code
                ? (code.split("-")[3] ?? code.split("-").pop())
                : t("main_task_list.wait_suitable")}
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
      width: 96,
      render: (status: MissionStatus, record) => {
        if (
          record.status === MissionStatus.CANCELED ||
          record.status === MissionStatus.ABORTING
        ) {
          return (
            <Tooltip title={<I18nCancelReason reason={record.cancelReason} />}>
              <StatusBadge
                $tone={STATUS_TONE[record.status ?? -1] ?? "warning"}
                $isDark={isDark}
              >
                {stripEmoji(String(status))}
              </StatusBadge>
            </Tooltip>
          );
        }

        if (record.status === MissionStatus.WAITING) {
          return (
            <Tooltip title={record.message}>
              <StatusBadge
                $tone={STATUS_TONE[record.status ?? -1] ?? "warning"}
                $isDark={isDark}
              >
                {stripEmoji(String(status))}
              </StatusBadge>
            </Tooltip>
          );
        }

        // 派不出去而且要有人處理的任務, 狀態旁邊多一個警示 (手機版看不到任務欄的原因)
        const reasons = rejectMission?.[record.missionId];
        if (record.status === MissionStatus.PENDING && needsFix(reasons)) {
          return (
            <Tooltip
              title={<MissionRejectHint entries={reasons} />}
              color="var(--c-bg)"
            >
              <Flex gap={6} align="center">
                <StatusBadge
                  $tone={STATUS_TONE[record.status ?? -1] ?? "warning"}
                  $isDark={isDark}
                >
                  {stripEmoji(String(status))}
                </StatusBadge>
                <WarningOutlined style={{ color: "var(--c-warning)" }} />
              </Flex>
            </Tooltip>
          );
        }

        return (
          <StatusBadge
            $tone={STATUS_TONE[record.status ?? -1] ?? "warning"}
            $isDark={isDark}
          >
            {stripEmoji(String(status))}
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
        let infoName: string[] | undefined;
        if (typeof record.info === "string") {
          const parseData = JSON.parse(
            record.info,
          ) as Additional_Mission_Info | null;
          infoName = parseData?.missionFullName;
        }
        const fullName =
          record.full_name?.filter(Boolean).join(" - ") ||
          infoName?.filter(Boolean).join(" - ") ||
          "-";

        return (
          <TaskInfo $isDark={isDark}>
            <TaskTitle $isDark={isDark}>{fullName}</TaskTitle>
            {record.sub_name && record.sub_name !== fullName && (
              <SubTitle $isDark={isDark}>{record.sub_name}</SubTitle>
            )}
          </TaskInfo>
        );
      },
    },
    {
      title: (
        <Tooltip title={t("eta.hint")}>
          <span>{t("eta.column")}</span>
        </Tooltip>
      ),
      dataIndex: "etaFinishAt",
      key: "eta",
      width: 128,
      render: (_: unknown, record: MissionInfo) => {
        const text = etaText(record, Date.now(), t);
        if (!text) return <span>-</span>;
        return (
          <Flex vertical>
            <span
              style={{
                fontFamily: "Roboto Mono",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {text.main}
            </span>
            {text.start && (
              <span
                style={{
                  fontSize: 12,
                  color: "var(--c-text-secondary)",
                  whiteSpace: "nowrap",
                }}
              >
                {text.start}
              </span>
            )}
          </Flex>
        );
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
  ];
  const columns = allColumns.filter((item) => {
    if (!isMobile) return true;
    return item.key !== "taskInfo";
  });

  // 還沒派出去的任務在下面整列寫出原因, 面板再窄也看得到
  const blockedKeys = (missions ?? [])
    .filter(
      (m) =>
        m.status === MissionStatus.PENDING &&
        rejectEntries(rejectMission?.[m.missionId]).length > 0,
    )
    .map((m) => m.missionId);

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
            rowHoverBg: colors.headerAccentSoft,
          },
        },
      }}
    >
      <MissionHistory
        isOpenMissionHistory={isOpenMissionHistory}
        setIsOpenMissionHistory={setIsOpenMissionHistory}
      />

      <ButtonWrapper>
        <Flex gap={8} align="flex-start" wrap>
          {can("mission.cancel") && (
            <IndustrialButton
              className="delete-btn"
              onClick={handleDeleteMission}
              disabled={!selectInfo.length}
              loading={deleteMissionMutation.isPending}
              icon={<DeleteOutlined />}
            >
              {t("utils.delete")} ({selectInfo.length})
            </IndustrialButton>
          )}
          <IndustrialButton
            className="history-btn"
            onClick={openHistory}
            icon={<HistoryOutlined />}
          >
            {t("mission_history.open")}
          </IndustrialButton>

          <IndustrialButton
            className="history-btn"
            onClick={() => setShowFilters(!showFilters)}
            icon={<FilterOutlined />}
          >
            {t("mission_history.filter")}
          </IndustrialButton>
        </Flex>
      </ButtonWrapper>
      {showFilters && (
        <IndustrialCheckboxGroup $isDark={isDark}>
          <div
            style={{
              marginBottom: 8,
              fontSize: "var(--font-xs)",
              color: "var(--c-text-secondary)",
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
      )}
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
          expandable={{
            showExpandColumn: false,
            expandedRowKeys: blockedKeys,
            expandedRowRender: (record: MissionInfo) => (
              <MissionRejectHint entries={rejectMission?.[record.missionId]} />
            ),
          }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            locale: { items_per_page: t("main_task_list.per_page") },
            showTotal: (total) =>
              t("main.mission_modal.total_missions", { count: total }),
          }}
        />
      </IndustrialTableContainer>
    </ConfigProvider>
  );
};

export default memo(MissionTable);
