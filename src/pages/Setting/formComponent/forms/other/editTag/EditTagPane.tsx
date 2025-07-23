import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Flex } from "antd";
import FormHr from "@/pages/Setting/utils/FormHr";
import TagTable from "./TagTable";

const EditTagPanel: FC<{
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
        {t("other.edit_mission_tag.title")}
      </h3>
      <FormHr />
      <Flex gap="middle" justify="flex-start" align="start" vertical>
        <TagTable />
      </Flex>
    </div>
  );
};

export default EditTagPanel;
