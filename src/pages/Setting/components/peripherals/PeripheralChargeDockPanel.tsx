import React, { FC } from "react";
import { useTranslation } from "react-i18next";
import FormHr from "../../utils/FormHr";
import { Flex } from "antd";
import { PeripheralGroupTable } from "./group";
import ChargeDock from "./charge/chargeDock";

const PeripheralChargeDockPanel: FC<{
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
        {t("toolbar.others.charge_dock_config")}
      </h3>
      <FormHr />
      <Flex gap="middle" justify="flex-start" align="start" vertical>
        <ChargeDock />
      </Flex>
    </div>
  );
};

export default PeripheralChargeDockPanel;
