import { FC } from "react";
import { useTranslation } from "react-i18next";
import { useBECS } from "@/api/useBeforeleftChargeStation";
import useChargeMissionOptions from "../../ui/useChargeMissionOptions";
import StationMissionPanel, { StationMissionRow } from "./StationMissionPanel";

/** 進入充電站強制任務: 車要去充電時派的任務, 可以每座充電站、每台車不一樣 */
const BeforeEnterChargeStationPanel: FC = () => {
  const { t } = useTranslation();
  const { data, isLoading, isFetching, refetch } = useBECS();
  const missionOptions = useChargeMissionOptions();

  return (
    <StationMissionPanel
      title={t(
        "mission.before_enter_charge_station_mission.before_enter_charge_station_mission",
      )}
      hint={t("mission.before_enter_charge_station_mission.hint")}
      rows={(data ?? []) as StationMissionRow[]}
      isLoading={isLoading}
      isFetching={isFetching}
      refetch={refetch}
      missionOptions={missionOptions}
      api={{
        add: "api/setting/add-BECS",
        active: "api/setting/active-BECS",
        remove: "api/setting/delete-BECS",
      }}
    />
  );
};

export default BeforeEnterChargeStationPanel;
