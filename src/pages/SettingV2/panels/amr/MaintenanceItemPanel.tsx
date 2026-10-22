import { FC, useState } from "react";
import { Form, Input, InputNumber, Modal, Popconfirm, Select, Skeleton, Switch, message } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, ToolOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { MaintenanceItem, MaintenanceTargetKind } from "@/api/useMaintenance";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import StatusTag from "../../ui/StatusTag";
import {
  PanelShell,
  Section,
  SectionTitle,
  FieldGrid,
  Field,
  FieldLabel,
  Toolbar,
  SolidButton,
  GhostButton,
  DangerButton,
  Hint,
  EmptyState,
  CardList,
  ItemCard,
  CardTitleRow,
  CardFacts,
  Tag,
} from "../../ui/primitives";

type ItemForm = Omit<MaintenanceItem, "id">;

type Options = {
  robotTypes: { id: string; name: string }[];
  robots: { fullName: string; isReal: boolean; robotTypeId: string }[];
};

const emptyForm: ItemForm = {
  name: "",
  enabled: true,
  targetKind: "ALL",
  targetIds: [],
  intervalKm: null,
  intervalHours: null,
  intervalDays: null,
  remindPercent: 90,
  note: "",
};

/**
 * 保養項目 (設定頁 車輛 > 保養項目): 名稱、哪些車、多久保養一次 (里程 / 運轉時數 / 天數,
 * 有設的哪一個先到就算到期)、用到幾 % 提醒。每台車的狀態、完成保養、維修中在「車輛資訊」頁。
 */
