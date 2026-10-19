import { FC, ReactNode, useEffect, useState } from "react";
import { Button, Input, Modal, Space } from "antd";
import { useTranslation } from "react-i18next";

const LabeledInput: FC<{ label: ReactNode; children: ReactNode }> = ({ label, children }) => (
  <label style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", gap: 8, alignItems: "center" }}>
    <span>{label}</span>
    {children}
  </label>
);

/** 存檔時別人先存過 (409): 重新載入放棄修改, 或是另存成新專案 */
export const ConflictModal: FC<{
  open: boolean;
  projectName: string;
  busy: boolean;
  onReload: () => void;
  onSaveAs: (name: string) => void;
  onCancel: () => void;
}> = ({ open, projectName, busy, onReload, onSaveAs, onCancel }) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  useEffect(() => {
    if (open) setName(String(t("sim_v2.conflict.copy_name", { name: projectName })));
  }, [open, projectName, t]);
  return (
    <Modal
      open={open}
      title={t("sim_v2.conflict.title")}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {t("sim_v2.common.cancel")}
        </Button>,
        <Button key="reload" danger onClick={onReload}>
          {t("sim_v2.conflict.reload")}
        </Button>,
        <Button key="saveas" type="primary" loading={busy} disabled={!name.trim()} onClick={() => onSaveAs(name.trim())}>
          {t("sim_v2.conflict.save_as")}
        </Button>,
      ]}
    >
      <Space orientation="vertical" style={{ width: "100%" }}>
        <span>{t("sim_v2.conflict.body")}</span>
        <LabeledInput label={t("sim_v2.conflict.new_name")}>
          <Input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
        </LabeledInput>
      </Space>
    </Modal>
  );
};

/** 換專案前還有沒存的修改 */
export const LeaveModal: FC<{
  open: boolean;
  busy: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}> = ({ open, busy, onSave, onDiscard, onCancel }) => {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      title={t("sim_v2.leave.title")}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {t("sim_v2.common.cancel")}
        </Button>,
        <Button key="discard" danger onClick={onDiscard}>
          {t("sim_v2.leave.discard")}
        </Button>,
        <Button key="save" type="primary" loading={busy} onClick={onSave}>
          {t("sim_v2.leave.save")}
        </Button>,
      ]}
    >
      {t("sim_v2.leave.body")}
    </Modal>
  );
};

/** 專案名稱和說明; 也拿來輸入「複製一份」的名稱 */
export const NameModal: FC<{
  open: boolean;
  title: string;
  initialName: string;
  initialDescription?: string;
  withDescription?: boolean;
  busy?: boolean;
  onOk: (name: string, description: string) => void;
  onCancel: () => void;
}> = ({ open, title, initialName, initialDescription = "", withDescription, busy, onOk, onCancel }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setDescription(initialDescription);
  }, [open, initialName, initialDescription]);
  const ok = () => name.trim() && onOk(name.trim(), description);
  return (
    <Modal
      open={open}
      title={title}
      onCancel={onCancel}
      onOk={ok}
      okButtonProps={{ disabled: !name.trim(), loading: busy }}
      okText={t("sim_v2.common.ok")}
      cancelText={t("sim_v2.common.cancel")}
      destroyOnHidden
    >
      <Space orientation="vertical" style={{ width: "100%" }}>
        <LabeledInput label={t("sim_v2.new.name")}>
          <Input autoFocus value={name} maxLength={100} onChange={(e) => setName(e.target.value)} onPressEnter={ok} />
        </LabeledInput>
        {withDescription && (
          <Input.TextArea value={description} maxLength={1000} rows={3} placeholder={t("sim_v2.new.description")} onChange={(e) => setDescription(e.target.value)} />
        )}
      </Space>
    </Modal>
  );
};
