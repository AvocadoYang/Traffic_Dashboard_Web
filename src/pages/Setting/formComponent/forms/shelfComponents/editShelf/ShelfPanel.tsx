import { Alert, Button, Flex, Modal } from "antd";
import { FormatPainterOutlined, DragOutlined } from "@ant-design/icons";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import ShelfTable from "./ShelfTable";
import ShelfDrawer from "./ShelfDrawer";
import SettingMultiCargoStyleForm from "./SettingMultiCargoStyleForm";
import SettingBatchCargoStyleForm from "./SettingBatchCargoStyleForm";
import useShelf from "@/api/useShelf";
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
  const [openStyle, setOpenStyle] = useState(false);
  const [batchEditing, setBatchEditing] = useState(false);
  const { data: shelves } = useShelf();

  // 表格勾選的是貨架 id，樣式是存在 Loc 上，這裡轉成 Loc.id 與 locationId
  const selectedLocs = useMemo(
    () =>
      (shelves ?? [])
        .filter((s) => selectedRowKeys.includes(s.id))
        .map((s) => ({
          id: s.peripheral_station.source.id,
          locationId: s.peripheral_station.source.locationId,
        })),
    [shelves, selectedRowKeys],
  );

  const { t } = useTranslation();

  return (
    <>
      <h3 className="drop_button_style" {...listeners} {...attributes}>
        {t("edit_shelf_panel.edit_shelf")}
      </h3>

      <FormHr></FormHr>

      {batchEditing ? (
        <SettingBatchCargoStyleForm
          locIds={selectedLocs.map((l) => l.id)}
          locationIds={selectedLocs.map((l) => l.locationId)}
          onDone={() => setBatchEditing(false)}
        />
      ) : (
        <>
          <Flex align="start" gap="middle">
            <Button
              color="primary"
              variant="filled"
              onClick={() => setOpenDrawer(true)}
              disabled={selectedRowKeys.length === 0}
            >
              {t("utils.edit")}
            </Button>
            <Button
              color="primary"
              variant="filled"
              icon={<FormatPainterOutlined />}
              onClick={() => setOpenStyle(true)}
              disabled={selectedLocs.length === 0}
            >
              {t("multiStyle.title")}
            </Button>
            <Button
              color="primary"
              variant="filled"
              icon={<DragOutlined />}
              onClick={() => setBatchEditing(true)}
              disabled={selectedLocs.length === 0}
            >
              {t("batchStyle.title")}
            </Button>

            <Alert title={t("edit_shelf_panel.warn")} type="error" />
          </Flex>
          <ShelfTable
            selectedRowKeys={selectedRowKeys}
            setSelectedRowKeys={setSelectedRowKeys}
          />
        </>
      )}
      <Modal
        title={t("multiStyle.title")}
        open={openStyle}
        onCancel={() => setOpenStyle(false)}
        footer={null}
        destroyOnHidden
        width={560}
      >
        <SettingMultiCargoStyleForm
          locIds={selectedLocs.map((l) => l.id)}
          locationIds={selectedLocs.map((l) => l.locationId)}
          onDone={() => setOpenStyle(false)}
        />
      </Modal>
      <ShelfDrawer
        openDrawer={openDrawer}
        setOpenDrawer={setOpenDrawer}
        selectedRowKeys={selectedRowKeys}
      />
    </>
  );
};

export default ShelfPanel;
