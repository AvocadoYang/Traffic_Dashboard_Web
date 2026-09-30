import { FC, useState } from "react";
import {
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Skeleton,
  Switch,
  message,
} from "antd";
import type { MessageInstance } from "antd/es/message/interface";
import {
  DashboardOutlined,
  DeleteOutlined,
  EditOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import client from "@/api/axiosClient";
import {
  TRANSFER_CONFIG_KEY,
  TRANSFER_TRIGGERS,
  TRIGGERS_WITH_TRIPS,
  TransferConfig,
  TransferRule,
  TransferRuleRuntime,
  TransferTriggerType,
  useTransferConfig,
  useTransferRuntime,
} from "@/api/useTransferRules";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import StatusTag from "../../ui/StatusTag";
import HelpButton from "../../ui/HelpButton";
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
  WarnNote,
} from "../../ui/primitives";

/**
 * 區域搬運規則: 從來源群組搬到目的群組, 觸發條件四選一
 * (手動 / 來源有貨就搬 / 依空位數補貨 / 定時)。
 * 任務走一般 dynamic mission 流程, 兩邊群組的擺放規則與取貨順序都會套用。
 */
const TransferRulePanel: FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const { data: config, isLoading, isFetching, refetch } = useTransferConfig();

  if (isLoading || !config) return <Skeleton active />;

  return (
    <PanelShell>
      {contextHolder}
      {!config.schemaReady && <WarnNote>{t("transfer_rules.schema_not_ready")}</WarnNote>}
      {config.hasMir && <WarnNote>{t("transfer_rules.mir_not_supported")}</WarnNote>}
      <Hint>
        {config.waitingEnabled
          ? t("transfer_rules.waiting_on")
          : t("transfer_rules.waiting_off")}
      </Hint>

      <RuntimeSection config={config} messageApi={messageApi} />
      <RuleSection
        config={config}
        messageApi={messageApi}
        reloading={isFetching}
        onReload={() => void refetch()}
      />
    </PanelShell>
  );
};

// ------------------------------------------------------------------ 共用

const tripsText = (t: TFunction, trips: number | null) =>
  trips === null ? t("transfer_rules.trips_until_empty") : t("transfer_rules.trips_n", { n: trips });

/** 觸發方式的一句話說明, 規則卡片和即時狀態共用 */
const triggerSummary = (t: TFunction, rule: TransferRule) => {
  const name = t(`transfer_rules.trigger_${rule.triggerType}`);
  switch (rule.triggerType) {
    case "FREE_SLOTS":
      return rule.freeSlots
        ? `${name}: ${t("transfer_rules.summary_free_slots", {
            start: rule.freeSlots.startAt,
            stop: rule.freeSlots.stopAt,
          })}`
        : name;
    case "SCHEDULE": {
      const s = rule.schedule;
      const when = !s
        ? ""
        : s.mode === "DAILY"
          ? t("transfer_rules.summary_daily", { times: s.times.join("、") })
          : t("transfer_rules.summary_interval", { n: s.everyMinutes });
      return `${name}: ${when}, ${tripsText(t, rule.trips)}`;
    }
    case "MANUAL":
      return `${name}, ${tripsText(t, rule.trips)}`;
    default:
      return name;
  }
};

const formatTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

// ------------------------------------------------------------------ 即時狀態

