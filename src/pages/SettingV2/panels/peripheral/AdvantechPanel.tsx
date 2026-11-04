import { FC, Fragment, useState } from "react";
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
import {
  AdvantechRow,
  IoLabels,
  useAdvantech,
  useAdvantechIoSocket,
  useAdvantechGroups,
} from "@/api/useAdvantech";
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
  Tag,
} from "../../ui/primitives";
import AdvantechIo, {
  DeviceCard,
  DeviceGrid,
  DeviceName,
  DeviceSub,
  IO_COUNT,
  OfflineBadge,
} from "./AdvantechIo";
import AdvantechGroupSection from "./AdvantechGroupSection";

type DeviceForm = { name: string; ip: string; ioLabels: IoLabels };

const emptyLabels = (): IoLabels => ({
  di: Array.from({ length: IO_COUNT }, () => ({ code: "", name: "" })),
  do: Array.from({ length: IO_COUNT }, () => ({ code: "", name: "" })),
});

/** IO 名稱表: 一列一個 IO, 代號 (例如 FALL) + 名稱 (例如 電梯故障) */
const LabelTable = styled.div`
  display: grid;
  grid-template-columns: 48px 120px 1fr;
  gap: ${space.xs} ${space.sm};
  align-items: center;
  margin-bottom: ${space.md};

  .ant-form-item {
    margin: 0;
  }
`;

const LabelHead = styled.span`
  font-size: ${font.xs};
  color: ${c.textMuted};
  text-transform: uppercase;
`;

const LabelChannel = styled.span`
  font-family: ${font.mono};
  font-size: ${font.sm};
  color: ${c.textSecondary};
`;

const IPV4 =
  /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

/**
 * 研華 ADAM-4000 序列 IO 模組 (設定頁 設備 > Advantech 4000 serial, 只有 HAS_MIR 時才有):
 * 新增、編輯、刪除模組的名稱和 IP, 每台畫一張 IO 圖示卡。
 * 上面是模組群組 (好幾台合成一個設備), 下面是全部的模組。
 */
const AdvantechPanel: FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<DeviceForm>();
  const [editing, setEditing] = useState<AdvantechRow | null>(null);
  const [open, setOpen] = useState(false);

  const { data: devices, isLoading, isFetching, refetch } = useAdvantech();
  // IO / 連線狀態的 socket 整個面板聽一次就好, 底下的 IO 圖示和按鈕都讀同一份
  useAdvantechIoSocket();
  const {
    data: groups,
    isLoading: groupsLoading,
    isFetching: groupsFetching,
    refetch: refetchGroups,
  } = useAdvantechGroups();

  // 模組改名、刪除會影響群組卡, 群組改了會影響模組的 groupId, 一律兩邊一起重抓
  const refetchAll = () => {
    void refetch();
    void refetchGroups();
  };
  const onDone = () => {
    void messageApi.success(t("utils.success"));
    refetchAll();
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
    const base = emptyLabels();
    form.setFieldsValue(
      device
        ? {
            name: device.name,
            ip: device.ip,
            // 舊資料可能不滿 4 格, 補齊
            ioLabels: {
              di: base.di.map((b, i) => device.ioLabels?.di[i] ?? b),
              do: base.do.map((b, i) => device.ioLabels?.do[i] ?? b),
            },
          }
        : { name: "", ip: "", ioLabels: base },
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
      ioLabels: values.ioLabels,
      id: editing?.id,
    });
  };

  if (isLoading || groupsLoading || !devices || !groups) {
    return <Skeleton active />;
  }
  const groupNameById = new Map(groups.map((g) => [g.id, g.name]));

  return (
    <PanelShell>
      {contextHolder}
      <AdvantechGroupSection
        devices={devices}
        groups={groups}
        onChanged={refetchAll}
      />

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
          <GhostButton
            onClick={refetchAll}
            disabled={isFetching || groupsFetching}
          >
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
                <DeviceSub>{device.ip}</DeviceSub>
                <Tag>
                  {device.groupId
                    ? (groupNameById.get(device.groupId) ?? "—")
                    : t("advantech.group.standalone")}
                </Tag>
                <OfflineBadge moduleIds={[device.id]} />
                <AdvantechIo modules={[device]} />
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
        width={640}
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

          <Hint>{t("advantech.labels_hint")}</Hint>
          {(["do", "di"] as const).map((side) => (
            <div key={side}>
              <FieldLabel>
                {side === "do" ? t("advantech.outputs") : t("advantech.inputs")}
              </FieldLabel>
              <LabelTable>
                <span />
                <LabelHead>{t("advantech.label_code")}</LabelHead>
                <LabelHead>{t("advantech.label_name")}</LabelHead>
                {Array.from({ length: IO_COUNT }, (_, i) => (
                  <Fragment key={i}>
                    <LabelChannel>
                      {side === "do" ? `RL${i}` : `DI${i}`}
                    </LabelChannel>
                    <Form.Item name={["ioLabels", side, i, "code"]}>
                      <Input maxLength={32} placeholder="FALL" />
                    </Form.Item>
                    <Form.Item name={["ioLabels", side, i, "name"]}>
                      <Input
                        maxLength={100}
                        placeholder={t("advantech.label_name_placeholder")}
                      />
                    </Form.Item>
                  </Fragment>
                ))}
              </LabelTable>
            </div>
          ))}
        </Form>
      </Modal>
    </PanelShell>
  );
};

export default AdvantechPanel;
