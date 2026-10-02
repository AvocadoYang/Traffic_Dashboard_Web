import {
  useBattery,
  useIsCarry,
  useIsCharging,
  useIsManual,
  useIsPause,
  useIsWorking,
  usePosIsAccurate,
} from "@/sockets/useAMRInfo";
import { errorHandler } from "@/utils/utils";
import { useMutation } from "@tanstack/react-query";
import { message } from "antd";
import client from "@/api/axiosClient";
import { memo } from "react";
import { ErrorResponse } from "@/utils/globalType";
import { useTranslation } from "react-i18next";
import { useMockInfo } from "@/sockets/useMockInfo";
import useMiRHasError from "@/sockets/useMiRHasError";
import { useMiRStatus } from "@/sockets/useMirStatus";
import styled from "styled-components";

// 狀態標籤的語意色。沒亮起來的一律是 off(灰底),亮起來才上色,
// 所以掃一眼卡片就看得出哪幾個狀態成立。
type ChipTone = "off" | "info" | "success" | "warning" | "danger";

const CHIP_TONE: Record<ChipTone, { bg: string; border: string; text: string }> =
  {
    off: {
      bg: "var(--c-bg-muted)",
      border: "transparent",
      text: "var(--c-text-muted)",
    },
    info: {
      bg: "var(--c-header-accent-soft)",
      border: "var(--c-header-accent)",
      text: "var(--c-header-accent)",
    },
    success: {
      bg: "var(--c-success-soft)",
      border: "var(--c-success)",
      text: "var(--c-text)",
    },
    warning: {
      bg: "var(--c-warning-soft)",
      border: "var(--c-warning)",
      text: "var(--c-text)",
    },
    danger: {
      bg: "var(--c-danger-soft)",
      border: "var(--c-danger)",
      text: "var(--c-danger)",
    },
  };

const StatusChip = styled.span<{ $tone: ChipTone; $clickable?: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border: 1px solid ${({ $tone }) => CHIP_TONE[$tone].border};
  border-radius: 2px;
  background: ${({ $tone }) => CHIP_TONE[$tone].bg};
  color: ${({ $tone }) => CHIP_TONE[$tone].text};
  font-size: 11px;
  font-weight: ${({ $tone }) => ($tone === "off" ? 400 : 600)};
  line-height: 1.5;
  white-space: nowrap;
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "inherit")};
`;

export const ManualTag: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { isManual } = useIsManual(amrId);
  const MiR_Status_IO = useMiRStatus(amrId);

  const { t } = useTranslation();
  const mockRobot = useMockInfo();
  const [messageApi, contextHolders] = message.useMessage();
  const changeManualMode = useMutation({
    mutationFn: (payload: { manual_mode: boolean; amrId: string }) => {
      return client.post("api/amr/set-simulate-isManual", payload);
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const isOn = amrId.includes("mi")
    ? MiR_Status_IO.status == "EmergencyStop" && !MiR_Status_IO.protectiveStop
    : Boolean(isManual);

  return (
    <>
      {contextHolders}
      <StatusChip
        $tone={isOn ? "info" : "off"}
        $clickable={Boolean(mockRobot?.isSimulate)}
        onClick={(e) => {
          e.stopPropagation();
          if (!mockRobot?.isSimulate) return;
          changeManualMode.mutate({ manual_mode: isManual as boolean, amrId });
        }}
      >
        {`${t("mode.manual_mode")}`}
      </StatusChip>
    </>
  );
});

export const MissionTag: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { isWorking } = useIsWorking(amrId);
  const { t } = useTranslation();
  return (
    <StatusChip $tone={isWorking ? "success" : "off"}>
      {`${t("mode.is_mission")}`}
    </StatusChip>
  );
});

export const CarryTag: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { isCarry } = useIsCarry(amrId);
  const { t } = useTranslation();
  return (
    <StatusChip $tone={isCarry ? "info" : "off"}>
      {`${t("mode.is_carry")}`}
    </StatusChip>
  );
});

export const ChargingTag: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { isCharge } = useIsCharging(amrId);
  const { t } = useTranslation();
  return (
    <StatusChip $tone={isCharge ? "success" : "off"}>
      {`${t("mode.is_charge")}`}
    </StatusChip>
  );
});

export const PowerTag: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { battery } = useBattery(amrId);
  const { t } = useTranslation();
  return (
    <StatusChip $tone={(battery as number) < 25 ? "danger" : "off"}>
      {`${t("mode.low_power")}`}
    </StatusChip>
  );
});

export const IsPosAccurate: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { isPosAccurate } = usePosIsAccurate(amrId);
  const { t } = useTranslation();

  return (
    <StatusChip $tone={isPosAccurate ? "success" : "danger"}>
      {isPosAccurate
        ? `${t("mode.positioning_normal")}`
        : `${t("mode.positioning_inaccurate")}`}
    </StatusChip>
  );
});



export const IsPause: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { isPause } = useIsPause(amrId);
  const MiR_Status_IO= useMiRStatus(amrId);

  const { t } = useTranslation();
  const paused = amrId.includes("mi")
    ? MiR_Status_IO.status == "Pause" && !MiR_Status_IO.protectiveStop
    : Boolean(isPause);
  return (
    <StatusChip $tone={paused ? "warning" : "off"}>
      {t("mode.isPause")}
    </StatusChip>
  );
});

export const MiR_Error: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const MiR_Status_IO = useMiRStatus(amrId);
  const { t } = useTranslation();

  return (
    <StatusChip
      $tone={
        MiR_Status_IO.status == "Error" && !MiR_Status_IO.protectiveStop
          ? "danger"
          : "off"
      }
    >
      {t("mode.error")}
    </StatusChip>
  );
});
