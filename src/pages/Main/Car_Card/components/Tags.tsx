import {
  useBattery,
  useIsCarry,
  useIsCharging,
  useIsManual,
  useIsWorking,
} from "@/sockets/useAMRInfo";
import { errorHandler } from "@/utils/utils";
import { useMutation } from "@tanstack/react-query";
import { Tag, message } from "antd";
import client from "@/api/axiosClient";
import { memo } from "react";
import { ErrorResponse } from "@/utils/globalType";
import { useTranslation } from "react-i18next";
import { useMockInfo } from "@/sockets/useMockInfo";

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
        color={`${!isManual ? "#e3e4e3" : "blue"}`}
        style={{ margin: 0, cursor: "pointer" }}
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
    <Tag color={`${isWorking ? "green" : "#e3e4e3"}`} style={{ margin: 0 }}>
      {`${t("mode.is_mission")}`}
    </Tag>
  );
});

export const CarryTag: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { isCarry } = useIsCarry(amrId);
  const { t } = useTranslation();
  return (
    <Tag color={`${isCarry ? "volcano" : "#e3e4e3"}`} style={{ margin: 0 }}>
      {`${t("mode.is_carry")}`}
    </Tag>
  );
});

export const ChargingTag: React.FC<{ amrId }> = memo(({ amrId }) => {
  const { isCharge } = useIsCharging(amrId);
  const { t } = useTranslation();
  return (
    <Tag color={`${isCharge ? "purple" : "#e3e4e3"}`} style={{ margin: 0 }}>
      {`${t("mode.is_charge")}`}
    </Tag>
  );
});

export const PowerTag: React.FC<{ amrId }> = memo(({ amrId }) => {
  const { battery } = useBattery(amrId);
  const { t } = useTranslation();
  return (
    <Tag
      color={`${(battery as number) < 25 ? "magenta" : "#e3e4e3"}`}
      style={{ margin: 0 }}
    >
      {`${t("mode.low_power")}`}
    </Tag>
  );
});
