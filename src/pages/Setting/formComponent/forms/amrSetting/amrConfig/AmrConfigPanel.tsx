import FormHr from "@/pages/Setting/utils/FormHr";
import { Flex } from "antd";
import { FC } from "react";
import { useTranslation } from "react-i18next";

const AmrConfigPanel: FC<{
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
          {t("mission.cycle_mission.cycle_mission")}
        </h3>
        <FormHr />

        <Flex gap="middle" justify="flex-start" align="start" vertical>
          <>暫時可能先不做此功能 以後在搞</>
        </Flex>
      </div>
    </>
  );
};

export default AmrConfigPanel;
