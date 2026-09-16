import { useMemo } from "react";
import { useAmrDestination, useAmrStatus } from "@/sockets/useAMRInfo";
import { useActiveMission } from "@/sockets/useMissions";

/** rosStatus 是這些值時視為閒置, 不顯示 tip */
const IDLE_STATUS = ["standby"];

const pickLoc = (value?: string) => {
  const trimmed = value?.trim() ?? "";
  return trimmed && trimmed !== "0" ? trimmed : "";
};

/**
 * - 動作: 若無被派發的任務 sub_name -> 退回 amr-profile 的 rosStatus
 * - 目的地: 若無amr-profile 的 destination -> 退回 finalLocationId, 若無 -> 再退回當前段的 locationId。
 */
const useAmrMissionTip = (amrId: string) => {
  const { activeMission } = useActiveMission(amrId);
  const { status } = useAmrStatus(amrId);
  const { destination } = useAmrDestination(amrId);

  return useMemo(() => {
    const rosStatus = status?.trim() ?? "";
    const isIdle = !rosStatus || IDLE_STATUS.includes(rosStatus.toLowerCase());

    const actionText = activeMission?.sub_name
      ? activeMission.sub_name
      : isIdle
        ? ""
        : rosStatus;

    const destinationText =
      pickLoc(destination?.name) ||
      pickLoc(destination?.finalLocationId) ||
      pickLoc(destination?.locationId);

    return { tipText: actionText, destinationText };
  }, [activeMission, status, destination]);
};

export default useAmrMissionTip;
