import { memo, useEffect, useMemo, useState } from "react";
import styled, { css } from "styled-components";

import {
  EnvironmentOutlined,
  ThunderboltOutlined,
  CompassOutlined,
  CarOutlined,
  DownOutlined,
  UpOutlined,
  SwapOutlined,
  WarningFilled,
} from "@ant-design/icons";
import Icon from "@ant-design/icons";
import {
  useAmrDestination,
  useAmrStatus,
  useBattery,
  useCloseLoc,
  useIsLogIn,
  useYaw,
  useXY,
  useMaintenanceStatus,
  useSpeed,
  MaintenanceLevel,
} from "@/sockets/useAMRInfo";
import { useTranslation } from "react-i18next";
import {
  CarryTag,
  ChargingTag,
  IsPause,
  IsPosAccurate,
  ManualTag,
  MiR_Error,
  MissionTag,
  PowerTag,
  StateTag,
} from "./Tags";
import useRoadConditions from "@/sockets/useAmrRoadConditions";
import useMapList from "@/api/useMapList";
import { useMiRStatus } from "@/sockets/useMirStatus";
import { useSystemState } from "@/sockets/useSystemState";
import { useSetAtom } from "jotai";
import { JoystickAmrId } from "../../global/jotai";
import MapSwitchModal from "./MapSwitchModal";
import { MaintenanceBadge } from "./MaintenancePanel";
import { mq } from "@/styles/responsive";

const GamepadSvg = () => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 12h4" />
    <path d="M8 10v4" />
    <circle cx="16.3" cy="9.6" r="0.65" />
    <circle cx="18.7" cy="12" r="0.65" />
    <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
  </svg>
);

export const GamepadOutlined = (props: { amrId:string, className?: string, title?: string }) => {
    const setJoystickAmrId = useSetAtom(JoystickAmrId);
  return <Icon onClick={(e) => {
    e.stopPropagation();
    setJoystickAmrId(props.amrId);
  }} component={GamepadSvg} {...props} />
};

const NO_DATA = "--";

const isMiR = (amrId: string) => amrId.includes("mi");

// ======= 卡片標題列 =======

type OnlineState = "online" | "warning" | "offline";

const ONLINE_COLOR: Record<OnlineState, string> = {
  online: "var(--c-success)",
  warning: "var(--c-warning)",
  offline: "var(--c-danger)",
};

const Head = styled.div<{ $compact: boolean }>`
  padding: ${({ $compact }) => ($compact ? "6px 8px" : "8px 10px")};
  border-radius: 0 3px 0 0;

  ${({ $compact }) =>
    !$compact &&
    css`
      background: var(--c-bg-subtle);
      border-bottom: 1px solid var(--c-border);
    `}
`;

const HeadMain = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`;

const OnlineDot = styled.span<{ $state: OnlineState }>`
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $state }) => ONLINE_COLOR[$state]};
`;

const AmrNum = styled.span<{ $offline: boolean }>`
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: ${({ $offline }) =>
    $offline ? "var(--c-text-muted)" : "var(--c-text)"};
`;

const HeadActions = styled.div<{ $compact: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ $compact }) => ($compact ? "0" : "2px")};
  margin-left: auto;
  flex-shrink: 0;

  /* 最小化時一行要塞下車號 / 位置 / 電量,按鈕讓出一點寬度 */
  ${({ $compact }) =>
    $compact &&
    css`
      && > * {
        min-width: 18px;
        padding: 0 2px;
      }
    `}
`;

const IconBtn = styled.button`
  all: unset;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 4px;
  gap: 3px;
  border-radius: 2px;
  font-size: 12px;
  color: var(--c-text-secondary);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;

  &:hover {
    background: var(--c-bg-muted);
    color: var(--c-header-accent);
  }

  &:focus-visible {
    outline: 2px solid var(--c-header-accent);
    outline-offset: 1px;
  }
`;

const WarnBtn = styled(IconBtn)`
  color: var(--c-danger);
  font-weight: 600;

  &:hover {
    background: var(--c-danger-soft);
    color: var(--c-danger);
  }
`;

const JoystickIcon = styled(GamepadOutlined)`
  font-size: 16px;
`;

const HeadSub = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: 8px;
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--c-text-muted);
`;

const OnlineText = styled.span<{ $state: OnlineState }>`
  font-weight: 600;
  color: ${({ $state }) =>
    $state === "online" ? "var(--c-text-secondary)" : ONLINE_COLOR[$state]};
