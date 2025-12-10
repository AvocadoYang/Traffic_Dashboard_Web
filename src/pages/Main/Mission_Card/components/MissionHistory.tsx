import {
  Drawer,
  Table,
  Tag,
  Space,
  Typography,
  Button,
  Tooltip,
  ConfigProvider,
  Flex,
  RadioChangeEvent,
} from "antd";
import { Dispatch, FC, SetStateAction, useState, memo } from "react";
import { ColumnsType } from "antd/es/table";
import moment from "moment";
import { SyncOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import useAllMissionHistory from "@/api/useMissionHistory";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { translate } from "@/i18n";
import { darkMode } from "@/utils/gloable";
import { useAtomValue } from "jotai";
import { useRejectMission } from "@/sockets/useRejectMission";

// Define the Mission interface based on your schema
interface Mission {
  id: string;
  order?: number;
  priority?: number;
  send_by: number;
  amrId: string;
  status: number;
  sub_name?: string;
  manualMode: boolean;
  emergencyBtn: boolean;
  recoveryBtn: boolean;
  createdAt?: Date;
  assignedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  warningIdList?: Array<number>;
  batteryCost: number;
  batteryRateWhenStarted: number;
  totalDistanceTraveled: number;
  info?: any;
  message?: string;
  full_name?: string[];
  category?: string[];
}

enum Send_By {
  /**未知 */
  UNKNOWN,
  /**交管 */
  RCS,
  /**第三方的API */
  WCS,
  //**使用者於界面上派發 */
  USER,
}

// Industrial Styled Components (adapted from MissionTable)
const IndustrialDrawer = styled(Drawer)<{ $isDark: boolean }>`
  .ant-drawer-content-wrapper {
    background: ${({ $isDark }) => ($isDark ? "#0f0f0f" : "#ffffff")};
  }
  .ant-drawer-header {
    background: ${({ $isDark }) => ($isDark ? "#0a0a0a" : "#fafafa")};
    border-bottom: 1px solid
      ${({ $isDark }) => ($isDark ? "#2a2a2a" : "#d9d9d9")};
  }
  .ant-drawer-title {
    color: ${({ $isDark }) => ($isDark ? "#00ff41" : "#262626")};
    font-family: "Roboto Mono", monospace;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
`;

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
  &.refresh-btn {
    background: #e6f7ff;
    border: 1px solid #1890ff;
    color: #1890ff;
    &:hover:not(:disabled) {
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

const StatusBadge = styled.span<{ $status: number; $isDark: boolean }>`
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
      number,
      { bg: string; border: string; text: string; icon?: string }
    > = {
      0: {
        // pending
        bg: $isDark ? "#0a0a0a" : "#fff7e6",
        border: "#faad14",
        text: "#faad14",
      },
      1: {
        // assigned
        bg: $isDark ? "#0a0a0a" : "#e6f7ff",
        border: "#1890ff",
        text: "#1890ff",
      },
      2: {
        // executing
        bg: $isDark ? "#0a0a0a" : "#f6ffed",
        border: "#52c41a",
        text: "#52c41a",
      },
      3: {
        // completed
        bg: $isDark ? "#0a0a0a" : "#fafafa",
        border: "#8c8c8c",
        text: "#8c8c8c",
      },
      4: {
        // aborting
        bg: $isDark ? "#0a0a0a" : "#fff1f0",
        border: "#ff4d4f",
        text: "#ff4d4f",
      },
      5: {
        // canceled
        bg: $isDark ? "#0a0a0a" : "#fff1f0",
        border: "#ff4d4f",
        text: "#ff4d4f",
      },
    };
    const color = statusColors[$status] || statusColors[0];
    return `
      background: ${color.bg};
      border: 1px solid ${color.border};
      color: ${color.text};
    `;
  }}
`;

const ModeTag = styled(Tag)<{ $isDark: boolean }>`
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 6px;
`;

const ErrorMessage = styled.div<{ $isDark: boolean }>`
  text-align: center;
  padding: 20px;
  color: ${({ $isDark }) => ($isDark ? "#ff4d4f" : "#ff4d4f")};
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  background: ${({ $isDark }) => ($isDark ? "#1a1a1a" : "#fff1f0")};
  border: 1px solid #ff4d4f;
  border-radius: 4px;
`;

const DrawerTitleWrapper = styled(Flex)`
  width: 100%;
  align-items: center;
  justify-content: space-between;
`;

const IndustrialTypography = styled(Typography.Title)<{ $isDark: boolean }>`
  color: ${({ $isDark }) => ($isDark ? "#00ff41" : "#262626")};
  font-family: "Roboto Mono", monospace;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px !important;
  margin: 0 !important;
`;

const ViewButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.5px;
  font-weight: 600;
`;

const MISSION_SORT = [
  0, // pending
  1, // assigned
  2, // executing
  3, // completed
  4, // aborting
  5, // canceled
];

const MissionHistory: FC<{
  isOpenMissionHistory: boolean;
  setIsOpenMissionHistory: Dispatch<SetStateAction<boolean>>;
}> = ({ isOpenMissionHistory, setIsOpenMissionHistory }) => {
  const { t } = useTranslation();
  const isDark = useAtomValue(darkMode);
  const rejectMission = useRejectMission();
  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
  }>({
    page: 1,
    pageSize: 10,
  });
  const {
    data: missions,
    isLoading,
    error,
    refetch,
  } = useAllMissionHistory(pagination);
  const closeHistory = () => {
    setIsOpenMissionHistory(false);
  };
  const [size, setSize] = useState(980);

  // Define table columns
  const columns: ColumnsType<Mission> = [
    {
      title: t("mission_history.mission_id"),
      dataIndex: "id",
      key: "id",
      sorter: (a, b) => a.id.localeCompare(b.id),
      width: 150,
      render: (missionId: string) => {
        const info = rejectMission?.[missionId];
        if (!info) return <MissionIdTag color="blue">{missionId}</MissionIdTag>;
        const tooltipContent = (
          <div
            style={{
              maxWidth: 260,
              fontFamily: "Roboto Mono",
              fontSize: 11,
              color: isDark ? "#00ff41" : "#595959",
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
      title: t("mission_history.amr_id"),
      dataIndex: "amrId",
      key: "amrId",
      sorter: (a, b) => a.amrId.localeCompare(b.amrId),
      width: 120,
    },
    {
      title: t("mission_history.status"),
      dataIndex: "status",
      key: "status",
      render: (status: number) => {
        const text = translate("normal", status.toString()) || "";
        return (
          <StatusBadge $status={status} $isDark={isDark}>
            {text}
          </StatusBadge>
        );
      },
      sorter: (a, b) =>
        MISSION_SORT.indexOf(a.status) - MISSION_SORT.indexOf(b.status),
      width: 150,
    },
    {
      title: t("mission_history.full_name"),
      dataIndex: "full_name",
      key: "full_name",
      sorter: (a, b) => (a.sub_name || "").localeCompare(b.sub_name || ""),
      render: (full_name: string[]) => full_name?.join(", ") || "N/A",
      width: 150,
    },
    {
      title: t("mission_history.sub_name"),
      dataIndex: "sub_name",
      key: "sub_name",
      sorter: (a, b) => (a.sub_name || "").localeCompare(b.sub_name || ""),
      render: (text) => text || "N/A",
      width: 150,
    },
    {
      title: t("mission_history.category"),
      dataIndex: "category",
      key: "category",
      sorter: (a, b) => (a.sub_name || "").localeCompare(b.sub_name || ""),
      render: (category: string[]) => category?.join(", ") || "N/A",
      width: 150,
    },
    {
      title: t("mission_history.priority"),
      dataIndex: "priority",
      key: "priority",
      sorter: (a, b) => (a.priority || 0) - (b.priority || 0),
      render: (priority) => priority || "N/A",
      width: 100,
    },
    {
      title: t("mission_history.send_by"),
      dataIndex: "send_by",
      key: "send_by",
      sorter: (a, b) => a.send_by - b.send_by,
      render(value: Send_By) {
        switch (value) {
          case Send_By.UNKNOWN:
            return t("mission_history.unknown");
          case Send_By.RCS:
            return t("mission_history.rcs");
          case Send_By.WCS:
            return t("mission_history.wcs");
          case Send_By.USER:
            return t("mission_history.user");
          default:
            return t("mission_history.unknown");
        }
      },
      width: 100,
    },
    {
      title: t("mission_history.created_at"),
      dataIndex: "createdAt",
      key: "createdAt",
      sorter: (a, b) => moment(a.createdAt).unix() - moment(b.createdAt).unix(),
      render: (date) =>
        date ? moment(date).format("YYYY-MM-DD HH:mm:ss") : "N/A",
      width: 180,
    },
    {
      title: t("mission_history.started_at"),
      dataIndex: "startedAt",
      key: "startedAt",
      sorter: (a, b) => moment(a.startedAt).unix() - moment(b.startedAt).unix(),
      render: (date) =>
        date ? moment(date).format("YYYY-MM-DD HH:mm:ss") : "N/A",
      width: 180,
    },
    {
      title: t("mission_history.completed_at"),
      dataIndex: "completedAt",
      key: "completedAt",
      sorter: (a, b) =>
        moment(a.completedAt).unix() - moment(b.completedAt).unix(),
      render: (date) =>
        date ? moment(date).format("YYYY-MM-DD HH:mm:ss") : "N/A",
      width: 180,
    },
    {
      title: t("mission_history.total_time"),
      key: "totalTime",
      render: (_, record) => {
        if (record.startedAt && record.completedAt) {
          const duration = moment.duration(
            moment(record.completedAt).diff(moment(record.startedAt))
          );
          const minutes = Math.floor(duration.asMinutes());
          const seconds = duration.seconds();
          return duration.asMilliseconds() >= 0
            ? `${minutes} ${t("mission_history.min")} ${seconds} ${t("mission_history.sec")}`
            : "N/A";
        }
        return "N/A";
      },
      sorter: (a, b) => {
        if (!a.startedAt || !a.completedAt || !b.startedAt || !b.completedAt)
          return 0;
        const durationA = moment(a.completedAt).diff(moment(a.startedAt));
        const durationB = moment(b.completedAt).diff(moment(b.startedAt));
        return durationA - durationB;
      },
      width: 140,
    },
    {
      title: t("mission_history.battery_cost"),
      dataIndex: "batteryCost",
      key: "batteryCost",
      sorter: (a, b) => a.batteryCost - b.batteryCost,
      render: (cost) => `${cost}%`,
      width: 120,
    },
    {
      title: t("mission_history.distance_traveled"),
      dataIndex: "totalDistanceTraveled",
      key: "totalDistanceTraveled",
      sorter: (a, b) => a.totalDistanceTraveled - b.totalDistanceTraveled,
      render: (distance) =>
        `${distance.toFixed(2)} ${t("mission_history.distance_traveled").split("（")[1]?.replace("）", "") || "m"}`,
      width: 150,
    },
    {
      title: t("mission_history.manual_mode"),
      dataIndex: "manualMode",
      key: "manualMode",
      render: (manual) => (
        <ModeTag $isDark={isDark} color={manual ? "purple" : "blue"}>
          {manual ? t("mission_history.manual") : t("mission_history.auto")}
        </ModeTag>
      ),
      width: 120,
    },
    {
      title: t("mission_history.emergency_btn"),
      dataIndex: "emergencyBtn",
      key: "emergencyBtn",
      render: (emergency) => (
        <ModeTag $isDark={isDark} color={emergency ? "red" : "green"}>
          {emergency
            ? t("mission_history.pressed")
            : t("mission_history.not_pressed")}
        </ModeTag>
      ),
      width: 120,
    },
    {
      title: t("mission_history.recovery_btn"),
      dataIndex: "recoveryBtn",
      key: "recoveryBtn",
      render: (recovery) => (
        <ModeTag $isDark={isDark} color={recovery ? "orange" : "green"}>
          {recovery
            ? t("mission_history.pressed")
            : t("mission_history.not_pressed")}
        </ModeTag>
      ),
      width: 120,
    },
    {
      title: t("mission_history.warning_id_list"),
      dataIndex: "warningIdList",
      key: "warningIdList",
      render: (warningIdList: number[] | null) =>
        warningIdList && warningIdList.length > 0
          ? warningIdList.join(", ")
          : t("mission_history.none"),
      width: 150,
    },
    {
      title: t("mission_history.actions"),
      key: "actions",
      render: (_, record) => (
        <Space size="middle">
          <ViewButton
            type="link"
            onClick={() => {
              console.log(t("mission_history.view"), record.id);
            }}
          >
            {t("mission_history.view")}
          </ViewButton>
        </Space>
      ),
      width: 100,
    },
  ];

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
      <IndustrialDrawer
        $isDark={isDark}
        title={
          <DrawerTitleWrapper>
            <IndustrialTypography level={4} $isDark={isDark}>
              {t("mission_history.title")}
            </IndustrialTypography>
            <IndustrialButton
              className="refresh-btn"
              type="primary"
              icon={<SyncOutlined />}
              onClick={() => refetch()}
              size="small"
            >
              {t("mission_history.refresh")}
            </IndustrialButton>
          </DrawerTitleWrapper>
        }
        closable
        onClose={closeHistory}
        open={isOpenMissionHistory}
        size={size}
        resizable={{
          onResize: (newSize) => setSize(newSize),
        }}
        className="mission-history-drawer"
      >
        {error ? (
          <ErrorMessage $isDark={isDark}>
            <ExclamationCircleOutlined style={{ marginRight: 8 }} />
            {t("mission_history.error_loading")}:{" "}
            {(error as { message: string }).message}
          </ErrorMessage>
        ) : (
          <IndustrialTableContainer $isDark={isDark}>
            <Table
              columns={columns as []}
              dataSource={missions?.data?.sort((a: Mission, b: Mission) => {
                const typeDiff =
                  MISSION_SORT.indexOf(a.status) -
                  MISSION_SORT.indexOf(b.status);
                if (typeDiff !== 0) return typeDiff;
                return moment(b.createdAt).unix() - moment(a.createdAt).unix();
              })}
              loading={isLoading}
              rowKey="id"
              pagination={{
                current: pagination.page,
                pageSize: pagination.pageSize,
                total: missions?.pagination.total,
                showSizeChanger: true,
                pageSizeOptions: ["10", "20", "50"],
                showTotal: (total) => `TOTAL: ${total} MISSIONS`,
                onChange: (page, pageSize) => {
                  setPagination({ page, pageSize });
                },
              }}
              scroll={{ x: 1400 }}
              bordered
            />
          </IndustrialTableContainer>
        )}
      </IndustrialDrawer>
    </ConfigProvider>
  );
};

export default memo(MissionHistory);
