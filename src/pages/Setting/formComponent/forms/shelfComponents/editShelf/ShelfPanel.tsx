import { Alert, Button, Flex } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import ShelfTable from "./ShelfTable";
import ShelfDrawer from "./ShelfDrawer";
import FormHr from "../../../../utils/FormHr";

const ShelfPanel: React.FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [openDrawer, setOpenDrawer] = useState(false);

  const { t } = useTranslation();

  return (
    <>
      <h3 className="drop_button_style" {...listeners} {...attributes}>
        {t("edit_shelf_panel.edit_shelf")}
      </h3>

      <FormHr></FormHr>

      <Flex align="start" gap="middle">
        <Button
          color="primary"
          variant="filled"
          onClick={() => setOpenDrawer(true)}
          disabled={selectedRowKeys.length === 0}
        >
          {t("utils.edit")}
        </Button>

        <Alert title={t("edit_shelf_panel.warn")} type="error" />
      </Flex>
      <ShelfTable
        selectedRowKeys={selectedRowKeys}
        setSelectedRowKeys={setSelectedRowKeys}
      />
      <ShelfDrawer
        openDrawer={openDrawer}
        setOpenDrawer={setOpenDrawer}
        selectedRowKeys={selectedRowKeys}
      />
    </>
  );
};

export default ShelfPanel;
