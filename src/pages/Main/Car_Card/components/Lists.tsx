import { memo, useCallback, useEffect, useMemo, useState } from "react";
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
  useIsCharging,
  MaintenanceLevel,
} from "@/sockets/useAMRInfo";
import { useTranslation } from "react-i18next";
import OfflineReason from "./OfflineReason";
import {
  CarryTag,
  ChargingTag,
  IsPause,
  IsPosAccurate,
  ManualTag,
  MiR_Error,
  MissionTag,
  PowerTag,
  StepWaitTag,
  StepCheckTag,
} from "./Tags";
import useRoadConditions from "@/sockets/useAmrRoadConditions";
import useMapList from "@/api/useMapList";
import { useMiRStatus } from "@/sockets/useMirStatus";
import { useSystemState } from "@/sockets/useSystemState";
import { useSetAtom } from "jotai";
import { usePermission } from "@/utils/permissions";
import { amrId2ColorRainbow, amrShortNum, textOnColor } from "@/utils/utils";
import { JoystickAmrId } from "@/atoms/main/mainAtoms";
import MapSwitchModal from "./MapSwitchModal";
import { MaintenanceBadge } from "./MaintenancePanel";
import { mq } from "@/styles/responsive";
import useAmrMissionTip from "@/hooks/useAmrMissionTip";
import { useAmrAvoid } from "@/sockets/useTrafficAvoids";
import {
  routeHighlightAtom,
  type RouteHighlightPoint,
} from "@/components/CanvasMap/routeHighlight";

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
  padding: ${({ $compact }) => ($compact ? "7px 10px 7px 12px" : "11px 12px 4px 14px")};
`;

const HeadMain = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`;

const OnlineDot = styled.span<{ $state: OnlineState }>`
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $state }) => ONLINE_COLOR[$state]};
  /* 外圈淡淡一圈同色光暈, 不動 (省效能) */
  box-shadow: 0 0 0 3px color-mix(in srgb, ${({ $state }) => ONLINE_COLOR[$state]} 18%, transparent);
`;

// 車號牌: 小字「車號」+ 實心色塊的車號。色塊就是這台車的識別色 (跟地圖上的車、任務表的徽章同色),
// 字色依色塊明暗自動選黑 / 白。離線時不淡化 (色塊淡了字就看不清楚; 離線已有紅點與提示框)。
const AmrNum = styled.span<{ $offline: boolean; $compact: boolean }>`
  flex: 0 1 auto;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  white-space: nowrap;
  font-family: var(--font-ui);

  small {
    font-size: var(--font-sm);
    font-weight: 600;
    letter-spacing: 0.14em;
    color: var(--c-text-muted);
  }
`;

const AmrPlate = styled.b<{ $compact: boolean }>`
  display: inline-block;
  padding: ${({ $compact }) => ($compact ? "2px 7px" : "3px 11px")};
  font-family: var(--font-num);
  font-size: ${({ $compact }) => ($compact ? "14px" : "20px")};
  font-weight: 700;
  font-stretch: 112%;
  line-height: 1.1;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
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
  border-radius: 0;
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
  column-gap: 6px;
  margin-top: 2px;
  padding-left: 13px; /* 跟車號對齊 (在線燈號的寬度) */
  font-size: var(--font-sm);
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--c-text-muted);

  /* 欄位之間用細點隔開 */
  > * + *::before {
    content: "·";
    margin-right: 6px;
    color: var(--c-border-strong);
    font-weight: 600;
  }
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
    if ($delay <= 100) return "var(--c-success-text)";
    if ($delay <= 300) return "var(--c-warning-text)";
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
    font-size: var(--font-sm);
    color: ${({ $danger }) =>
      $danger ? "var(--c-danger)" : "var(--c-text-muted)"};
  }

`;

// 低於這個電量,電量數字會變成警示色 (跟「低電量」標籤同一個門檻)
const LOW_BATTERY = 25;

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
    const can = usePermission();
    const AmrID = useMemo(() => {
      return {
        num: amrShortNum(amrId),
        category: amrId.split("-").slice(0, 3).join("-"),
      };
    }, [amrId]);

    const plateColor = amrId2ColorRainbow(amrId);

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
          <AmrNum $offline={isOverdue} $compact={compact} title={`${amrId} (${onlineText})`}>
            {!compact && <small>{t("utils.num")}</small>}
            <AmrPlate
              $compact={compact}
              style={{ background: plateColor, color: textOnColor(plateColor) }}
            >
              {AmrID.num}
            </AmrPlate>
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
            {isMiR(amrId) && can("amr.manual") && (
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
        {!compact && <OfflineReason amrId={amrId} />}
      </Head>
    );
  },
);

