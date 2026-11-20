import { FC } from "react";
import { NotificationOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useTopicMission } from "@/api/useTopicMission";
import AmrMissionBindingPanel, { BindingRow } from "./AmrMissionBindingPanel";

const TopicMissionPanel: FC = () => {
  const { t } = useTranslation();
  const { data, isLoading, isFetching, refetch } = useTopicMission();

  return (
    <AmrMissionBindingPanel
      title={t("mission.topic_mission.topic_mission")}
      icon={<NotificationOutlined />}
      withTopicId
      rows={data as BindingRow[] | undefined}
      isLoading={isLoading}
      isFetching={isFetching}
      refetch={() => void refetch()}
      endpoints={{
        add: "api/setting/add-topic-task",
        active: "api/setting/active-topic-task",
        remove: "api/setting/delete-topic-task",
      }}
      i18nPrefix="mission.topic_mission"
    />
  );
};

export default TopicMissionPanel;