const RuntimeSection: FC<{ config: TransferConfig; messageApi: MessageInstance }> = ({
  config,
  messageApi,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: runtime } = useTransferRuntime();
  const rows = runtime ?? [];

  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "run" | "stop" }) =>
      client.post<{ message: string }>(`/api/transfer/rules/${id}/${action}`),
    onSuccess: (res) => {
      void messageApi.success(res.data.message);
      void queryClient.invalidateQueries({ queryKey: ["transfer-runtime"] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const ruleOf = (id: string) => config.rules.find((r) => r.id === id);

  return (
    <Section>
      <SectionTitle>
        <DashboardOutlined />
        {t("transfer_rules.runtime_title")}
        <HelpButton i18nKey="transfer_rules.help.runtime" label={t("transfer_rules.help.open")} />
      </SectionTitle>

      {rows.length === 0 ? (
        <EmptyState>{t("transfer_rules.no_runtime")}</EmptyState>
      ) : (
        <CardList>
          {rows.map((r: TransferRuleRuntime) => {
            const rule = ruleOf(r.ruleId);
            const canRun =
              !!rule?.isEnable && TRIGGERS_WITH_TRIPS.includes(r.triggerType) && !r.job;
            return (
              <ItemCard key={r.ruleId}>
                <CardTitleRow>
                  <span>{r.name}</span>
                  <StatusTag $on={r.state === "RUNNING" || r.state === "WAITING"}>
                    {t(`transfer_rules.state.${r.state}`)}
                  </StatusTag>
                </CardTitleRow>
                <CardFacts>
                  <dt>{t("transfer_rules.route")}</dt>
                  <dd>{`${r.sourceGroup} → ${r.destGroup}`}</dd>
                  <dt>{t("transfer_rules.trigger")}</dt>
                  <dd>{rule ? triggerSummary(t, rule) : "—"}</dd>
                  <dt>{t("transfer_rules.source_stock")}</dt>
                  <dd>
                    {r.source
                      ? t("transfer_rules.stock_text", {
                          cargo: r.source.cargo,
                          pickable: r.source.pickable,
                        })
                      : "—"}
                  </dd>
                  <dt>{t("transfer_rules.dest_free")}</dt>
                  <dd>{r.dest ? t("transfer_rules.free_text", { free: r.dest.free }) : "—"}</dd>
                  <dt>{t("transfer_rules.in_flight")}</dt>
                  <dd>{r.missionIds.length ? r.missionIds.join(", ") : "—"}</dd>
                  {r.job && (
                    <>
                      <dt>{t("transfer_rules.progress")}</dt>
                      <dd>
                        {r.job.total === null
                          ? t("transfer_rules.progress_until", { done: r.job.dispatched })
                          : t("transfer_rules.progress_n", {
                              done: r.job.dispatched,
                              total: r.job.total,
                            })}
                      </dd>
                    </>
                  )}
                  {r.triggerType === "SCHEDULE" && (
                    <>
                      <dt>{t("transfer_rules.next_run")}</dt>
                      <dd>{formatTime(r.nextRunAt)}</dd>
                    </>
                  )}
                  <dt>{t("transfer_rules.detail")}</dt>
                  <dd>{r.detail || "—"}</dd>
                </CardFacts>
                {(canRun || r.job) && (
                  <Toolbar>
                    {canRun && (
                      <SolidButton
                        disabled={act.isLoading}
                        onClick={() => act.mutate({ id: r.ruleId, action: "run" })}
                      >
                        <PlayCircleOutlined />
                        {t("transfer_rules.run_now")}
                      </SolidButton>
                    )}
                    {r.job && (
                      <DangerButton
                        disabled={act.isLoading}
                        onClick={() => act.mutate({ id: r.ruleId, action: "stop" })}
                      >
                        <PauseCircleOutlined />
                        {t("transfer_rules.stop")}
                      </DangerButton>
                    )}
                  </Toolbar>
                )}
              </ItemCard>
            );
          })}
        </CardList>
      )}
    </Section>
  );
};

// ------------------------------------------------------------------ 規則

type RuleForm = {
  name: string;
  isEnable: boolean;
  sourceGroupId: string;
  destGroupId: string;
  priority: number;
  triggerType: TransferTriggerType;
  startAt?: number;
  stopAt?: number;
  scheduleMode?: "DAILY" | "INTERVAL";
  times?: string[];
  everyMinutes?: number;
  tripsMode?: "COUNT" | "UNTIL_EMPTY";
  trips?: number;
  maxConcurrent: number;
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const toForm = (rule: TransferRule | null): RuleForm =>
  rule
    ? {
        name: rule.name,
        isEnable: rule.isEnable,
        sourceGroupId: rule.sourceGroupId,
        destGroupId: rule.destGroupId,
        priority: rule.priority,
        triggerType: rule.triggerType,
        startAt: rule.freeSlots?.startAt ?? 3,
        stopAt: rule.freeSlots?.stopAt ?? 0,
        scheduleMode: rule.schedule?.mode ?? "DAILY",
        times: rule.schedule?.mode === "DAILY" ? rule.schedule.times : ["08:00"],
        everyMinutes: rule.schedule?.mode === "INTERVAL" ? rule.schedule.everyMinutes : 30,
        tripsMode: rule.trips === null ? "UNTIL_EMPTY" : "COUNT",
        trips: rule.trips ?? 1,
        maxConcurrent: rule.maxConcurrent,
      }
    : {
        name: "",
        isEnable: true,
        sourceGroupId: undefined as unknown as string,
        destGroupId: undefined as unknown as string,
        priority: 1,
        triggerType: "MANUAL",
        startAt: 3,
        stopAt: 0,
        scheduleMode: "DAILY",
        times: ["08:00"],
        everyMinutes: 30,
        tripsMode: "COUNT",
        trips: 1,
        maxConcurrent: 1,
      };

const toPayload = (v: RuleForm) => ({
  name: v.name,
  isEnable: v.isEnable,
  sourceGroupId: v.sourceGroupId,
  destGroupId: v.destGroupId,
  priority: v.priority,
  triggerType: v.triggerType,
  freeSlots:
    v.triggerType === "FREE_SLOTS" ? { startAt: v.startAt ?? 1, stopAt: v.stopAt ?? 0 } : null,
  schedule:
    v.triggerType === "SCHEDULE"
      ? v.scheduleMode === "INTERVAL"
        ? { mode: "INTERVAL", everyMinutes: v.everyMinutes ?? 30 }
        : { mode: "DAILY", times: v.times ?? [] }
      : null,
  trips:
    TRIGGERS_WITH_TRIPS.includes(v.triggerType) && v.tripsMode === "COUNT"
      ? v.trips ?? 1
      : null,
  maxConcurrent: v.maxConcurrent,
});

const RuleSection: FC<{
  config: TransferConfig;
  messageApi: MessageInstance;
  reloading: boolean;
  onReload: () => void;
}> = ({ config, messageApi, reloading, onReload }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<RuleForm>();
  const triggerType = Form.useWatch("triggerType", form);
  const scheduleMode = Form.useWatch("scheduleMode", form);
  const tripsMode = Form.useWatch("tripsMode", form);
  const [editing, setEditing] = useState<TransferRule | null>(null);
  const [open, setOpen] = useState(false);

  const groupName = (id: string) => config.groups.find((g) => g.id === id)?.name ?? id;
  const priorityLabel = (v: number) =>
    config.priorities.find((p) => p.value === v)?.label ?? String(v);
  const groupOptions = config.groups.map((g) => ({ label: g.name, value: g.id }));

  const onDone = () => {
    void messageApi.success(t("utils.success"));
    void queryClient.invalidateQueries({ queryKey: TRANSFER_CONFIG_KEY });
  };
  const onError = (e: ErrorResponse) => errorHandler(e, messageApi);

  const saveMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof toPayload> & { id?: string }) =>
      payload.id
        ? client.put(`/api/transfer/rules/${payload.id}`, payload)
        : client.post("/api/transfer/rules", payload),
    onSuccess: () => {
      onDone();
      setOpen(false);
    },
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.delete(`/api/transfer/rules/${id}`),
    onSuccess: onDone,
    onError,
  });

  const openEdit = (rule: TransferRule | null) => {
    setEditing(rule);
    form.setFieldsValue(toForm(rule));
    setOpen(true);
  };

  const submit = async () => {
    let values: RuleForm;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    saveMutation.mutate({ ...toPayload(values), id: editing?.id });
  };

  const hasTrips = TRIGGERS_WITH_TRIPS.includes(triggerType);

  return (
    <Section>
      <SectionTitle>
        <SwapOutlined />
        {t("transfer_rules.rules_title")}
        <HelpButton i18nKey="transfer_rules.help.rules" label={t("transfer_rules.help.open")} />
      </SectionTitle>
      <Hint>{t("transfer_rules.rules_hint")}</Hint>

      <Toolbar>
        <SolidButton onClick={() => openEdit(null)} disabled={config.groups.length < 2}>
          <PlusOutlined />
          {t("transfer_rules.add_rule")}
        </SolidButton>
        <GhostButton onClick={onReload} disabled={reloading}>
          <ReloadOutlined />
          {t("utils.reload")}
        </GhostButton>
      </Toolbar>

      {config.rules.length === 0 ? (
        <EmptyState>{t("transfer_rules.no_rule")}</EmptyState>
      ) : (
        <CardList>
          {config.rules.map((r) => (
            <ItemCard key={r.id}>
              <CardTitleRow>
                <span>{r.name}</span>
                <StatusTag $on={r.isEnable}>
                  {r.isEnable ? t("utils.active") : t("utils.inactive")}
                </StatusTag>
              </CardTitleRow>
              <CardFacts>
                <dt>{t("transfer_rules.route")}</dt>
                <dd>{`${groupName(r.sourceGroupId)} → ${groupName(r.destGroupId)}`}</dd>
                <dt>{t("transfer_rules.trigger")}</dt>
                <dd>{triggerSummary(t, r)}</dd>
                <dt>{t("transfer_rules.priority")}</dt>
                <dd>{priorityLabel(r.priority)}</dd>
                <dt>{t("transfer_rules.max_concurrent")}</dt>
                <dd>{r.maxConcurrent}</dd>
              </CardFacts>
              <Toolbar>
                <GhostButton onClick={() => openEdit(r)}>
                  <EditOutlined />
                  {t("utils.edit")}
                </GhostButton>
                <Popconfirm
                  title={t("transfer_rules.delete_warn")}
                  okText={t("utils.confirm")}
                  cancelText={t("utils.cancel")}
                  onConfirm={() => deleteMutation.mutate(r.id)}
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

      <Modal
        open={open}
        title={editing ? t("transfer_rules.edit_rule") : t("transfer_rules.add_rule")}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={saveMutation.isLoading}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        width={640}
        forceRender
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <FieldGrid $cols={2}>
            <Field>
              <FieldLabel>{t("transfer_rules.name")}</FieldLabel>
              <Form.Item name="name" rules={[{ required: true, message: t("utils.required") }]}>
                <Input placeholder={t("transfer_rules.name_placeholder")} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("transfer_rules.enabled")}</FieldLabel>
              <Form.Item name="isEnable" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("transfer_rules.source")}</FieldLabel>
              <Form.Item
                name="sourceGroupId"
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <Select options={groupOptions} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("transfer_rules.dest")}</FieldLabel>
              <Form.Item
                name="destGroupId"
                dependencies={["sourceGroupId"]}
                rules={[
                  { required: true, message: t("utils.required") },
                  ({ getFieldValue }) => ({
                    validator: (_, value) =>
                      value && value === getFieldValue("sourceGroupId")
                        ? Promise.reject(new Error(t("transfer_rules.same_group")))
                        : Promise.resolve(),
                  }),
                ]}
              >
                <Select options={groupOptions} />
              </Form.Item>
            </Field>
          </FieldGrid>

          <FieldLabel>{t("transfer_rules.trigger")}</FieldLabel>
          <Form.Item name="triggerType" extra={t(`transfer_rules.trigger_hint_${triggerType ?? "MANUAL"}`)}>
            <Radio.Group
              optionType="button"
              options={TRANSFER_TRIGGERS.map((v) => ({
                value: v,
                label: t(`transfer_rules.trigger_${v}`),
              }))}
            />
          </Form.Item>

          {triggerType === "FREE_SLOTS" && (
            <FieldGrid $cols={2}>
              <Field>
                <FieldLabel>{t("transfer_rules.start_at")}</FieldLabel>
                <Form.Item name="startAt" rules={[{ required: true, message: t("utils.required") }]}>
                  <InputNumber min={1} addonAfter={t("transfer_rules.slots")} />
                </Form.Item>
              </Field>
              <Field>
                <FieldLabel>{t("transfer_rules.stop_at")}</FieldLabel>
                <Form.Item
                  name="stopAt"
                  dependencies={["startAt"]}
                  rules={[
                    { required: true, message: t("utils.required") },
                    ({ getFieldValue }) => ({
                      validator: (_, value) =>
                        value !== undefined && value >= (getFieldValue("startAt") ?? 0)
                          ? Promise.reject(new Error(t("transfer_rules.stop_lt_start")))
                          : Promise.resolve(),
                    }),
                  ]}
                >
                  <InputNumber min={0} addonAfter={t("transfer_rules.slots")} />
                </Form.Item>
              </Field>
            </FieldGrid>
          )}

          {triggerType === "SCHEDULE" && (
            <>
              <Form.Item name="scheduleMode">
                <Radio.Group
                  options={[
                    { value: "DAILY", label: t("transfer_rules.schedule_DAILY") },
                    { value: "INTERVAL", label: t("transfer_rules.schedule_INTERVAL") },
                  ]}
                />
              </Form.Item>
              {scheduleMode === "INTERVAL" ? (
                <Form.Item
                  name="everyMinutes"
                  rules={[{ required: true, message: t("utils.required") }]}
                >
                  <InputNumber min={1} max={1440} addonAfter={t("transfer_rules.minutes")} />
                </Form.Item>
              ) : (
                <Form.Item
                  name="times"
                  extra={t("transfer_rules.times_hint")}
                  rules={[
                    { required: true, message: t("utils.required") },
                    {
                      validator: (_, value: string[] = []) =>
                        value.every((v) => TIME_RE.test(v))
                          ? Promise.resolve()
                          : Promise.reject(new Error(t("transfer_rules.times_invalid"))),
                    },
                  ]}
                >
                  <Select mode="tags" placeholder="08:00" tokenSeparators={[",", " "]} />
                </Form.Item>
              )}
            </>
          )}

          {hasTrips && (
            <>
              <FieldLabel>{t("transfer_rules.trips")}</FieldLabel>
              <Toolbar>
                <Form.Item name="tripsMode" style={{ marginBottom: 0 }}>
                  <Radio.Group
                    options={[
                      { value: "COUNT", label: t("transfer_rules.trips_COUNT") },
                      { value: "UNTIL_EMPTY", label: t("transfer_rules.trips_UNTIL_EMPTY") },
                    ]}
                  />
                </Form.Item>
                {tripsMode === "COUNT" && (
                  <Form.Item name="trips" style={{ marginBottom: 0 }}>
                    <InputNumber min={1} max={999} addonAfter={t("transfer_rules.trip_unit")} />
                  </Form.Item>
                )}
              </Toolbar>
              <Hint>{t("transfer_rules.trips_hint")}</Hint>
            </>
          )}

          <FieldGrid $cols={2} style={{ marginTop: 16 }}>
            <Field>
              <FieldLabel>{t("transfer_rules.priority")}</FieldLabel>
              <Form.Item name="priority">
                <Select
                  options={config.priorities.map((p) => ({ label: p.label, value: p.value }))}
                />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("transfer_rules.max_concurrent")}</FieldLabel>
              <Form.Item name="maxConcurrent" extra={t("transfer_rules.max_concurrent_hint")}>
                <InputNumber min={1} max={10} />
              </Form.Item>
            </Field>
          </FieldGrid>
        </Form>
      </Modal>
    </Section>
  );
};

export default TransferRulePanel;