// ======= 數值區: 電量條 + 位置 / 車速 / 轉角 =======

const MetricBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 12px 10px 14px;
`;

type BatteryTone = "muted" | "success" | "warning" | "danger";
const BATTERY_TONE: Record<BatteryTone, string> = {
  muted: "var(--c-border-strong)",
  success: "var(--c-success)",
  warning: "var(--c-warning)",
  danger: "var(--c-danger)",
};

// 電量獨立一行 (細長電量條 + 完整百分比): 以前跟其他三格擠在一起, 側欄窄的時候會被截成「86.…」
const BatteryLine = styled.div<{ $tone: BatteryTone }>`
  --tone: ${({ $tone }) => BATTERY_TONE[$tone]};
  display: flex;
  align-items: center;
  gap: 8px;

  .anticon {
    flex-shrink: 0;
    font-size: 12px;
    color: var(--tone);
  }
  .bar {
    flex: 1;
    height: 3px;
    border-radius: 0;
    background: var(--c-bg-muted);
    overflow: hidden;
  }
  .bar > i {
    display: block;
    height: 100%;
    border-radius: 0;
    background: var(--tone);
    transition: width 0.6s ease;
  }
  .pct {
    flex-shrink: 0;
    min-width: 2.6em;
    text-align: right;
    font-family: var(--font-num);
    font-size: 16px;
    font-weight: 600;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    color: ${({ $tone }) => ($tone === "danger" ? "var(--c-danger)" : $tone === "muted" ? "var(--c-text-muted)" : "var(--c-text)")};
  }
`;

const StatGrid = styled.div<{ $cols: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $cols }) => $cols}, minmax(0, 1fr));
  gap: 6px;
`;

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;

  > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .label {
    font-size: var(--font-sm); /* 中文標籤不要再小, Windows 的正黑體 10px 會糊 */
    line-height: 1.2;
    letter-spacing: 0.12em;
    color: var(--c-text-muted);
  }
  .value {
    font-family: var(--font-num);
    font-size: 16px;
    font-weight: 600;
    line-height: 1.15;
    font-variant-numeric: tabular-nums;
    color: var(--c-text);
  }
  .value.empty {
    color: var(--c-text-muted);
    font-weight: 600;
  }
`;

type MetricProps = { amrId: string; isOffline?: boolean };

const BatteryMetric: React.FC<MetricProps> = memo(({ amrId, isOffline }) => {
  const { battery } = useBattery(amrId);
  const { isCharge } = useIsCharging(amrId);
  const { t } = useTranslation();
  const has = !isOffline && typeof battery === "number" && battery > 0;
  const tone: BatteryTone = !has
    ? "muted"
    : isCharge
      ? "success"
      : (battery as number) < LOW_BATTERY
        ? "danger"
        : (battery as number) < 40
          ? "warning"
          : "success";
  return (
    <BatteryLine
      $tone={tone}
      title={`${t("mission_dispatch_board.amr_battery")} ${has ? `${(battery as number).toFixed(1)}%` : NO_DATA}${isCharge ? ` · ${t("mode.is_charge")}` : ""}`}
    >
      <ThunderboltOutlined />
      <span className="bar">
        <i style={{ width: has ? `${Math.min(100, Math.max(0, battery as number))}%` : 0 }} />
      </span>
      <span className="pct">{has ? `${Math.round(battery as number)}%` : NO_DATA}</span>
    </BatteryLine>
  );
});

const StatItem: React.FC<{ label: string; value?: string; title?: string }> = ({ label, value, title }) => (
  <Stat title={title ?? label}>
    <span className="label">{label}</span>
    <span className={value ? "value" : "value empty"}>{value || NO_DATA}</span>
  </Stat>
);

const LocMetric: React.FC<MetricProps> = memo(({ amrId, isOffline }) => {
  const { closeLoc } = useCloseLoc(amrId);
  const { t } = useTranslation();
  const v = formatLoc(closeLoc, isOffline);
  return <StatItem label={t("mission_dispatch_board.amr_location")} value={v === NO_DATA ? undefined : v} />;
});

const SpeedMetric: React.FC<MetricProps> = memo(({ amrId, isOffline }) => {
  const { speed } = useSpeed(amrId);
  const { t } = useTranslation();
  const label = t("mission_dispatch_board.amr_speed");
  return (
    <StatItem
      label={label}
      title={`${label} (m/s)`}
      value={!isOffline && speed != null ? Math.abs(Number(speed)).toFixed(2) : undefined}
    />
  );
});

const YawMetric: React.FC<MetricProps> = memo(({ amrId, isOffline }) => {
  const { yaw } = useYaw(amrId);
  const { t } = useTranslation();
  const show = !isOffline && yaw !== undefined;
  return (
    <StatItem
      label={t("utils.yaw")}
      title={`${t("utils.yaw")}${show ? ` ${(yaw as number).toFixed(2)}°` : ""}`}
      value={show ? `${Math.round(yaw as number)}°` : undefined}
    />
  );
});

export const Metrics: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { isOverdue } = useIsLogIn(amrId);
  const mir = isMiR(amrId);
  return (
    <MetricBlock>
      <BatteryMetric amrId={amrId} isOffline={isOverdue} />
      <StatGrid $cols={mir ? 2 : 3}>
        {!mir && <LocMetric amrId={amrId} isOffline={isOverdue} />}
        <SpeedMetric amrId={amrId} isOffline={isOverdue} />
        <YawMetric amrId={amrId} isOffline={isOverdue} />
      </StatGrid>
    </MetricBlock>
  );
});

// ======= 文字列:狀態 / 路況 / 車況 / 使用中地圖… =======

const RowList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0 12px 0 14px;
  padding: 7px 0 9px;
  border-top: 1px solid var(--c-border);
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
      border-radius: 0;
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
  font-size: var(--font-sm);
  letter-spacing: 0.1em;
  color: var(--c-text-muted);
`;