const MaintenanceItemPanel: FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<ItemForm>();
  const [editing, setEditing] = useState<MaintenanceItem | null>(null);
  const [open, setOpen] = useState(false);
  const targetKind = Form.useWatch("targetKind", form);

  const { data: items, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["maintenance-items"],
    queryFn: async () =>
      (await client.get<{ items: MaintenanceItem[] }>("api/maintenance/items")).data.items,
  });
  const { data: options } = useQuery({
    queryKey: ["maintenance-options"],
    queryFn: async () => (await client.get<Options>("api/maintenance/options")).data,
  });

  const onDone = () => {
    void messageApi.success(t("utils.success"));
    void refetch();
  };
  const onError = (e: ErrorResponse) => errorHandler(e, messageApi);

  const saveMutation = useMutation({
    mutationFn: (payload: ItemForm & { id?: string }) =>
      payload.id
        ? client.put(`api/maintenance/items/${payload.id}`, payload)
        : client.post("api/maintenance/items", payload),
    onSuccess: () => {
      onDone();
      setOpen(false);
    },
    onError,
  });
  const toggleMutation = useMutation({
    mutationFn: (item: MaintenanceItem) =>
      client.put(`api/maintenance/items/${item.id}`, { ...item, enabled: !item.enabled }),
    onSuccess: onDone,
    onError,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.delete(`api/maintenance/items/${id}`),
    onSuccess: onDone,
    onError,
  });

  const openEdit = (item: MaintenanceItem | null) => {
    setEditing(item);
    form.setFieldsValue(item ? { ...item } : emptyForm);
    setOpen(true);
  };

  const submit = async () => {
    let values: ItemForm;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const intervals = [values.intervalKm, values.intervalHours, values.intervalDays];
    if (!intervals.some((v) => v !== null && v !== undefined && v > 0)) {
      void messageApi.error(t("maintenance_item.need_interval"));
      return;
    }
    saveMutation.mutate({
      ...values,
      targetIds: values.targetKind === "ALL" ? [] : values.targetIds ?? [],
      intervalKm: values.intervalKm ?? null,
      intervalHours: values.intervalHours ?? null,
      intervalDays: values.intervalDays ?? null,
      note: values.note ?? "",
      id: editing?.id,
    });
  };

  const robotTypeName = (id: string) => options?.robotTypes.find((r) => r.id === id)?.name ?? id;
  const targetOptions =
    targetKind === "ROBOT_TYPE"
      ? (options?.robotTypes ?? []).map((r) => ({ value: r.id, label: r.name }))
      : (options?.robots ?? []).map((r) => ({
          value: r.fullName,
          label: r.isReal ? r.fullName : `${r.fullName} ${t("simulate")}`,
        }));

  const describeTarget = (item: MaintenanceItem) => {
    if (item.targetKind === "ALL") return t("maintenance_item.target_ALL");
    return item.targetIds.map((id) => (
      <Tag key={id}>{item.targetKind === "ROBOT_TYPE" ? robotTypeName(id) : id}</Tag>
    ));
  };

  const describeInterval = (item: MaintenanceItem) =>
    [
      item.intervalKm ? t("maintenance_item.every_km", { n: item.intervalKm }) : null,
      item.intervalHours ? t("maintenance_item.every_hours", { n: item.intervalHours }) : null,
      item.intervalDays ? t("maintenance_item.every_days", { n: item.intervalDays }) : null,
    ]
      .filter(Boolean)
      .join(t("maintenance_item.or"));

  if (isLoading || !items) return <Skeleton active />;

  return (
    <PanelShell>
      {contextHolder}
      <Section>
        <SectionTitle>
          <ToolOutlined />
          {t("maintenance_item.title")}
        </SectionTitle>
        <Hint>{t("maintenance_item.hint")}</Hint>
        <Toolbar>
          <SolidButton onClick={() => openEdit(null)}>
            <PlusOutlined />
            {t("maintenance_item.add")}
          </SolidButton>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
        </Toolbar>

        {items.length === 0 ? (
          <EmptyState>{t("maintenance_item.empty")}</EmptyState>
        ) : (
          <CardList>
            {items.map((item) => (
              <ItemCard key={item.id}>
                <CardTitleRow>
                  <span>{item.name}</span>
                  <StatusTag $on={item.enabled}>
                    {item.enabled ? t("maintenance_item.enabled") : t("maintenance_item.disabled")}
                  </StatusTag>
                </CardTitleRow>
                <CardFacts>
                  <dt>{t("maintenance_item.target")}</dt>
                  <dd>{describeTarget(item)}</dd>
                  <dt>{t("maintenance_item.interval")}</dt>
                  <dd>{describeInterval(item)}</dd>
                  <dt>{t("maintenance_item.remind")}</dt>
                  <dd>{t("maintenance_item.remind_at", { pct: item.remindPercent })}</dd>
                  {item.note && (
                    <>
                      <dt>{t("maintenance_item.note")}</dt>
                      <dd>{item.note}</dd>
                    </>
                  )}
                </CardFacts>
                <Toolbar>
                  <GhostButton onClick={() => toggleMutation.mutate(item)} disabled={toggleMutation.isLoading}>
                    {item.enabled ? t("maintenance_item.turn_off") : t("maintenance_item.turn_on")}
                  </GhostButton>
                  <GhostButton onClick={() => openEdit(item)}>
                    <EditOutlined />
                    {t("utils.edit")}
                  </GhostButton>
                  <Popconfirm
                    title={t("maintenance_item.delete_warn")}
                    okText={t("utils.confirm")}
                    cancelText={t("utils.cancel")}
                    onConfirm={() => deleteMutation.mutate(item.id)}
                  >
                    <DangerButton>
                      <DeleteOutlined />
                      {t("utils.delete")}
                    </DangerButton>
                  </Popconfirm>
                </Toolbar>
              </ItemCard>
            ))}
          </CardList>
        )}
      </Section>

      <Modal
        open={open}
        title={editing ? t("maintenance_item.edit") : t("maintenance_item.add")}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={saveMutation.isLoading}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        forceRender
      >
        <Form form={form} layout="vertical" autoComplete="off" initialValues={emptyForm}>
          <FieldGrid $cols={2}>
            <Field>
              <FieldLabel>{t("maintenance_item.name")}</FieldLabel>
              <Form.Item name="name" rules={[{ required: true, message: t("utils.required") }]}>
                <Input maxLength={100} placeholder={t("maintenance_item.name_placeholder")} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("maintenance_item.enabled")}</FieldLabel>
              <Form.Item name="enabled" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Field>
          </FieldGrid>

          <FieldLabel>{t("maintenance_item.target")}</FieldLabel>
          <Form.Item name="targetKind">
            <Select
              options={(["ALL", "ROBOT_TYPE", "ROBOTS"] as MaintenanceTargetKind[]).map((k) => ({
                value: k,
                label: t(`maintenance_item.target_${k}`),
              }))}
              onChange={() => form.setFieldValue("targetIds", [])}
            />
          </Form.Item>
          {targetKind && targetKind !== "ALL" && (
            <Form.Item name="targetIds" rules={[{ required: true, message: t("utils.required") }]}>
              <Select mode="multiple" options={targetOptions} optionFilterProp="label" placeholder={t("utils.select")} />
            </Form.Item>
          )}

          <FieldLabel>{t("maintenance_item.interval")}</FieldLabel>
          <FieldGrid $cols={3}>
            <Form.Item name="intervalKm">
              <InputNumber min={0.1} max={10000000} placeholder={t("maintenance_item.km")} suffix="km" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="intervalHours">
              <InputNumber min={0.1} max={1000000} placeholder={t("maintenance_item.hours")} suffix="h" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="intervalDays">
              <InputNumber min={1} max={36500} precision={0} placeholder={t("maintenance_item.days")} suffix={t("maintenance_item.day_unit")} style={{ width: "100%" }} />
            </Form.Item>
          </FieldGrid>
          <Hint>{t("maintenance_item.interval_hint")}</Hint>

          <FieldLabel>{t("maintenance_item.remind")}</FieldLabel>
          <Form.Item name="remindPercent" extra={t("maintenance_item.remind_hint")}>
            <InputNumber min={50} max={99} precision={0} suffix="%" style={{ width: 160 }} />
          </Form.Item>

          <FieldLabel>{t("maintenance_item.note")}</FieldLabel>
          <Form.Item name="note">
            <Input.TextArea maxLength={500} autoSize={{ minRows: 2, maxRows: 5 }} />
          </Form.Item>
        </Form>
      </Modal>
    </PanelShell>
  );
};

export default MaintenanceItemPanel;
