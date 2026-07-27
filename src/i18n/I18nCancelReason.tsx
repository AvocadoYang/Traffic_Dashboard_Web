import { CancelReason } from "@/types/mission";
import React, { FC } from "react";
import { useTranslation } from "react-i18next";

const reasonKeyMap: { [key in CancelReason]: string } = {
  [CancelReason.NULL]: "null",
  [CancelReason.OFFLINE]: "offline",
  [CancelReason.CANCEL]: "cancel",
  [CancelReason.FORCE_CANCEL_BY_USER]: "force_cancel_by_user",

  [CancelReason.CHARGE_STATION_OFFLINE]: "charge_station_offline",
  [CancelReason.IPC_CHARGE_PANEL_OFF]: "ipc_charge_panel_off",
  [CancelReason.REJECT_BY_CHARGE_STATION]: "reject_by_charge_station",
  [CancelReason.NOT_COMPRESS]: "not_compress",
  [CancelReason.HAS_NEXT_MISSION]: "has_next_mission",
  [CancelReason.NOT_AT_CHARGE_STATION]: "not_at_charge_station",
  [CancelReason.CHARGE_STATION_TCP_ERROR]: "charge_station_tcp_error",
  [CancelReason.CHARGE_STATION_MQTT_ERROR]: "charge_station_mqtt_error",
  [CancelReason.CHARGE_STATION_HEARTBEAT_ERROR]:
    "charge_station_heartbeat_error",
  [CancelReason.CHARGE_STATION_AGV_NOT_DOCK_PRECISE]:
    "charge_station_agv_not_dock_precise",

  [CancelReason.USER_ABORT]: "user_abort",
  [CancelReason.WCS_ABORT]: "wcs_abort",

  [CancelReason.MOCK_DISCONNECTED]: "mock_disconnected",
  [CancelReason.AMR_DISCONNECTED]: "amr_disconnected",
  [CancelReason.ROSBRIDGE_DISCONNECTED]: "rosbridge_disconnected",

  [CancelReason.AMR_CHARGE_HAS_PROBLEM]: "amr_charge_has_problem",
};

const I18nCancelReason: FC<{ reason: CancelReason }> = ({ reason }) => {
  const { t } = useTranslation();
  const key = reasonKeyMap[reason];

  if (!key) {
    return <>{t("cancel_reason.unknown", "未知原因")}</>;
  }

  return <>{t(`cancel_reason.${key}`)}</>;
};

export default I18nCancelReason;