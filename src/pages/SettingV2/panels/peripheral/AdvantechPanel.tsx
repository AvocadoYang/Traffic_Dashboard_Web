import { FC, useState } from "react";
import { Form, Input, Modal, Popconfirm, Skeleton, message } from "antd";
import {
  ApiOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import client from "@/api/axiosClient";
import { AdvantechRow, useAdvantech } from "@/api/useAdvantech";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { c, font, space } from "../../ui/tokens";
import {
  PanelShell,
  Section,
  SectionTitle,
  Field,
  FieldLabel,
  Toolbar,
  SolidButton,
  GhostButton,
  DangerButton,
  Hint,
  EmptyState,
} from "../../ui/primitives";

type DeviceForm = { name: string; ip: string };

/** ADAM-4000 的 IO 圖示固定畫 4 個輸出、4 個輸入 */
const IO_COUNT = 4;

const IPV4 =
  /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

const DeviceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: ${space.md};
`;

const DeviceCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${space.sm};
  padding: ${space.lg};
  background: ${c.bg};
  border: 1px solid ${c.border};
  border-radius: 8px;
`;

const DeviceName = styled.div`
  font-size: ${font.lg};
  font-weight: 700;
  color: ${c.text};
  text-align: center;
  word-break: break-all;
`;

const DeviceIp = styled.div`
  font-family: ${font.mono};
  font-size: ${font.sm};
  color: ${c.textSecondary};
`;

const IoGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.xs};
`;

const IoLabel = styled.span`
  font-size: ${font.md};
  color: ${c.textSecondary};
`;

const IoRow = styled.div`
  display: flex;
  gap: ${space.xs};
`;

const IoCell = styled.span<{ $muted?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 38px;
  border-radius: 4px;
  background: ${c.bgSubtle};
  font-family: ${font.mono};
  font-size: ${font.md};
  font-weight: ${({ $muted }) => ($muted ? 400 : 700)};
  color: ${({ $muted }) => ($muted ? c.textMuted : c.text)};
`;

