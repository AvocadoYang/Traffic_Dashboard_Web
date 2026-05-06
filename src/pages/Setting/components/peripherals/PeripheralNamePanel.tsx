import { Flex } from "antd";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import FormHr from "../../utils/FormHr";
import { PeripheralNameTable } from "./names";

const PeripheralNamePanel: FC<{
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
        {t("toolbar.peripheral.name_table")}
      </h3>
      <FormHr />
      <Flex gap="middle" justify="flex-start" align="start" vertical>
        <PeripheralNameTable></PeripheralNameTable>
      </Flex>
    </div>
  );
};

export default PeripheralNamePanel;
