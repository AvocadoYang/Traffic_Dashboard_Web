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
import { Tag, message } from "antd";
import client from "@/api/axiosClient";
import { memo } from "react";
import { ErrorResponse } from "@/utils/globalType";
import { useTranslation } from "react-i18next";
import { useMockInfo } from "@/sockets/useMockInfo";
import type { CSSProperties } from "react";

const baseTagStyle: CSSProperties = {
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  lineHeight: "22px",
  padding: "2px 10px",
  borderRadius: 4,
};

const activeTagStyle: CSSProperties = {
  ...baseTagStyle,
  color: "#000000",
  background: "#ffffff",
  border: "2px solid #000000",
};

const inactiveTagStyle: CSSProperties = {
  ...baseTagStyle,
  color: "#888888",
  background: "#f5f5f5",
  border: "2px solid #d9d9d9",
};

export const ManualTag: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { isManual } = useIsManual(amrId);
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
  return (
    <>
      {contextHolders}
      <Tag
        style={{
          ...(isManual ? activeTagStyle : inactiveTagStyle),
          cursor: "pointer",
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (!mockRobot?.isSimulate) return;
          changeManualMode.mutate({ manual_mode: isManual as boolean, amrId });
        }}
      >
        {`${t("mode.manual_mode")}`}
      </Tag>
    </>
  );
});

export const MissionTag: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { isWorking } = useIsWorking(amrId);
  const { t } = useTranslation();
  return (
    <Tag style={isWorking ? activeTagStyle : inactiveTagStyle}>
      {`${t("mode.is_mission")}`}
    </Tag>
  );
});

export const CarryTag: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { isCarry } = useIsCarry(amrId);
  const { t } = useTranslation();
  return (
    <Tag style={isCarry ? activeTagStyle : inactiveTagStyle}>
      {`${t("mode.is_carry")}`}
    </Tag>
  );
});

export const ChargingTag: React.FC<{ amrId }> = memo(({ amrId }) => {
  const { isCharge } = useIsCharging(amrId);
  const { t } = useTranslation();
  return (
    <Tag style={isCharge ? activeTagStyle : inactiveTagStyle}>
      {`${t("mode.is_charge")}`}
    </Tag>
  );
});

export const PowerTag: React.FC<{ amrId }> = memo(({ amrId }) => {
  const { battery } = useBattery(amrId);
  const { t } = useTranslation();
  return (
    <Tag style={(battery as number) < 25 ? activeTagStyle : inactiveTagStyle}>
      {`${t("mode.low_power")}`}
    </Tag>
  );
});

export const IsPosAccurate: React.FC<{ amrId }> = memo(({ amrId }) => {
  const { isPosAccurate } = usePosIsAccurate(amrId);
  const { t } = useTranslation();

  return (
    <Tag style={isPosAccurate ? inactiveTagStyle : activeTagStyle}>
      {isPosAccurate
        ? `${t("mode.positioning_normal")}`
        : `${t("mode.positioning_inaccurate")}`}
    </Tag>
  );
});

export const IsPause: React.FC<{ amrId }> = memo(({ amrId }) => {
  const { isPause } = useIsPause(amrId);
  const { t } = useTranslation();

  return (
    <Tag style={isPause ? activeTagStyle : inactiveTagStyle}>
      {t("mode.isPause")}
    </Tag>
  );
});