`;

const NetworkDelay = styled.span<{ $delay: number | undefined }>`
  font-weight: 600;
  white-space: nowrap;
  color: ${({ $delay }) => {
    if ($delay === undefined) return "var(--c-text-muted)";
    if ($delay <= 100) return "var(--c-success)";
    if ($delay <= 300) return "var(--c-warning)";
    return "var(--c-danger)";
  }};
`;

// 電量排在最右邊、位置在它左邊。側欄窄到放不下時,位置會被擠到第二行,
// 而這裡只露出一行的高度,所以效果是「放不下就整個不顯示」,不會剩半截刪節號。
// (styled-components v5 內建的 stylis 不認得 @container,所以用換行裁切來做)
const CompactStatsWrap = styled.div`
  flex: 1 1 0;
  min-width: 0;
  height: 18px;
  display: flex;
  flex-direction: row-reverse;
  flex-wrap: wrap;
  align-items: center;
  column-gap: 6px;
  overflow: hidden;
  font-size: 12px;
  line-height: 18px;
`;

const CompactStat = styled.span<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 18px;
  flex-shrink: 0;
  font-weight: 600;
  white-space: nowrap;
  color: ${({ $danger }) => ($danger ? "var(--c-danger)" : "var(--c-text)")};

  .anticon {
    flex-shrink: 0;
    font-size: 11px;
    color: ${({ $danger }) =>
      $danger ? "var(--c-danger)" : "var(--c-text-muted)"};
  }

`;

// 低於這個電量,電量數字會變成警示色
const LOW_BATTERY = 20;

const formatBattery = (
  battery: number | undefined,
  isOffline?: boolean,
  digits = 1,
) => (!isOffline && battery ? `${battery.toFixed(digits)}%` : NO_DATA);

const formatLoc = (closeLoc: string | undefined, isOffline?: boolean) =>
  !isOffline && closeLoc ? closeLoc : NO_DATA;

/** 最小化卡片用:把位置跟電量塞在標題同一行 */
const CompactStats: React.FC<{ amrId: string; isOffline: boolean }> = memo(
  ({ amrId, isOffline }) => {
    const { closeLoc } = useCloseLoc(amrId);
    const { battery } = useBattery(amrId);
    const isLow = !isOffline && Boolean(battery) && (battery as number) < LOW_BATTERY;
    return (
      <CompactStatsWrap>
        <CompactStat $danger={isLow}>
          <ThunderboltOutlined />
          <span>{formatBattery(battery, isOffline, 0)}</span>
        </CompactStat>
        {!isMiR(amrId) && (
          <CompactStat>
            <EnvironmentOutlined />
            <span>{formatLoc(closeLoc, isOffline)}</span>
          </CompactStat>
        )}
      </CompactStatsWrap>
    );
  },
);

export const CardHeader: React.FC<{
  amrId: string;
  compact: boolean;
  // 這張卡片目前是不是被單獨展開成詳細內容
  expanded: boolean;
  // 全域已經是詳細模式時就沒有展開可言,不顯示箭頭
  showExpand: boolean;
  onToggleExpand: () => void;
  warnCount: number;
  onWarnClick: () => void;
}> = memo(
  ({
    amrId,
    compact,
    expanded,
    showExpand,
    onToggleExpand,
    warnCount,
    onWarnClick,
  }) => {
    const { networkDelay, isOverdue, hasServiceInterruption } =
      useIsLogIn(amrId);
    const { t } = useTranslation();
    const AmrID = useMemo(() => {
      return {
        num: amrId.split("-")[amrId.split("-").length - 1],
        category: amrId.split("-").slice(0, 3).join("-"),
      };
    }, [amrId]);

    const onlineState: OnlineState = isOverdue
      ? "offline"
      : hasServiceInterruption
        ? "warning"
        : "online";
    const onlineText = isOverdue
      ? t("utils.offline")
      : hasServiceInterruption
        ? t("utils.service_interrupted")
        : t("utils.online");

    return (
      <Head $compact={compact}>
        <HeadMain>
          <OnlineDot $state={onlineState} title={onlineText} />
          <AmrNum $offline={isOverdue} title={`${amrId} (${onlineText})`}>
            {compact ? AmrID.num : `${t("utils.num")} ${AmrID.num}`}
          </AmrNum>
          {compact && <CompactStats amrId={amrId} isOffline={isOverdue} />}
          <HeadActions $compact={compact}>
            {compact && <MaintenanceBadge amrId={amrId} />}
            {warnCount > 0 && (
              <WarnBtn
                type="button"
                title={t("file.warning_list.error_code") as string}
                onClick={(e) => {
                  e.stopPropagation();
                  onWarnClick();
                }}
              >
                <WarningFilled />
                {!compact && warnCount}
              </WarnBtn>
            )}
            {isMiR(amrId) && (
              <IconBtn
                as="span"
                title={t("mission_dispatch_board.amr_joystick") as string}
              >
                <JoystickIcon amrId={amrId} />
              </IconBtn>
            )}
            {showExpand && (
              <IconBtn
                type="button"
                title={
                  t(
                    expanded
                      ? "amr_card.collapse_detail"
                      : "amr_card.expand_detail",
                  ) as string
                }
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
              >
                {expanded ? <UpOutlined /> : <DownOutlined />}
              </IconBtn>
            )}
          </HeadActions>
        </HeadMain>
        {!compact && (
          <HeadSub>
            <span>{AmrID.category}</span>
            <OnlineText $state={onlineState}>{onlineText}</OnlineText>
            {!isOverdue && (
              <NetworkDelay $delay={networkDelay}>
                {networkDelay !== undefined ? `${networkDelay} ms` : NO_DATA}
              </NetworkDelay>
            )}
          </HeadSub>
        )}
      </Head>
    );
  },
);

