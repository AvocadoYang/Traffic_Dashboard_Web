import { DispatchWidget } from "@/api/useMissionDispatchBoard";
import BtnGroup from "@/pages/Main/Car_Card/components/BtnGroup";
import { MiR_StatusColor } from "@/pages/Main/Car_Card/components/Lists";
import {
  MaintenanceLevel,
  useAmrDestination,
  useAmrStatus,
  useBattery,
  useCloseLoc,
  useIsCarry,
  useIsCharging,
  useIsLogIn,
  useIsPause,
  useIsWorking,
  useMaintenanceStatus,
  usePosIsAccurate,
} from "@/sockets/useAMRInfo";
import { useMiRStatus } from "@/sockets/useMirStatus";
import { hintAmr } from "@/utils/gloable";
import { Modal } from "antd";
import { useSetAtom } from "jotai";
import React, { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import DispatchItemFrame from "./DispatchItemFrame";
import {
  MAX_WIDGET_HEIGHT,
  MAX_WIDGET_WIDTH,
  MIN_WIDGET_HEIGHT,
  MIN_WIDGET_WIDTH,
} from "./gridConstants";

export const AMR_STATUS_FIELDS = [
  "battery",
  "status",
  "location",
  "destination",
  "working",
  "carry",
  "charging",
  "lowBattery",
  "maintenance",
  "paused",
  "posAccurate",
] as const;
export type AmrStatusField = (typeof AMR_STATUS_FIELDS)[number];

const Card = styled.div<{
  $width: number;
  $height: number;
  $editable: boolean;
}>`
  width: ${({ $width }) => $width}px;
  height: ${({ $height }) => $height}px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #f0f0f0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
  cursor: ${({ $editable }) => ($editable ? "grab" : "pointer")};

  &:hover {
    box-shadow: ${({ $editable }) =>
      $editable
        ? "0 2px 6px rgba(0, 0, 0, 0.15)"
        : "0 4px 12px rgba(0, 0, 0, 0.25)"};
  }
`;

const TitleBar = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-weight: 600;
  font-size: 13px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

type OnlineState = "online" | "warning" | "offline";

const ONLINE_DOT_COLOR: Record<OnlineState, string> = {
  online: "#2eb800",
  warning: "#ff9646",
  offline: "red",
};

const OnlineDot = styled.span<{ $state: OnlineState }>`
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $state }) => ONLINE_DOT_COLOR[$state]};
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #595959;
`;

const Row = styled.div<{ $warn?: boolean; $muted?: boolean }>`
  display: flex;
  justify-content: space-between;
  gap: 8px;

  span:last-child {
    color: ${({ $warn, $muted }) => {
      if ($muted) return "#bfbfbf";
      return $warn ? "#ff4d4f" : "#262626";
    }};
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const NO_DATA = "--";

const StatRow: FC<{
  label: string;
  value: string;
  warn?: boolean;
  color?: string;
}> = ({ label, value, warn, color }) => {
  const muted = value === NO_DATA;
  const highlight = !muted && !warn && color;
  return (
    <Row $warn={warn && !muted} $muted={muted}>
      <span>{label}</span>
      <span style={highlight ? { color } : undefined}>{value}</span>
    </Row>
  );
};

const AmrStatusWidgetCard: FC<{
  widget: DispatchWidget;
  editMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onResizeEnd: (width: number, height: number) => void;
}> = ({ widget, editMode, onEdit, onDelete, onResizeEnd }) => {
  const { t } = useTranslation();
  const amrId = widget.amrId ?? "";
  const isMiR = amrId.includes("mi");
  const { isOverdue, hasServiceInterruption } = useIsLogIn(amrId);
  const { battery } = useBattery(amrId);
  const { closeLoc } = useCloseLoc(amrId);
  const { status: rosStatus } = useAmrStatus(amrId);
  const mirStatus = useMiRStatus(amrId);
  const { destination } = useAmrDestination(amrId);
  const { isWorking } = useIsWorking(amrId);
  const { isCarry } = useIsCarry(amrId);
  const { isCharge } = useIsCharging(amrId);
  const { isPause } = useIsPause(amrId);
  const { isPosAccurate } = usePosIsAccurate(amrId);
  const { status: maintenanceText, level: maintenanceLevel } =
    useMaintenanceStatus(amrId);
  const [controlOpen, setControlOpen] = useState(false);

  const setHintAmr = useSetAtom(hintAmr);
  const hintThisAmr = () => {
    if (amrId) setHintAmr(amrId);
  };
  const clearHint = () => setHintAmr((cur) => (cur === amrId ? "" : cur));
  useEffect(() => clearHint, [amrId]);

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

  const visibleFields = widget.visibleFields ?? AMR_STATUS_FIELDS;
  const showField = (field: AmrStatusField) => visibleFields.includes(field);

  const withData = (value: string | undefined | null) =>
    isOverdue || !value ? NO_DATA : value;
  const yesNo = (v: boolean | undefined) => {
    if (isOverdue || v === undefined) return NO_DATA;
    return v ? t("utils.yes") : t("utils.no");
  };

  const mirStatusText = mirStatus.protectiveStop
    ? "ProtectiveStop"
    : mirStatus.status;
  const statusText = withData(isMiR ? mirStatusText : rosStatus);
  const statusColor =
    isMiR && statusText !== NO_DATA
      ? MiR_StatusColor(mirStatus.status)
      : undefined;

  const locationText = withData(closeLoc === "-" ? undefined : closeLoc);

  const lowBattery = battery !== undefined && battery < 25;
  const paused = isMiR
    ? mirStatus.status === "Pause" && !mirStatus.protectiveStop
    : isPause;

  const posAccurate = isMiR ? undefined : isPosAccurate;
  const maintenanceWarn =
    maintenanceLevel !== undefined &&
    maintenanceLevel !== MaintenanceLevel.UNKNOWN &&
    maintenanceLevel !== MaintenanceLevel.NORMAL;

  return (
    <>
      <DispatchItemFrame
        id={widget.id}
        x={widget.x}
        y={widget.y}
        width={widget.width}
        height={widget.height}
        editMode={editMode}
        minWidth={MIN_WIDGET_WIDTH}
        maxWidth={MAX_WIDGET_WIDTH}
        minHeight={MIN_WIDGET_HEIGHT}
        maxHeight={MAX_WIDGET_HEIGHT}
        onEdit={onEdit}
        onDelete={onDelete}
        onResizeEnd={onResizeEnd}
      >
        {({ width, height }) => (
          <Card
            $width={width}
            $height={height}
            $editable={editMode}
            onClick={() => {
              if (!editMode) setControlOpen(true);
            }}
            onMouseEnter={hintThisAmr}
            onMouseLeave={clearHint}
          >
            <TitleBar title={`${widget.title || amrId} (${onlineText})`}>
              <OnlineDot $state={onlineState} />
              {widget.title || amrId}
            </TitleBar>
            <Body>
              {showField("battery") && (
                <StatRow
                  label={t("mission_dispatch_board.amr_battery")}
                  value={
                    isOverdue || battery === undefined
                      ? NO_DATA
                      : `${battery.toFixed(1)}%`
                  }
                  warn={lowBattery}
                />
              )}
              {showField("status") && (
                <StatRow
                  label={t("mission_dispatch_board.amr_status")}
                  value={statusText}
                  color={statusColor}
                />
              )}
              {showField("location") && (
                <StatRow
                  label={t("mission_dispatch_board.amr_location")}
                  value={locationText}
                />
              )}
              {showField("destination") && (
                <StatRow
                  label={t("mission_dispatch_board.amr_destination")}
                  value={withData(destination?.name)}
                />
              )}
              {showField("working") && (
                <StatRow
                  label={t("mission_dispatch_board.amr_working")}
                  value={yesNo(isWorking)}
                />
              )}
              {showField("carry") && (
                <StatRow
                  label={t("mission_dispatch_board.amr_carry")}
                  value={yesNo(isCarry)}
                />
              )}
              {showField("charging") && (
                <StatRow
                  label={t("mission_dispatch_board.amr_charging")}
                  value={yesNo(isCharge)}
                />
              )}
              {showField("lowBattery") && (
                <StatRow
                  label={t("mission_dispatch_board.amr_low_battery")}
                  value={
                    isOverdue || battery === undefined
                      ? NO_DATA
                      : yesNo(lowBattery)
                  }
                  warn={lowBattery}
                />
              )}
              {showField("maintenance") && (
                <StatRow
                  label={t("mission_dispatch_board.amr_maintenance")}
                  value={withData(maintenanceText)}
                  warn={maintenanceWarn}
                />
              )}
              {showField("paused") && (
                <StatRow
                  label={t("mission_dispatch_board.amr_paused")}
                  value={yesNo(paused)}
                  warn={Boolean(paused)}
                />
              )}
              {showField("posAccurate") && (
                <StatRow
                  label={t("mission_dispatch_board.amr_pos_accurate")}
                  value={yesNo(posAccurate)}
                  warn={posAccurate === false}
                />
              )}
            </Body>
          </Card>
        )}
      </DispatchItemFrame>

      <Modal
        title={amrId}
        open={controlOpen}
        onCancel={() => setControlOpen(false)}
        footer={null}
        destroyOnClose
      >
        {amrId && <BtnGroup amrId={amrId} />}
      </Modal>
    </>
  );
};

export default AmrStatusWidgetCard;
