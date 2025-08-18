import { FC } from "react";
import { Flex } from "antd";
import { useTranslation } from "react-i18next";
import IdleMissionForm from "./IdleMissionForm";
import IdleMissionTable from "./IdleMissionTable";
import FormHr from "@/pages/Setting/utils/FormHr";

const IdleMissionPanel: FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const { t } = useTranslation();

  return (
    <div>
      <h3 className="drop_button_style" {...listeners} {...attributes}>
        {t("mission.idle_mission.idle_mission")}
      </h3>
      <FormHr />

      <Flex gap="middle" justify="flex-start" align="start" vertical>
        <IdleMissionForm />
        <IdleMissionTable />
      </Flex>
    </div>
  );
};

export default IdleMissionPanel;