/** 輸出可以點: 按一下變藍 (開), 再按一下取消 */
const OutputCell = styled.button<{ $on: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 38px;
  padding: 0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: ${({ $on }) => ($on ? c.accent : c.bgSubtle)};
  font-family: ${font.mono};
  font-size: ${font.md};
  font-weight: 700;
  color: ${({ $on }) => ($on ? c.onAccent : c.text)};
  transition:
    background 0.15s,
    color 0.15s;

  &:hover {
    background: ${({ $on }) => ($on ? c.accentHover : c.bgMuted)};
  }

  &:focus-visible {
    outline: 2px solid ${c.accent};
    outline-offset: 2px;
  }
`;

const IoIcon: FC<{ outputsLabel: string; inputsLabel: string }> = ({
  outputsLabel,
  inputsLabel,
}) => {
  const [outputs, setOutputs] = useState<boolean[]>(() =>
    Array.from({ length: IO_COUNT }, () => false),
  );
  const toggle = (i: number) =>
    setOutputs((prev) => prev.map((on, j) => (j === i ? !on : on)));

  return (
    <>
      <IoGroup>
        <IoLabel>{outputsLabel}</IoLabel>
        <IoRow>
          {outputs.map((on, i) => (
            <OutputCell
              key={i}
              type="button"
              $on={on}
              aria-pressed={on}
              onClick={() => toggle(i)}
            >
              {i}
            </OutputCell>
          ))}
        </IoRow>
      </IoGroup>
      <IoGroup>
        <IoLabel>{inputsLabel}</IoLabel>
        <IoRow>
          {Array.from({ length: IO_COUNT }, (_, i) => (
            <IoCell key={i} $muted>
              {i}
            </IoCell>
          ))}
        </IoRow>
      </IoGroup>
    </>
  );
};

/**
 * 研華 ADAM-4000 序列 IO 模組 (設定頁 設備 > Advantech 4000 serial, 只有 HAS_MIR 時才有):
 * 新增、編輯、刪除模組的名稱和 IP, 每台畫一張 IO 圖示卡。
 */
const AdvantechPanel: FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<DeviceForm>();
  const [editing, setEditing] = useState<AdvantechRow | null>(null);
  const [open, setOpen] = useState(false);

  const { data: devices, isLoading, isFetching, refetch } = useAdvantech();

  const onDone = () => {
    void messageApi.success(t("utils.success"));
    void refetch();
  };
  const onError = (e: ErrorResponse) => errorHandler(e, messageApi);

  const saveMutation = useMutation({
    mutationFn: (payload: DeviceForm & { id?: string }) =>
      payload.id
        ? client.post("api/setting/edit-advantech", payload)
        : client.post("api/setting/add-advantech", payload),
    onSuccess: () => {
      onDone();
      setOpen(false);
    },
    onError,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      client.post("api/setting/delete-advantech", { id }),
    onSuccess: onDone,
    onError,
  });

  const openEdit = (device: AdvantechRow | null) => {
    setEditing(device);
    form.setFieldsValue(
      device ? { name: device.name, ip: device.ip } : { name: "", ip: "" },
    );
    setOpen(true);
  };

  const submit = async () => {
    let values: DeviceForm;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    saveMutation.mutate({
      name: values.name.trim(),
      ip: values.ip.trim(),
      id: editing?.id,
    });
  };

  if (isLoading || !devices) return <Skeleton active />;

  return (
    <PanelShell>
      {contextHolder}
      <Section>
        <SectionTitle>
          <ApiOutlined />
          ADVANTECH 4000 SERIAL
        </SectionTitle>
        <Hint>{t("advantech.hint")}</Hint>
        <Toolbar>
          <SolidButton onClick={() => openEdit(null)}>
            <PlusOutlined />
            {t("utils.add")}
          </SolidButton>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
        </Toolbar>

        {devices.length === 0 ? (
          <EmptyState>{t("advantech.empty")}</EmptyState>
        ) : (
          <DeviceGrid>
            {devices.map((device) => (
              <DeviceCard key={device.id}>
                <DeviceName>{device.name}</DeviceName>
                <DeviceIp>{device.ip}</DeviceIp>
                <IoIcon
                  outputsLabel={t("advantech.outputs")}
                  inputsLabel={t("advantech.inputs")}
                />
                <Toolbar>
                  <GhostButton onClick={() => openEdit(device)}>
                    <EditOutlined />
                    {t("utils.edit")}
                  </GhostButton>
                  <Popconfirm
                    title={t("utils.delete_warn")}
                    okText={t("utils.confirm")}
                    cancelText={t("utils.cancel")}
                    onConfirm={() => deleteMutation.mutate(device.id)}
                  >
                    <DangerButton>
                      <DeleteOutlined />
                      {t("utils.delete")}
                    </DangerButton>
                  </Popconfirm>
                </Toolbar>
              </DeviceCard>
            ))}
          </DeviceGrid>
        )}
      </Section>

      <Modal
        open={open}
        title={editing ? t("advantech.edit") : t("advantech.add")}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={saveMutation.isLoading}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        forceRender
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Field>
            <FieldLabel>{t("advantech.name")}</FieldLabel>
            <Form.Item
              name="name"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: t("utils.required"),
                },
              ]}
            >
              <Input maxLength={100} />
            </Form.Item>
          </Field>
          <Field>
            <FieldLabel>{t("advantech.ip")}</FieldLabel>
            <Form.Item
              name="ip"
              rules={[
                { required: true, message: t("utils.required") },
                { pattern: IPV4, message: t("advantech.ip_invalid") },
              ]}
            >
              <Input placeholder="192.168.1.100" maxLength={64} />
            </Form.Item>
          </Field>
        </Form>
      </Modal>
    </PanelShell>
  );
};

export default AdvantechPanel;
