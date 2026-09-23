import { FC } from "react";
import { StopOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useAbortMissionWhenHasCargo } from "@/api/useAbortMissionWhenHasCargo";
import AmrMissionBindingPanel, { BindingRow } from "./AmrMissionBindingPanel";

const AbortCargoMissionPanel: FC = () => {
  const { t } = useTranslation();
  const { data, isLoading, isFetching, refetch } = useAbortMissionWhenHasCargo();

  return (
    <AmrMissionBindingPanel
      title={t("mission.abort_mission_when_has_cargo_mission.title")}
      icon={<StopOutlined />}
      rows={data as BindingRow[] | undefined}
      isLoading={isLoading}
      isFetching={isFetching}
      refetch={() => void refetch()}
      endpoints={{
        add: "api/setting/add-abort-when-has-cargo",
        active: "api/setting/active-abort-when-has-cargo",
        remove: "api/setting/delete-abort-when-has-cargo",
      }}
      i18nPrefix="mission.abort_mission_when_has_cargo_mission"
    />
  );
};

export default AbortCargoMissionPanel;
