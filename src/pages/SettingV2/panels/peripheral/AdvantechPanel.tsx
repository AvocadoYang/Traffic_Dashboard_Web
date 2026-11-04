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
import client from "@/api/axiosClient";
import {
  AdvantechRow,
  useAdvantech,
  useAdvantechGroups,
} from "@/api/useAdvantech";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
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
} from "./AdvantechIo";
import AdvantechGroupSection from "./AdvantechGroupSection";

type DeviceForm = { name: string; ip: string };

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
