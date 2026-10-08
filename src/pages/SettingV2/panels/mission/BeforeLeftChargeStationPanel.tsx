import { FC } from "react";
import { useTranslation } from "react-i18next";
import useBLCS from "@/api/useBeforeleftChargeStation";
import useNormalMissionOptions from "../../ui/useNormalMissionOptions";
import StationMissionPanel, { StationMissionRow } from "./StationMissionPanel";

/** 離開充電站強制任務: 車從充電站出站時, 先跑這個任務再做原本的任務 */
const BeforeLeftChargeStationPanel: FC = () => {
  const { t } = useTranslation();
  const { data, isLoading, isFetching, refetch } = useBLCS();
  const missionOptions = useNormalMissionOptions();

  return (
    <StationMissionPanel
      title={t(
        "mission.before_left_charge_station_mission.before_left_charge_station_mission",
      )}
      hint={t("mission.before_left_charge_station_mission.hint")}
      rows={(data ?? []) as StationMissionRow[]}
      isLoading={isLoading}
      isFetching={isFetching}
      refetch={refetch}
      missionOptions={missionOptions}
      api={{
        add: "api/setting/add-BLCS",
        active: "api/setting/active-BLCS",
        remove: "api/setting/delete-BLCS",
      }}
    />
  );
};

export default BeforeLeftChargeStationPanel;