// ======= 數值列:位置 / 車速 / 電量 / 轉角 =======

const MetricGrid = styled.div<{ $cols: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $cols }) => $cols}, minmax(0, 1fr));
  gap: 4px;
  padding: 8px 6px;
  border-bottom: 1px solid var(--c-border);
`;

const Metric = styled.div<{ $danger?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;

  .anticon {
    font-size: 13px;
    color: ${({ $danger }) =>
      $danger ? "var(--c-danger)" : "var(--c-text-muted)"};
  }
`;

const MetricValue = styled.span<{ $danger?: boolean }>`
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: ${({ $danger }) => ($danger ? "var(--c-danger)" : "var(--c-text)")};
`;

// 桌機側欄的卡片很窄,四格放不下單位,所以只在底部面板(卡片定寬)顯示單位
const MetricUnit = styled.span`
  margin-left: 1px;
  font-size: 10px;
  font-weight: 400;
  color: var(--c-text-muted);

  ${mq.web} {
    display: none;
  }
`;

type MetricProps = { amrId: string; isOffline?: boolean };

const LocMetric: React.FC<MetricProps> = memo(({ amrId, isOffline }) => {
  const { closeLoc } = useCloseLoc(amrId);
  const { t } = useTranslation();
  return (
    <Metric title={t("mission_dispatch_board.amr_location") as string}>
      <EnvironmentOutlined />
      <MetricValue>{formatLoc(closeLoc, isOffline)}</MetricValue>
    </Metric>
  );
});

const SpeedMetric: React.FC<MetricProps> = memo(({ amrId, isOffline }) => {
  const { speed } = useSpeed(amrId);
  const { t } = useTranslation();
  const displaySpeed = isOffline ? undefined : speed;
  return (
    <Metric title={`${t("mission_dispatch_board.amr_speed")} (m/s)`}>
      <CarOutlined />
      <MetricValue>
        {displaySpeed != null
          ? Math.abs(Number(displaySpeed)).toFixed(2)
          : NO_DATA}
        <MetricUnit>m/s</MetricUnit>
      </MetricValue>
    </Metric>
  );
});

const BatteryMetric: React.FC<MetricProps> = memo(({ amrId, isOffline }) => {
  const { battery } = useBattery(amrId);
  const { t } = useTranslation();
  const isLow = !isOffline && Boolean(battery) && (battery as number) < LOW_BATTERY;
  return (
    <Metric
      $danger={isLow}
      title={t("mission_dispatch_board.amr_battery") as string}
    >
      <ThunderboltOutlined />
      <MetricValue $danger={isLow}>
        {formatBattery(battery, isOffline)}
      </MetricValue>
    </Metric>
  );
});

const YawMetric: React.FC<MetricProps> = memo(({ amrId, isOffline }) => {
  const { yaw } = useYaw(amrId);
  const { t } = useTranslation();
  const displayYaw = isOffline ? undefined : yaw;
  return (
    <Metric
      title={`${t("utils.yaw")}${displayYaw !== undefined ? ` ${displayYaw.toFixed(2)}°` : ""}`}
    >
      <CompassOutlined />
      <MetricValue>
        {displayYaw !== undefined ? `${Math.round(displayYaw)}°` : NO_DATA}
      </MetricValue>
    </Metric>
  );
});

export const Metrics: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { isOverdue } = useIsLogIn(amrId);
  const mir = isMiR(amrId);
  return (
    <MetricGrid $cols={mir ? 3 : 4}>
      {!mir && <LocMetric amrId={amrId} isOffline={isOverdue} />}
      <SpeedMetric amrId={amrId} isOffline={isOverdue} />
      <BatteryMetric amrId={amrId} isOffline={isOverdue} />
      <YawMetric amrId={amrId} isOffline={isOverdue} />
    </MetricGrid>
  );
});

