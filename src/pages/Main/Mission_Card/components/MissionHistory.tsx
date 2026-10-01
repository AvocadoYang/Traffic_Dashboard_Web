import {
  Drawer,
  Table,
  Tag,
  Typography,
  Button,
  Tooltip,
  ConfigProvider,
  Flex,
  Input,
  DatePicker,
  Badge,
  message,
} from "antd";
import {
  Dispatch,
  FC,
  SetStateAction,
  useState,
  memo,
  useEffect,
  useMemo,
} from "react";
import { ColumnsType } from "antd/es/table";
import moment from "moment";
import {
  SyncOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
  SearchOutlined,
  WarningOutlined,
  AlertOutlined,
  RollbackOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import useAllMissionHistory from "@/api/useMissionHistory";
import useWarningTable from "@/api/useWarningTable";
import { useTranslation } from "react-i18next";
import styled, { createGlobalStyle } from "styled-components";
import { mq } from "@/styles/responsive";
import { darkMode } from "@/utils/gloable";
import { useAtomValue } from "jotai";
import { useRejectMission } from "@/sockets/useRejectMission";
import { CancelReason, MissionStatus } from "@/types/mission";
import I18nCancelReason from "@/i18n/I18nCancelReason";
import { useMutation } from "@tanstack/react-query";
import { Dayjs } from "dayjs";
import client from "@/api/axiosClient";
import { themeAtom } from "@/theme";

const { RangePicker } = DatePicker;
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
  cancel_reason: CancelReason;
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
    background: var(--c-bg);
  }
  .ant-drawer-header {
    background: var(--c-bg-subtle);
    border-bottom: 1px solid var(--c-header-border);
  }
  .ant-drawer-title {
    color: var(--c-text);
    font-family: "Roboto Mono", monospace;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
`;

const IndustrialTableContainer = styled.div<{ $isDark: boolean }>`
  .ant-table {
    background: var(--c-bg);
    border: 1px solid var(--c-header-border);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
  .ant-table-thead > tr > th {
    background: var(--c-bg-subtle);
    color: var(--c-text);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 1px;
    border-bottom: 2px solid var(--c-header-border);
    font-family: "Roboto Mono", monospace;
  }
  .ant-table-tbody > tr {
    background: var(--c-bg);
    transition: all 0.2s ease;
    font-family: "Roboto Mono", monospace;
    &:hover {
      background: var(--c-header-accent-soft) !important;
      box-shadow: 0 2px 4px rgba(24, 144, 255, 0.1);
    }
  }
  .ant-table-tbody > tr > td {
    border-bottom: 1px solid var(--c-bg-muted);
    font-size: 12px;
    color: var(--c-text-secondary);
    vertical-align: top;
  }
  .ant-table-expanded-row > td {
    background: var(--c-bg-subtle) !important;
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
    background: var(--c-header-accent-soft);
    border: 1px solid var(--c-header-accent);
    color: var(--c-header-accent);
    &:hover:not(:disabled) {
      background: var(--c-header-accent);
      border-color: var(--c-header-accent);
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
    }
  }
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
        bg: "var(--c-warning-soft)",
        border: "var(--c-warning)",
        text: "var(--c-warning)",
      },
      1: {
        // assigned
        bg: "var(--c-header-accent-soft)",
        border: "var(--c-header-accent)",
        text: "var(--c-header-accent)",
      },
      2: {
        // executing
        bg: "var(--c-success-soft)",
        border: "var(--c-success)",
        text: "var(--c-success)",
      },
      3: {
        // completed
        bg: "var(--c-bg-subtle)",
        border: "var(--c-text-muted)",
        text: "var(--c-text-muted)",
      },
      4: {
        // aborting
        bg: "var(--c-danger-soft)",
        border: "var(--c-danger)",
        text: "var(--c-danger)",
      },
      5: {
        // canceled
        bg: "var(--c-danger-soft)",
        border: "var(--c-danger)",
        text: "var(--c-danger)",
      },
      6: {
        // waiting
        bg: "var(--c-bg-subtle)",
        border: "var(--c-warning)",
        text: "var(--c-warning)",
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

const ErrorMessage = styled.div<{ $isDark: boolean }>`
  text-align: center;
  padding: 20px;
  color: ${({ $isDark }) => ($isDark ? "var(--c-danger)" : "var(--c-danger)")};
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  background: var(--c-danger-soft);
  border: 1px solid var(--c-danger);
  border-radius: 4px;
`;

const DrawerTitleWrapper = styled(Flex)`
  && {
    width: 100%;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-sm) var(--space-md);
  }
`;

const DrawerTitleActions = styled(Flex)`
  && {
    flex: 1 1 auto;
    align-items: center;
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: var(--space-sm) var(--space-md);
  }
`;

const RANGE_POPUP_CLS = "mission-history-range-popup";

/* antd 自己的選擇器是 `.ant-picker-dropdown .ant-picker-panel-container .ant-picker-panels`
   (specificity 30)，所以這裡把 class 重複一次墊到 40 才蓋得過去。 */
const RangePopupGlobalStyle = createGlobalStyle`
  .${RANGE_POPUP_CLS}.${RANGE_POPUP_CLS} {
    max-width: 100vw;

    .ant-picker-panel-container {
      max-width: calc(100vw - var(--space-lg));
      overflow: auto;
    }

    /* 預設(窄螢幕)：兩個月曆面板並排約 600px 會超出畫面，改成上下堆疊 */
    .ant-picker-panel-container .ant-picker-panels {
      flex-direction: column;
    }

    .ant-picker-panel-container .ant-picker-panel-layout {
      flex-wrap: wrap;
    }

    ${mq.pad} {
      .ant-picker-panel-container {
        max-width: none;
      }

      .ant-picker-panel-container .ant-picker-panels {
        flex-direction: row;
      }

      .ant-picker-panel-container .ant-picker-panel-layout {
        flex-wrap: nowrap;
      }
    }
  }
  // cast: styled-components v5 的型別對不上 React 18 的 JSX 定義，全專案共通問題
` as unknown as FC;

const IndustrialTypography = styled(Typography.Title)<{ $isDark: boolean }>`
  color: var(--c-text);
  font-family: "Roboto Mono", monospace;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px !important;
  margin: 0 !important;
`;

const CellStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const PrimaryText = styled.span`
  color: var(--c-text);
  font-weight: 600;
  font-size: 13px;
  word-break: break-word;
`;

const KindTag = styled(Tag)`
  && {
    margin: 1px 0 0;
    padding: 0 6px;
    font-size: 10px;
    line-height: 18px;
    flex-shrink: 0;
  }
`;

const MutedText = styled.span<{ $tone?: "danger" | "warning" }>`
  font-size: 11px;
  color: ${({ $tone }) =>
    $tone === "danger"
      ? "var(--c-danger)"
      : $tone === "warning"
        ? "var(--c-warning)"
        : "var(--c-text-muted)"};
  word-break: break-word;
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-xs);

  ${mq.pad} {
    grid-template-columns: 1fr 1fr;
  }
`;

const DetailSection = styled.section<{ $wide?: boolean }>`
  ${({ $wide }) => ($wide ? "grid-column: 1 / -1;" : "")}
  min-width: 0;

  h5 {
    margin: 0 0 var(--space-xs);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--c-text-muted);
  }
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: var(--space-md);
  padding: 4px 0;
  border-bottom: 1px dashed var(--c-bg-muted);
  font-size: 12px;

  & > span:first-child {
    color: var(--c-text-muted);
    flex-shrink: 0;
  }
  & > span:last-child {
    color: var(--c-text);
    text-align: right;
    word-break: break-word;
  }
`;

const Timeline = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm) var(--space-xs);

  ${mq.pad} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const TimelineStep = styled.li<{ $done: boolean; $tone?: "danger" }>`
  position: relative;
  padding-top: 14px;
  font-size: 11px;
  color: ${({ $done }) => ($done ? "var(--c-text)" : "var(--c-text-muted)")};

  &::before {
    content: "";
    position: absolute;
    top: 3px;
    left: 0;
    right: 0;
    height: 2px;
    background: ${({ $done, $tone }) =>
      !$done
        ? "var(--c-bg-muted)"
        : $tone === "danger"
          ? "var(--c-danger)"
          : "var(--c-header-accent)"};
  }
  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $done, $tone }) =>
      !$done
        ? "var(--c-bg-muted)"
        : $tone === "danger"
          ? "var(--c-danger)"
          : "var(--c-header-accent)"};
  }

  strong {
    display: block;
    font-weight: 600;
  }
`;

const STATUS_LABEL_KEY = {
  [MissionStatus.PENDING]: "mission_history.pending",
  [MissionStatus.ASSIGNED]: "mission_history.assigned",
  [MissionStatus.EXECUTING]: "mission_history.executing",
  [MissionStatus.COMPLETED]: "mission_history.completed",
  [MissionStatus.ABORTING]: "mission_history.aborting",
  [MissionStatus.CANCELED]: "mission_history.canceled",
  [MissionStatus.WAITING]: "mission_history.waiting",
} as const;

const PRIORITY_LABEL_KEY = [
  "main.mission_modal.dialog_mission.priority.TRIVIAL",
  "main.mission_modal.dialog_mission.priority.NORMAL",
  "main.mission_modal.dialog_mission.priority.PIVOTAL",
  "main.mission_modal.dialog_mission.priority.CRITICAL",
] as const;

const isCanceled = (status: number) =>
  status === MissionStatus.CANCELED || status === MissionStatus.ABORTING;

const diffMs = (from?: Date | null, to?: Date | null) => {
  if (!from || !to) return null;
  const ms = moment(to).diff(moment(from));
  return ms >= 0 ? ms : null;
};

/** 同一年就不顯示年份，欄位才塞得下 */
const formatShortTime = (date?: Date | null) => {
  if (!date) return "—";
  const m = moment(date);
  return m.format(
    m.isSame(moment(), "year") ? "MM/DD HH:mm:ss" : "YYYY/MM/DD HH:mm",
  );
};

const formatFullTime = (date?: Date | null) =>
  date ? moment(date).format("YYYY-MM-DD HH:mm:ss") : "—";

type MissionKind =
  | "normal"
  | "dynamic"
  | "move_away"
  | "spin"
  | "direct_move"
  | "other";

type MissionDescription = {
  kind: MissionKind;
  primary: string;
  desc?: string;
};

const KIND_LABEL_KEY = {
  normal: "mission_history.kind_normal",
  dynamic: "mission_history.kind_dynamic",
  move_away: "mission_history.kind_move_away",
  spin: "mission_history.kind_spin",
  direct_move: "mission_history.kind_direct_move",
  other: "mission_history.kind_other",
} as const satisfies Record<MissionKind, string>;

const KIND_COLOR: Record<MissionKind, string | undefined> = {
  normal: "blue",
  dynamic: "cyan",
  move_away: "orange",
  spin: "geekblue",
  direct_move: "purple",
  other: undefined,
};

/** "A -> B -> C" 拆成 ["A", "B", "C"] */
const splitRoute = (subName?: string | null) =>
  (subName ?? "")
    .split("->")
    .map((p) => p.trim())
    .filter(Boolean);

const MissionHistory: FC<{
  isOpenMissionHistory: boolean;
  setIsOpenMissionHistory: Dispatch<SetStateAction<boolean>>;
}> = ({ isOpenMissionHistory, setIsOpenMissionHistory }) => {
  const { t, i18n } = useTranslation();
  const isDark = useAtomValue(darkMode);
  // antd 的 token 不能吃 var(),要餵真實色碼,所以這裡直接拿 palette
  const { colors } = useAtomValue(themeAtom);
  const rejectMission = useRejectMission();
  const { data: warningTable } = useWarningTable();
  const [messageApi, contextHolder] = message.useMessage();
  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
  }>({
    page: 1,
    pageSize: 10,
  });
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  const dateFrom = dateRange?.[0]?.startOf("day").toISOString();
  const dateTo = dateRange?.[1]?.endOf("day").toISOString();

  const {
    data: missions,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useAllMissionHistory({
    ...pagination,
    search: debouncedSearch,
    dateFrom,
    dateTo,
  });
  const closeHistory = () => {
    setIsOpenMissionHistory(false);
  };
  const [size, setSize] = useState(980);

  const warningInfo = useMemo(() => {
    const map = new Map<number, string>();
    warningTable?.forEach((w) => {
      if (!w) return;
      map.set(w.id, i18n.language === "en" ? w.info_en : w.info_ch);
    });
    return map;
  }, [warningTable, i18n.language]);

  const formatDuration = (ms: number | null) => {
    if (ms === null) return null;
    const totalSec = Math.round(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    if (h > 0)
      return `${h}${t("mission_history.unit_h")} ${pad(m)}${t("mission_history.unit_m")}`;
    if (m > 0)
      return `${m}${t("mission_history.unit_m")} ${pad(s)}${t("mission_history.unit_s")}`;
    return `${s}${t("mission_history.unit_s")}`;
  };

  const sendByLabel = (value: Send_By) => {
    switch (value) {
      case Send_By.RCS:
        return t("mission_history.rcs");
      case Send_By.WCS:
        return t("mission_history.wcs");
      case Send_By.USER:
        return t("mission_history.user");
      default:
        return t("mission_history.unknown");
    }
  };

  const missionTitle = (record: Mission) =>
    record.full_name?.filter(Boolean).join(" → ") || record.sub_name || "—";

  /**
   * 後端 sub_name 依任務種類格式不同 (見 mission-control MissionTable.ts):
   * - 一般任務: "起點ID -> 終點ID", full_name 才是設定的任務名稱
   * - 動態任務: "來源名 -> 目的名"
   * - 等待位置的動態任務: "來源 -> 目的1 / 目的2"
   * - 交管移動 / 原地旋轉: full_name 是 "move away" / "spin", sub_name 是
   *   "起點 -> 終點" (舊資料 sub_name 也是 "move away", 看不到路線)
   * - DIRECT MOVE: 路線點位串
   */
  const describeMission = (record: Mission): MissionDescription => {
    const name = missionTitle(record);
    const firstName = record.full_name?.[0];
    const route = splitRoute(record.sub_name);

    // 舊資料的 sub_name 就是 "move away" / "spin", 拆出來不是點位
    const hasRoute = route.length > 0 && record.sub_name !== firstName;

    if (firstName === "move away" || record.sub_name === "move away") {
      return {
        kind: "move_away",
        primary: hasRoute
          ? route.join(" → ")
          : t("mission_history.move_away_title"),
        desc: t("mission_history.desc_move_away"),
      };
    }

    if (firstName === "spin") {
      return {
        kind: "spin",
        primary: hasRoute
          ? t("mission_history.spin_at", { at: route[0] })
          : t("mission_history.spin_title"),
        desc: t("mission_history.desc_spin"),
      };
    }

    if (firstName === "DIRECT MOVE") {
      return {
        kind: "direct_move",
        primary: route.join(" → ") || "—",
        desc: t("mission_history.desc_direct_move"),
      };
    }

    if (firstName === "DYNAMIC MISSION") {
      const dests = (route[1] ?? "").split("/").map((d) => d.trim());
      return {
        kind: "dynamic",
        primary: record.sub_name ? route.join(" → ") : "—",
        desc:
          dests.length > 1
            ? t("mission_history.desc_dynamic_candidates", {
                dests: dests.join("、"),
              })
            : t("mission_history.desc_dynamic_waiting"),
      };
    }

    if (record.category?.includes("normal-mission") && route.length) {
      const from = route[0];
      const to = route[route.length - 1];
      return {
        kind: "normal",
        primary: name,
        desc:
          from === to
            ? t("mission_history.desc_normal_same", { from })
            : t("mission_history.desc_normal", { from, to }),
      };
    }

    if (record.category?.includes("dynamic-mission") && route.length) {
      return {
        kind: "dynamic",
        primary: route.join(" → "),
        desc:
          route.length === 2
            ? t("mission_history.desc_dynamic", {
                from: route[0],
                to: route[1],
              })
            : t("mission_history.desc_dynamic_steps", {
                count: route.length,
              }),
      };
    }

    // 其他 (例如 MiR 自訂任務): sub_name 就是任務名稱
    const primary = record.sub_name || name;
    return {
      kind: "other",
      primary,
      desc: name !== primary ? name : undefined,
    };
  };

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!dateRange) {
        throw new Error(t("mission_history.export_need_range"));
      }
      const [start, end] = dateRange;
      const res = await client.get("/api/records/export-mission", {
        params: {
          start: start.startOf("day").toISOString(),
          end: end.endOf("day").toISOString(),
        },
        responseType: "blob",
      });
      return res.data as Blob;
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const [start, end] = dateRange!;
      link.href = url;
      link.download = `mission_history_${start.format("YYYYMMDD")}_${end.format(
        "YYYYMMDD",
      )}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      messageApi.success(t("mission_history.export_success"));
    },
    onError: () => {
      messageApi.error(t("mission_history.export_failed"));
    },
  });

  // 打字時不要每個按鍵都打一次 API
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 500);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    setPagination((pre) => ({ ...pre, page: 1 }));
  }, [debouncedSearch, dateFrom, dateTo]);

  useEffect(() => {
    if (!isOpenMissionHistory) return;
    refetch();
  }, [isOpenMissionHistory]);

  // 後端分頁，前端排序只會排當頁、容易誤導，所以欄位不提供 sorter
  const columns: ColumnsType<Mission> = [
    {
      title: t("mission_history.mission"),
      key: "mission",
      width: 240,
      render: (_, record) => {
        const { kind, primary, desc } = describeMission(record);
        return (
          <CellStack>
            <Flex gap={6} align="flex-start">
              <KindTag bordered={false} color={KIND_COLOR[kind]}>
                {t(KIND_LABEL_KEY[kind])}
              </KindTag>
              <PrimaryText>{primary}</PrimaryText>
            </Flex>
            {desc && <MutedText>{desc}</MutedText>}
            <MutedText style={{ fontFamily: "Roboto Mono, monospace" }}>
              #{record.id}
            </MutedText>
          </CellStack>
        );
      },
    },
    {
      title: t("mission_history.status"),
      dataIndex: "status",
      key: "status",
      width: 160,
      render: (status: number, record) => {
        const rejects = rejectMission?.[record.id];
        return (
          <CellStack>
            <span>
              <StatusBadge $status={status} $isDark={isDark}>
                {t(
                  STATUS_LABEL_KEY[status as MissionStatus] ??
                    "mission_history.unknown",
                )}
              </StatusBadge>
            </span>
            {isCanceled(status) && (
              <MutedText $tone="danger">
                <I18nCancelReason reason={record.cancel_reason} />
              </MutedText>
            )}
            {status === MissionStatus.WAITING && record.message && (
              <MutedText $tone="warning">{record.message}</MutedText>
            )}
            {status === MissionStatus.PENDING && rejects?.length ? (
              <MutedText $tone="warning">
                <WarningOutlined />{" "}
                {t("mission_history.rejected_count", { count: rejects.length })}
              </MutedText>
            ) : null}
          </CellStack>
        );
      },
    },
    {
      title: t("mission_history.vehicle"),
      dataIndex: "amrId",
      key: "amrId",
      width: 140,
      render: (amrId: string, record) => (
        <CellStack>
          <PrimaryText style={{ fontWeight: 500, fontSize: 12 }}>
            {amrId || "—"}
          </PrimaryText>
          <MutedText>{sendByLabel(record.send_by)}</MutedText>
        </CellStack>
      ),
    },
    {
      title: t("mission_history.created_at"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 140,
      render: (date: Date | undefined) => (
        <Tooltip title={formatFullTime(date)}>
          <span style={{ fontFamily: "Roboto Mono, monospace" }}>
            {formatShortTime(date)}
          </span>
        </Tooltip>
      ),
    },
    {
      title: t("mission_history.duration"),
      key: "duration",
      width: 130,
      render: (_, record) => {
        const exec = formatDuration(
          diffMs(record.startedAt, record.completedAt),
        );
        const wait = formatDuration(diffMs(record.createdAt, record.startedAt));
        const running =
          record.status === MissionStatus.EXECUTING ||
          record.status === MissionStatus.ASSIGNED;
        return (
          <CellStack>
            <PrimaryText style={{ fontFamily: "Roboto Mono, monospace" }}>
              {exec ??
                (running
                  ? t("mission_history.in_progress")
                  : record.startedAt
                    ? "—"
                    : t("mission_history.not_started"))}
            </PrimaryText>
            {wait && (
              <MutedText>
                {t("mission_history.waited", { time: wait })}
              </MutedText>
            )}
          </CellStack>
        );
      },
    },
    {
      title: t("mission_history.flags"),
      key: "flags",
      width: 100,
      render: (_, record) => {
        const warnings = record.warningIdList?.length ?? 0;
        const flags = [
          warnings > 0 && (
            <Tooltip
              key="warn"
              title={t("mission_history.warning_count", { count: warnings })}
            >
              <Badge count={warnings} size="small" color="var(--c-warning)">
                <WarningOutlined
                  style={{ color: "var(--c-warning)", fontSize: 16 }}
                />
              </Badge>
            </Tooltip>
          ),
          record.emergencyBtn && (
            <Tooltip key="ems" title={t("mission_history.emergency_pressed")}>
              <AlertOutlined
                style={{ color: "var(--c-danger)", fontSize: 16 }}
              />
            </Tooltip>
          ),
          record.recoveryBtn && (
            <Tooltip key="rec" title={t("mission_history.recovery_pressed")}>
              <RollbackOutlined
                style={{ color: "var(--c-warning)", fontSize: 16 }}
              />
            </Tooltip>
          ),
          record.manualMode && (
            <Tooltip key="manual" title={t("mission_history.manual_mode")}>
              <ToolOutlined
                style={{ color: "var(--c-text-secondary)", fontSize: 16 }}
              />
            </Tooltip>
          ),
        ].filter(Boolean);
        return flags.length ? (
          <Flex gap={10} align="center" wrap>
            {flags}
          </Flex>
        ) : (
          <MutedText>—</MutedText>
        );
      },
    },
  ];

  const renderDetail = (record: Mission) => {
    const ended = isCanceled(record.status);
    const steps: { label: string; at?: Date | null; prev?: Date | null }[] = [
      { label: t("mission_history.created_at"), at: record.createdAt },
      {
        label: t("mission_history.assigned_at"),
        at: record.assignedAt,
        prev: record.createdAt,
      },
      {
        label: t("mission_history.started_at"),
        at: record.startedAt,
        prev: record.assignedAt ?? record.createdAt,
      },
      {
        label: ended
          ? t("mission_history.ended_at")
          : t("mission_history.completed_at"),
        at: record.completedAt,
        prev: record.startedAt ?? record.assignedAt ?? record.createdAt,
      },
    ];
    const batteryEnd = record.batteryRateWhenStarted - record.batteryCost;
    const rejects = rejectMission?.[record.id];
    // 後端的 category 會有重複值 (例如兩個 dynamic-mission)
    const categories = [
      ...new Set(record.category?.filter((c): c is string => !!c)),
    ];

    return (
      <DetailGrid>
        <DetailSection $wide>
          <h5>{t("mission_history.timeline")}</h5>
          <Timeline>
            {steps.map((step, idx) => {
              const delta = formatDuration(diffMs(step.prev, step.at));
              return (
                <TimelineStep
                  key={idx}
                  $done={!!step.at}
                  $tone={
                    ended && idx === steps.length - 1 ? "danger" : undefined
                  }
                >
                  <strong>{step.label}</strong>
                  <span style={{ fontFamily: "Roboto Mono, monospace" }}>
                    {formatFullTime(step.at)}
                  </span>
                  {delta && idx > 0 && <MutedText> (+{delta})</MutedText>}
                </TimelineStep>
              );
            })}
          </Timeline>
        </DetailSection>

        <DetailSection>
          <h5>{t("mission_history.detail")}</h5>
          <DetailRow>
            <span>{t("mission_history.mission_id")}</span>
            <Typography.Text
              copyable
              style={{ fontFamily: "Roboto Mono, monospace", fontSize: 12 }}
            >
              {record.id}
            </Typography.Text>
          </DetailRow>
          <DetailRow>
            <span>{t("mission_history.full_name")}</span>
            <span>{missionTitle(record)}</span>
          </DetailRow>
          {record.sub_name && (
            <DetailRow>
              <span>{t("mission_history.sub_name")}</span>
              <span>{splitRoute(record.sub_name).join(" → ") || "—"}</span>
            </DetailRow>
          )}
          <DetailRow>
            <span>{t("mission_history.priority")}</span>
            <span>
              {record.priority !== undefined && record.priority !== null
                ? t(
                    PRIORITY_LABEL_KEY[record.priority] ??
                      "mission_history.unknown",
                  )
                : "—"}
            </span>
          </DetailRow>
          <DetailRow>
            <span>{t("mission_history.send_by")}</span>
            <span>{sendByLabel(record.send_by)}</span>
          </DetailRow>
          <DetailRow>
            <span>{t("mission_history.category")}</span>
            <span>
              {categories.length
                ? categories.map((c) => (
                    <Tag key={c} style={{ marginInlineEnd: 4 }}>
                      {c}
                    </Tag>
                  ))
                : "—"}
            </span>
          </DetailRow>
          {isCanceled(record.status) && (
            <DetailRow>
              <span>{t("mission_history.cancel_reason")}</span>
              <span style={{ color: "var(--c-danger)" }}>
                <I18nCancelReason reason={record.cancel_reason} />
              </span>
            </DetailRow>
          )}
          {record.message && (
            <DetailRow>
              <span>{t("mission_history.message")}</span>
              <span>{record.message}</span>
            </DetailRow>
          )}
        </DetailSection>

        <DetailSection>
          <h5>{t("mission_history.vehicle")}</h5>
          <DetailRow>
            <span>{t("mission_history.amr_id")}</span>
            <span>{record.amrId || "—"}</span>
          </DetailRow>
          <DetailRow>
            <span>{t("mission_history.battery")}</span>
            <span>
              {record.startedAt
                ? t("mission_history.battery_detail", {
                    start: record.batteryRateWhenStarted,
                    end: batteryEnd,
                    cost: record.batteryCost,
                  })
                : "—"}
            </span>
          </DetailRow>
          <DetailRow>
            <span>{t("mission_history.distance")}</span>
            <span>{`${record.totalDistanceTraveled.toFixed(1)} m`}</span>
          </DetailRow>
          <DetailRow>
            <span>{t("mission_history.manual_mode")}</span>
            <span>{record.manualMode ? t("utils.yes") : t("utils.no")}</span>
          </DetailRow>
          <DetailRow>
            <span>{t("mission_history.emergency_btn")}</span>
            <span
              style={
                record.emergencyBtn ? { color: "var(--c-danger)" } : undefined
              }
            >
              {record.emergencyBtn
                ? t("mission_history.pressed")
                : t("mission_history.not_pressed")}
            </span>
          </DetailRow>
          <DetailRow>
            <span>{t("mission_history.recovery_btn")}</span>
            <span
              style={
                record.recoveryBtn ? { color: "var(--c-warning)" } : undefined
              }
            >
              {record.recoveryBtn
                ? t("mission_history.pressed")
                : t("mission_history.not_pressed")}
            </span>
          </DetailRow>
        </DetailSection>

        {!!record.warningIdList?.length && (
          <DetailSection $wide>
            <h5>{t("mission_history.warnings")}</h5>
            <Flex gap={6} wrap>
              {record.warningIdList.map((id, idx) => (
                <Tag key={`${id}-${idx}`} color="warning">
                  #{id} {warningInfo.get(id) ?? ""}
                </Tag>
              ))}
            </Flex>
          </DetailSection>
        )}

        {!!rejects?.length && (
          <DetailSection $wide>
            <h5>{t("mission_history.reject_reasons")}</h5>
            {rejects.map((entry, idx) => (
              <DetailRow key={idx}>
                <span>{entry.amrId}</span>
                <span>{entry.reason}</span>
              </DetailRow>
            ))}
          </DetailSection>
        )}
      </DetailGrid>
    );
  };

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
      {contextHolder}
      <RangePopupGlobalStyle />
      <IndustrialDrawer
        $isDark={isDark}
        styles={{ wrapper: { maxWidth: "100%" } }}
        title={
          <DrawerTitleWrapper>
            <IndustrialTypography level={4} $isDark={isDark}>
              {t("mission_history.title")}
            </IndustrialTypography>
            <DrawerTitleActions>
              <Input
                placeholder={t("mission_history.search_mission_or_id")}
                prefix={<SearchOutlined />}
                allowClear
                style={{ flex: "1 1 200px", minWidth: 180, maxWidth: 260 }}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />

              <RangePicker
                value={dateRange}
                onChange={(val) => setDateRange(val as [Dayjs, Dayjs] | null)}
                allowClear
                style={{ flex: "0 1 auto", minWidth: 220 }}
                classNames={{ popup: { root: RANGE_POPUP_CLS } }}
                styles={{ popup: { container: { marginInlineStart: 0 } } }}
              />

              <Tooltip
                title={
                  dateRange ? undefined : t("mission_history.export_need_range")
                }
              >
                <Button
                  icon={<DownloadOutlined />}
                  disabled={!dateRange}
                  loading={exportMutation.isLoading}
                  onClick={() => exportMutation.mutate()}
                >
                  {t("mission_history.export")}
                </Button>
              </Tooltip>

              <IndustrialButton
                className="refresh-btn"
                type="primary"
                icon={<SyncOutlined spin={isFetching} />}
                onClick={() => refetch()}
                size="small"
              >
                {t("mission_history.refresh")}
              </IndustrialButton>
            </DrawerTitleActions>
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
              columns={columns}
              dataSource={missions?.data as Mission[] | undefined}
              loading={isLoading}
              rowKey="id"
              expandable={{
                expandedRowRender: renderDetail,
                expandRowByClick: true,
              }}
              pagination={{
                current: pagination.page,
                pageSize: pagination.pageSize,
                total: missions?.pagination.total,
                showSizeChanger: true,
                pageSizeOptions: ["10", "20", "50"],
                showTotal: (total) =>
                  t("mission_history.total_missions", { count: total }),
                onChange: (page, pageSize) => {
                  setPagination({ page, pageSize });
                },
              }}
              scroll={{ x: 910 }}
            />
          </IndustrialTableContainer>
        )}
      </IndustrialDrawer>
    </ConfigProvider>
  );
};

export default memo(MissionHistory);
