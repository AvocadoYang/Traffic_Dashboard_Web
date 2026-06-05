import FormHr from "@/pages/Setting/utils/FormHr";
import { Flex } from "antd";
import React, { FC } from "react";
import { useTranslation } from "react-i18next";
import BlindTable from "./BlindTable";

const BlindLocationPanel: FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const { t } = useTranslation();

  return (
    <>
      <div>
        <h3 className="drop_button_style" {...listeners} {...attributes}>
          {t("mission.blind_mission.title")}
        </h3>
        <FormHr />

        <BlindTable />
        <Flex gap="middle" justify="flex-start" align="start" vertical></Flex>
      </div>
    </>
  );
};

export default BlindLocationPanel;