// ======= 文字列:狀態 / 路況 / 車況 / 使用中地圖… =======

const RowList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
`;

const InfoRow = styled.div<{ $clickable?: boolean }>`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  line-height: 1.6;

  ${({ $clickable }) =>
    $clickable &&
    css`
      margin: 0 -4px;
      padding: 0 4px;
      border-radius: 2px;
      cursor: pointer;
      transition: background-color 0.15s ease;

      &:hover {
        background: var(--c-header-accent-soft);
      }

      &:hover .map-switch-icon {
        opacity: 1;
      }
    `}
`;

const RowLabel = styled.span`
  flex-shrink: 0;
  color: var(--c-text-muted);
`;

const RowValue = styled.span<{ $muted?: boolean }>`
  min-width: 0;
  font-weight: 600;
  text-align: right;
  overflow-wrap: anywhere;
  color: ${({ $muted }) => ($muted ? "var(--c-text-muted)" : "var(--c-text)")};
`;

const MapGroupName = styled.span`
  font-weight: 400;
  color: var(--c-text-muted);
`;

const MapSwitchIcon = styled(SwapOutlined)`
  margin-left: 4px;
  font-size: 11px;
  color: var(--c-header-accent);
  opacity: 0;
  transition: opacity 0.15s ease;
`;

type RowProps = { amrId: string; isOffline?: boolean };

const TextRow: React.FC<{ label: string; value: string; color?: string }> = ({
  label,
  value,
  color,
}) => {
  const muted = value === NO_DATA;
  return (
    <InfoRow>
      <RowLabel>{label}</RowLabel>
      <RowValue $muted={muted} style={!muted && color ? { color } : undefined}>
        {value}
      </RowValue>
    </InfoRow>
  );
};

const RoadRow: React.FC<RowProps> = memo(({ amrId, isOffline }) => {
  const status = useRoadConditions(amrId);
  const { t } = useTranslation();
  return (
    <TextRow
      label={t("utils.road_conditions")}
      value={isOffline || !status ? NO_DATA : status}
      color={status === "順暢" ? "var(--c-success)" : undefined}
    />
  );
});

const MaintenanceRow: React.FC<RowProps> = memo(({ amrId, isOffline }) => {
  const { status, level, blocking } = useMaintenanceStatus(amrId);
  const { t } = useTranslation();
  const color = !blocking
    ? undefined
    : level === MaintenanceLevel.BROKEN
      ? "var(--c-danger)"
      : "var(--c-warning)";
  return (
    <TextRow
      label={t("utils.maintenance_level")}
      value={isOffline || !status ? NO_DATA : status}
      color={color}
    />
  );
});

const RosStatusRow: React.FC<RowProps> = memo(({ amrId, isOffline }) => {
  const { status } = useAmrStatus(amrId);
  const { t } = useTranslation();
  return (
    <TextRow
      label={t("utils.status")}
      value={isOffline || !status ? NO_DATA : status}
    />
  );
});

const DestinationRow: React.FC<RowProps> = memo(({ amrId, isOffline }) => {
  const { destination } = useAmrDestination(amrId);
  const { t } = useTranslation();
  return (
    <TextRow
      label={t("mission_dispatch_board.amr_destination")}
      value={isOffline || !destination?.name ? NO_DATA : destination.name}
    />
  );
});

const CoordinateRow: React.FC<RowProps> = memo(({ amrId, isOffline }) => {
  const { loc } = useXY(amrId);
  const { t } = useTranslation();
  const fmt = (v: number | undefined) =>
    v !== undefined ? v.toFixed(2) : NO_DATA;
  return (
    <TextRow
      label={t("amr_card.coordinate")}
      value={
        isOffline || !loc ? NO_DATA : `X ${fmt(loc.x)} / Y ${fmt(loc.y)}`
      }
    />
  );
});

// 換圖是實際下指令給車體的動作, 車輛必須是 Ready(閒置)狀態才能換, 避免在執行任務中途換圖。
export const MIR_MAP_SWITCHABLE_STATUS = "Ready";

export const MiR_StatusColor = (status: string) => {
  switch (status) {
    case "Ready":
      return "#2f80ed";
    case "Executing":
      return "#27ae60";
    default:
      return "#eb5757";
  }
};

const MiRRunningRow: React.FC<RowProps> = memo(({ amrId, isOffline }) => {
  const { status, protectiveStop } = useMiRStatus(amrId);
  const { t } = useTranslation();
  const showText = protectiveStop ? "ProtectiveStop" : status;
  return (
    <TextRow
      label={t("utils.status")}
      value={isOffline || !showText ? NO_DATA : showText}
      color={MiR_StatusColor(status)}
    />
  );
});

const MiRMapRow: React.FC<RowProps> = memo(({ amrId, isOffline }) => {
  const [activateMap, setActivateMap] = useState<{
    mapName: string;
    groupName: string;
  } | null>(null);
  const [switchModalOpen, setSwitchModalOpen] = useState(false);
  const { t } = useTranslation();
  const MiR_Status_IO = useMiRStatus(amrId);
  const { data: maps } = useMapList();

  useEffect(() => {
    if (maps && maps.length) {
      const active_map = maps
        .filter((map) => map.id == MiR_Status_IO.active_map_id)
        .map((map) => {
          return { mapName: map.fileName, groupName: map.map_group_name ?? "" };
        });

      if (active_map && active_map.length) {
        setActivateMap(active_map[0]);
      }
    }
  }, [MiR_Status_IO, maps]);
  if (!maps) return <></>;
  // 離線車輛沒有可用資料, 點了也沒意義才擋; 非 Ready 狀態仍讓使用者點進 modal,
  // 由 modal 裡明顯的提示說明「為什麼不能換」, 而不是在這裡默默擋掉、使用者不知所以然。
  const canOpenModal = !isOffline;
  const isReady = MiR_Status_IO.status === MIR_MAP_SWITCHABLE_STATUS;
  const hasMap = !isOffline && maps.length > 0 && activateMap;
  return (
    <>
      <InfoRow
        $clickable={canOpenModal}
        onClick={(e) => {
          e.stopPropagation();
          if (!canOpenModal) return;
          setSwitchModalOpen(true);
        }}
        title={
          isReady
            ? (t("utils.activate_map") as string)
            : (t("utils.switch_map_requires_ready") as string)
        }
      >
        <RowLabel>{t("utils.activate_map")}</RowLabel>
        <RowValue $muted={!hasMap}>
          {hasMap ? (
            <>
              {activateMap.mapName}{" "}
              <MapGroupName>({activateMap.groupName})</MapGroupName>
              <MapSwitchIcon className="map-switch-icon" />
            </>
          ) : (
            NO_DATA
          )}
        </RowValue>
      </InfoRow>
      {switchModalOpen && (
        <MapSwitchModal
          amrId={amrId}
          open={switchModalOpen}
          onClose={() => setSwitchModalOpen(false)}
        />
      )}
    </>
  );
});

/**
 * 正常大小只列每天會看的那幾列;detailed 再加上原始狀態、目的地、座標。
 */
export const InfoRows: React.FC<{ amrId: string; detailed: boolean }> = memo(
  ({ amrId, detailed }) => {
    const { isOverdue } = useIsLogIn(amrId);
    const mir = isMiR(amrId);
    return (
      <RowList>
        {mir ? (
          <>
            <MiRRunningRow amrId={amrId} isOffline={isOverdue} />
            <MiRMapRow amrId={amrId} isOffline={isOverdue} />
          </>
        ) : (
          <>
            {detailed && <RosStatusRow amrId={amrId} isOffline={isOverdue} />}
            <RoadRow amrId={amrId} isOffline={isOverdue} />
            <MaintenanceRow amrId={amrId} isOffline={isOverdue} />
          </>
        )}
        {detailed && (
          <>
            <DestinationRow amrId={amrId} isOffline={isOverdue} />
            <CoordinateRow amrId={amrId} isOffline={isOverdue} />
          </>
        )}
      </RowList>
    );
  },
);

// ======= 狀態標籤 =======

const TagWrap = styled.div<{ $offline: boolean }>`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 0 10px 10px;

  ${({ $offline }) =>
    $offline &&
    css`
      opacity: 0.45;
      filter: grayscale(1);
      pointer-events: none;
    `}
`;

export const CarTag: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { isOverdue } = useIsLogIn(amrId);
  const mir = isMiR(amrId);
  return (
    <TagWrap $offline={isOverdue}>
      <MissionTag amrId={amrId} />
      <CarryTag amrId={amrId} />
      <ChargingTag amrId={amrId} />
      <PowerTag amrId={amrId} />
      {!isOverdue && <ManualTag amrId={amrId} />}
      {!isOverdue && <IsPause amrId={amrId} />}
      {mir && !isOverdue && <MiR_Error amrId={amrId} />}
      {!mir && !isOverdue && <IsPosAccurate amrId={amrId} />}
    </TagWrap>
  );
});