const RowValue = styled.span<{ $muted?: boolean }>`
  min-width: 0;
  font-weight: 600;
  text-align: right;
  overflow-wrap: anywhere;
  color: ${({ $muted }) => ($muted ? "var(--c-text-muted)" : "var(--c-text)")};
`;

// 值底下的小字 (例如起訖下面的「前往 X」)
const RowSub = styled.span`
  display: block;
  font-size: 11px;
  font-weight: 400;
  color: var(--c-text-muted);
`;

const MapGroupName = styled.span`
  font-weight: 600;
  color: var(--c-text-muted);
`;

const MapSwitchIcon = styled(SwapOutlined)`
  margin-left: 4px;
  font-size: var(--font-sm);
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
  const avoid = useAmrAvoid(amrId);
  const { t } = useTranslation();
  // 避讓中: 交管的審路權照樣會送「順暢」, 所以避讓優先顯示, 讓人知道它是從哪裡讓到哪裡
  if (!isOffline && avoid) {
    return (
      <InfoRow
        title={
          avoid.forAmrId
            ? t("amr_card.avoid_for", { amr: avoid.forAmrId })
            : undefined
        }
      >
        <RowLabel>{t("utils.road_conditions")}</RowLabel>
        <RowValue style={{ color: "var(--c-warning)" }}>
          {`${t("amr_card.avoiding")} ${avoid.fromId || NO_DATA} → ${avoid.asideId}`}
          {avoid.forAmrId ? (
            <RowSub>{t("amr_card.avoid_for", { amr: avoid.forAmrId })}</RowSub>
          ) : null}
        </RowValue>
      </InfoRow>
    );
  }
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

const SystemStateRow: React.FC<RowProps> = memo(({ amrId, isOffline }) => {
  const s = useSystemState(amrId);
  const { t } = useTranslation();
  return (
    <TextRow
      label={t("utils.system_state", { defaultValue: "系統狀態" })}
      value={isOffline || !s?.state ? NO_DATA : s.state}
    />
  );
});

const pickLoc = (value?: string | null) => {
  const trimmed = value?.trim() ?? "";
  return trimmed && trimmed !== "0" ? trimmed : "";
};

/**
 * 循軌車 (非 MiR) 走點位, 知道從哪出發、最後到哪: 顯示 起點 → 終點,
 * 這一動要去的點跟終點不一樣時 (例如先取貨再放貨) 底下再寫「前往 X」。
 * hover 這一列時, 地圖上把起點、終點 (和前往的點) 標出來
 */
const RouteRow: React.FC<RowProps> = memo(({ amrId, isOffline }) => {
  const { destination } = useAmrDestination(amrId);
  const { t } = useTranslation();
  const setRouteHighlight = useSetAtom(routeHighlightAtom);
  const startId = pickLoc(destination?.startLocationId);
  const start = pickLoc(destination?.startName) || startId;
  const finalId = pickLoc(destination?.finalLocationId);
  const end = pickLoc(destination?.name) || finalId;
  const next = pickLoc(destination?.locationId);

  const points: RouteHighlightPoint[] = [];
  if (startId)
    points.push({
      locationId: startId,
      label: t("amr_card.start_label", { loc: start }),
      kind: "start",
    });
  if (finalId)
    points.push({
      locationId: finalId,
      label: t("amr_card.end_label", { loc: end }),
      kind: "end",
    });
  if (next && next !== finalId && next !== startId)
    points.push({
      locationId: next,
      label: t("amr_card.heading_to", { loc: next }),
      kind: "next",
    });
  const pointsKey = JSON.stringify(points);
  const canHighlight = !isOffline && points.length > 0;

  const showOnMap = useCallback(() => {
    if (!canHighlight) return;
    setRouteHighlight({
      amrId,
      points: JSON.parse(pointsKey) as RouteHighlightPoint[],
      since: performance.now(),
    });
  }, [amrId, canHighlight, pointsKey, setRouteHighlight]);
  const hideOnMap = useCallback(
    () => setRouteHighlight((cur) => (cur?.amrId === amrId ? null : cur)),
    [amrId, setRouteHighlight],
  );
  // 卡片收起來 / 換頁時游標沒移出去, 也要把地圖上的標記拿掉
  useEffect(() => hideOnMap, [hideOnMap]);
  // hover 中途任務往下一段 (起訖變了): 標記跟著換, 不重新淡入
  useEffect(() => {
    setRouteHighlight((cur) =>
      cur?.amrId === amrId
        ? canHighlight
          ? { ...cur, points: JSON.parse(pointsKey) as RouteHighlightPoint[] }
          : null
        : cur,
    );
  }, [amrId, canHighlight, pointsKey, setRouteHighlight]);

  if (isOffline || (!start && !end && !next)) {
    return <TextRow label={t("amr_card.route")} value={NO_DATA} />;
  }
  return (
    <InfoRow
      $clickable={canHighlight}
      style={canHighlight ? { cursor: "default" } : undefined}
      onMouseEnter={showOnMap}
      onMouseLeave={hideOnMap}
    >
      <RowLabel>{t("amr_card.route")}</RowLabel>
      <RowValue>
        {`${start || NO_DATA} → ${end || next}`}
        {next && finalId && next !== finalId ? (
          <RowSub>{t("amr_card.heading_to", { loc: next })}</RowSub>
        ) : null}
      </RowValue>
    </InfoRow>
  );
});

/** 原本畫在地圖車頭上的提示 (在做什麼、要去哪裡), 改放在卡片; 循軌車的目的地改成 起點 → 終點 */
const MissionTipRows: React.FC<RowProps & { mir: boolean }> = memo(
  ({ amrId, isOffline, mir }) => {
    const { tipText, destinationText } = useAmrMissionTip(amrId);
    const { t } = useTranslation();
    return (
      <>
        <TextRow
          label={t("fleet3d.info.mission")}
          value={isOffline || !tipText ? NO_DATA : tipText}
        />
        {mir ? (
          <TextRow
            label={t("mission_dispatch_board.amr_destination")}
            value={isOffline || !destinationText ? NO_DATA : destinationText}
          />
        ) : (
          <RouteRow amrId={amrId} isOffline={isOffline} />
        )}
      </>
    );
  },
);

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
 * 正常大小只列每天會看的那幾列 (含任務、目的地);detailed 再加上原始狀態、座標。
 */
export const InfoRows: React.FC<{ amrId: string; detailed: boolean }> = memo(
  ({ amrId, detailed }) => {
    const { isOverdue } = useIsLogIn(amrId);
    const mir = isMiR(amrId);
    return (
      <RowList>
        <MissionTipRows amrId={amrId} isOffline={isOverdue} mir={mir} />
        {mir ? (
          <>
            <MiRRunningRow amrId={amrId} isOffline={isOverdue} />
            <MiRMapRow amrId={amrId} isOffline={isOverdue} />
          </>
        ) : (
          <>
            {detailed && <RosStatusRow amrId={amrId} isOffline={isOverdue} />}
            {detailed && <SystemStateRow amrId={amrId} isOffline={isOverdue} />}
            <RoadRow amrId={amrId} isOffline={isOverdue} />
            <MaintenanceRow amrId={amrId} isOffline={isOverdue} />
          </>
        )}
        {detailed && <CoordinateRow amrId={amrId} isOffline={isOverdue} />}
      </RowList>
    );
  },
);

// ======= 狀態標籤 =======

const TagWrap = styled.div<{ $offline: boolean }>`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 0 12px 12px 14px;

  /* 標籤只列成立的狀態, 一個都沒有時整列收起來 */
  &:empty {
    display: none;
  }

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
      {!isOverdue && <StepCheckTag amrId={amrId} />}
      {!isOverdue && <StepWaitTag amrId={amrId} />}
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
