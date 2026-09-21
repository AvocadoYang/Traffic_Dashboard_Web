import { FC } from "react";
import { Popconfirm, Tooltip } from "antd";
import {
  CodeOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  ImportOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { IconBar, IconButton } from "./stepPrimitives";

type Props = {
  disabled: boolean;
  /** 窄螢幕的卡片上要帶文字,表格裡只放圖示靠 tooltip 說明 */
  withText: boolean;
  busy: boolean;
  onEdit: () => void;
  onToggleDisable: () => void;
  onDelete: () => void;
  /** 沒給就不顯示該顆按鈕(例如巢狀子步驟不能當引入的插入點) */
  onImport?: () => void;
  onJson?: () => void;
};

/** 每一個步驟後面那排操作。三種車型共用,只有要不要顯示引入 / 詳情不同。 */
const StepActionBar: FC<Props> = ({
  disabled,
  withText,
  busy,
  onEdit,
  onToggleDisable,
  onDelete,
  onImport,
  onJson,
}) => {
  const { t } = useTranslation();
  const tip = (label: string) => (withText ? undefined : label);

  return (
    <IconBar>
      <Tooltip title={tip(t("utils.edit"))}>
        <IconButton type="button" onClick={onEdit}>
          <EditOutlined />
          {withText && t("utils.edit")}
        </IconButton>
      </Tooltip>

      <Tooltip
        title={
          disabled
            ? t("mission.task_table.in_use")
            : t("mission.task_table.stop_this_process")
        }
      >
        <IconButton type="button" disabled={busy} onClick={onToggleDisable}>
          {disabled ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          {withText &&
            (disabled
              ? t("mission.task_table.active")
              : t("mission.task_table.inactive"))}
        </IconButton>
      </Tooltip>

      {onImport ? (
        <Tooltip title={tip(t("mission.task_table.import_mission"))}>
          <IconButton type="button" onClick={onImport}>
            <ImportOutlined />
            {withText && t("mission.task_table.import_mission")}
          </IconButton>
        </Tooltip>
      ) : null}

      {onJson ? (
        <Tooltip title={tip(t("utils.detail"))}>
          <IconButton type="button" onClick={onJson}>
            <CodeOutlined />
            {withText && t("utils.detail")}
          </IconButton>
        </Tooltip>
      ) : null}

      <Popconfirm
        title={t("utils.delete_warn")}
        okText={t("utils.confirm")}
        cancelText={t("utils.cancel")}
        onConfirm={onDelete}
      >
        <IconButton type="button" $danger disabled={busy}>
          <DeleteOutlined />
          {withText && t("utils.delete")}
        </IconButton>
      </Popconfirm>
    </IconBar>
  );
};

export default StepActionBar;
