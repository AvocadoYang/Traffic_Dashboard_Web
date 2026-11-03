import { FC, useEffect, useMemo, useState } from "react";
import {
  AutoComplete,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Switch,
  message,
} from "antd";
import type { MessageInstance } from "antd/es/message/interface";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  DashboardOutlined,
  EditOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import {
  ConveyorDispatchRuntime,
  ConveyorRouteRule,
  PLACEMENT_CONFIG_KEY,
  PlacementConfig,
  RouteCondition,
  useConveyorDispatchRuntime,
  usePlacementConfig,
} from "@/api/usePlacementConfig";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import StatusTag from "../../ui/StatusTag";
import HelpButton from "./ConveyorDispatchHelp";
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
  WarnNote,
} from "../../ui/primitives";

/**
 * 輸送帶自動派送的設定頁:
 *  - 即時狀態: 每條輸送帶隊首的貨符合哪條規則、派到哪、卡在哪
 *  - 派送規則: 隊首的貨依屬性決定要送去哪些群組 (依序嘗試)
 * 群組裡放哪一格 (巷道、層數、取貨順序) 搬到「群組取放規則」(GroupPickPlacePanel)。
 */
const ConveyorDispatchPanel: FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const { data: config, isLoading, isFetching, refetch } = usePlacementConfig();

  if (isLoading || !config) return <Skeleton active />;

  return (
    <PanelShell>
      {contextHolder}

      {!config.schemaReady && (
        <WarnNote>{t("conveyor_dispatch.schema_not_ready")}</WarnNote>
      )}
      <Hint>
        {config.waitingEnabled
          ? t("conveyor_dispatch.waiting_on")
          : t("conveyor_dispatch.waiting_off")}
      </Hint>

      <RuntimeSection />
      <RuleSection
        config={config}
        messageApi={messageApi}
        reloading={isFetching}
        onReload={() => void refetch()}
      />
      <Hint>{t("conveyor_dispatch.placement_moved")}</Hint>
    </PanelShell>
  );
};

// ------------------------------------------------------------------ 即時狀態

const metadataSummary = (metadata: Record<string, unknown>) =>
  Object.entries(metadata)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(" · ");

const RuntimeSection: FC = () => {
  const { t } = useTranslation();
  const { data: runtime } = useConveyorDispatchRuntime();
  const rows = runtime ?? [];

  return (
    <Section>
      <SectionTitle>
        <DashboardOutlined />
        {t("conveyor_dispatch.runtime_title")}
        <HelpButton topic="runtime" />
      </SectionTitle>

      {rows.length === 0 ? (
        <EmptyState>{t("conveyor_dispatch.no_runtime")}</EmptyState>
      ) : (
        <CardList>
          {rows.map((r: ConveyorDispatchRuntime) => (
            <ItemCard key={r.conveyor}>
              <CardTitleRow>
                <span>{r.conveyor}</span>
                <StatusTag $on={r.state === "DISPATCHED"}>
                  {t(`conveyor_dispatch.state.${r.state}`)}
                </StatusTag>
              </CardTitleRow>
              <CardFacts>
                <dt>{t("conveyor_dispatch.queue_length")}</dt>
                <dd>{r.queueLength}</dd>
                <dt>{t("conveyor_dispatch.head")}</dt>
                <dd>
                  {r.head
                    ? `${r.head.customId ?? r.head.cargoInfoId} (${metadataSummary(r.head.metadata)})`
                    : "—"}
                </dd>
                <dt>{t("conveyor_dispatch.rule")}</dt>
                <dd>{r.ruleName ?? "—"}</dd>
                <dt>{t("conveyor_dispatch.dest_groups")}</dt>
                <dd>{r.destGroups.length ? r.destGroups.join(" → ") : "—"}</dd>
                <dt>{t("conveyor_dispatch.mission")}</dt>
                <dd>{r.missionId ?? "—"}</dd>
                <dt>{t("conveyor_dispatch.detail")}</dt>
                <dd>{r.detail || "—"}</dd>
              </CardFacts>
            </ItemCard>
          ))}
        </CardList>
      )}
    </Section>
  );
};

// ------------------------------------------------------------------ 派送規則

type RuleForm = {
  name: string;
  isEnable: boolean;
  isFallback: boolean;
  conditions: RouteCondition[];
  destGroupIds: string[];
  priority: number;
};

/** 顯示順序跟後端比對順序一樣: 一般規則依順序, fallback 永遠最後 */
const orderedRules = (rules: ConveyorRouteRule[]) => [
  ...rules.filter((r) => !r.isFallback).sort((a, b) => a.ruleOrder - b.ruleOrder),
  ...rules.filter((r) => r.isFallback),
];

const RuleSection: FC<{
  config: PlacementConfig;
  messageApi: MessageInstance;
  reloading: boolean;
  onReload: () => void;
}> = ({ config, messageApi, reloading, onReload }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<RuleForm>();
  const isFallback = Form.useWatch("isFallback", form);

  const [conveyorId, setConveyorId] = useState<string | undefined>(
    config.conveyors[0]?.id,
  );
  const [editing, setEditing] = useState<ConveyorRouteRule | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!conveyorId && config.conveyors[0]) setConveyorId(config.conveyors[0].id);
  }, [config.conveyors, conveyorId]);

  const conveyor = config.conveyors.find((c) => c.id === conveyorId);
  const rules = useMemo(() => orderedRules(conveyor?.rules ?? []), [conveyor]);
  const groupName = (id: string) =>
    config.groups.find((g) => g.id === id)?.name ?? id;
  const priorityLabel = (v: number) =>
    config.priorities.find((p) => p.value === v)?.label ?? String(v);

  const onDone = () => {
    void messageApi.success(t("utils.success"));
    void queryClient.invalidateQueries({ queryKey: PLACEMENT_CONFIG_KEY });
  };
  const onError = (e: ErrorResponse) => errorHandler(e, messageApi);

  const saveMutation = useMutation({
    mutationFn: (payload: RuleForm & { conveyorId: string; id?: string }) =>
      payload.id
        ? client.put(`/api/placement/conveyor-rule/${payload.id}`, payload)
        : client.post("/api/placement/conveyor-rule", payload),
    onSuccess: () => {
      onDone();
      setOpen(false);
    },
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.delete(`/api/placement/conveyor-rule/${id}`),
    onSuccess: onDone,
    onError,
  });

  const reorderMutation = useMutation({
    mutationFn: (order: string[]) =>
      client.post("/api/placement/conveyor-rule/reorder", { order }),
    onSuccess: onDone,
    onError,
  });

  const normalRules = rules.filter((r) => !r.isFallback);
  const move = (id: string, delta: -1 | 1) => {
    const ids = normalRules.map((r) => r.id);
    const i = ids.indexOf(id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorderMutation.mutate(ids);
  };

  const openEdit = (rule: ConveyorRouteRule | null) => {
    setEditing(rule);
    form.setFieldsValue(
      rule
        ? {
            name: rule.name,
            isEnable: rule.isEnable,
            isFallback: rule.isFallback,
            conditions: rule.conditions,
            destGroupIds: rule.destGroupIds,
            priority: rule.priority,
          }
        : {
            name: "",
            isEnable: true,
            isFallback: false,
            conditions: [{ key: "", value: "" }],
            destGroupIds: [],
            priority: 1,
          },
    );
    setOpen(true);
  };

  const submit = async () => {
    if (!conveyorId) return;
    let values: RuleForm;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    saveMutation.mutate({
      ...values,
      conditions: values.isFallback ? [] : values.conditions ?? [],
      conveyorId,
      id: editing?.id,
    });
  };

  const renderConditions = (r: ConveyorRouteRule) =>
    r.isFallback ? (
      <Tag>{t("conveyor_dispatch.fallback")}</Tag>
    ) : (
      // 比對區分大小寫, 不能沿用 Tag 預設的全大寫
      r.conditions.map((c) => (
        <Tag key={`${c.key}=${c.value}`} style={{ textTransform: "none" }}>
          {`${c.key} = ${c.value}`}
        </Tag>
      ))
    );

  const renderActions = (r: ConveyorRouteRule, withText: boolean) => {
    const idx = normalRules.findIndex((n) => n.id === r.id);
    return (
      <Toolbar>
        {!r.isFallback && (
          <>
            <GhostButton
              title={t("conveyor_dispatch.move_up")}
              disabled={idx <= 0 || reorderMutation.isLoading}
              onClick={() => move(r.id, -1)}
            >
              <ArrowUpOutlined />
            </GhostButton>
            <GhostButton
              title={t("conveyor_dispatch.move_down")}
              disabled={idx === normalRules.length - 1 || reorderMutation.isLoading}
              onClick={() => move(r.id, 1)}
            >
              <ArrowDownOutlined />
            </GhostButton>
          </>
        )}
        <GhostButton onClick={() => openEdit(r)}>
          <EditOutlined />
          {withText && t("utils.edit")}
        </GhostButton>
        <Popconfirm
          title={t("utils.delete_warn")}
          okText={t("utils.confirm")}
          cancelText={t("utils.cancel")}
          onConfirm={() => deleteMutation.mutate(r.id)}
        >
          <DangerButton>
            <DeleteOutlined />
            {withText && t("utils.delete")}
          </DangerButton>
        </Popconfirm>
      </Toolbar>
    );
  };

  return (
    <Section>
      <SectionTitle>
        <ShareAltOutlined />
        {t("conveyor_dispatch.rules_title")}
        <HelpButton topic="rules" />
      </SectionTitle>
      <Hint>{t("conveyor_dispatch.rules_hint")}</Hint>

      {config.conveyors.length === 0 ? (
        <EmptyState>{t("conveyor_dispatch.no_conveyor")}</EmptyState>
      ) : (
        <>
          <Toolbar>
            <Select
              style={{ minWidth: 260 }}
              value={conveyorId}
              onChange={setConveyorId}
              options={config.conveyors.map((c) => ({
                label:
                  c.type === "PACKAGE"
                    ? t("conveyor_dispatch.package_exit", { name: c.name })
                    : c.name,
                value: c.id,
              }))}
            />
            <SolidButton onClick={() => openEdit(null)}>
              <PlusOutlined />
              {t("conveyor_dispatch.add_rule")}
            </SolidButton>
            <GhostButton onClick={onReload} disabled={reloading}>
              <ReloadOutlined />
              {t("utils.reload")}
            </GhostButton>
          </Toolbar>

          {rules.length === 0 ? (
            <EmptyState>{t("conveyor_dispatch.no_rule")}</EmptyState>
          ) : (
            // 設定面板本身很窄, 表格會需要橫向捲動, 規則也不多, 一律用卡片
            <CardList>
              {rules.map((r, i) => (
                <ItemCard key={r.id}>
                  <CardTitleRow>
                    <span>{r.isFallback ? r.name : `${i + 1}. ${r.name}`}</span>
                    <StatusTag $on={r.isEnable}>
                      {r.isEnable ? t("utils.active") : t("utils.inactive")}
                    </StatusTag>
                  </CardTitleRow>
                  <CardFacts>
                    <dt>{t("conveyor_dispatch.conditions")}</dt>
                    <dd>{renderConditions(r)}</dd>
                    <dt>{t("conveyor_dispatch.dest_groups")}</dt>
                    <dd>{r.destGroupIds.map(groupName).join(" → ")}</dd>
                    <dt>{t("conveyor_dispatch.priority")}</dt>
                    <dd>{priorityLabel(r.priority)}</dd>
                  </CardFacts>
                  {renderActions(r, true)}
                </ItemCard>
              ))}
            </CardList>
          )}
        </>
      )}

      <Modal
        open={open}
        title={editing ? t("conveyor_dispatch.edit_rule") : t("conveyor_dispatch.add_rule")}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={saveMutation.isLoading}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        width={640}
        forceRender
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <FieldGrid $cols={3}>
            <Field>
              <FieldLabel>{t("conveyor_dispatch.name")}</FieldLabel>
              <Form.Item name="name" rules={[{ required: true, message: t("utils.required") }]}>
                <Input />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("conveyor_dispatch.enabled")}</FieldLabel>
              <Form.Item name="isEnable" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("conveyor_dispatch.fallback")}</FieldLabel>
              <Form.Item name="isFallback" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Field>
          </FieldGrid>

          {isFallback ? (
            <Hint>{t("conveyor_dispatch.fallback_hint")}</Hint>
          ) : (
            <>
              <FieldLabel>{t("conveyor_dispatch.conditions")}</FieldLabel>
              <Form.List name="conditions">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field) => (
                      <Toolbar key={field.key} style={{ marginTop: 8 }}>
                        <Form.Item
                          name={[field.name, "key"]}
                          rules={[{ required: true, message: t("utils.required") }]}
                          style={{ marginBottom: 0, flex: 1 }}
                        >
                          <AutoComplete
                            placeholder={t("conveyor_dispatch.key")}
                            options={config.cargoKeys.map((k) => ({ value: k }))}
                          />
                        </Form.Item>
                        <span>=</span>
                        <Form.Item
                          name={[field.name, "value"]}
                          rules={[{ required: true, message: t("utils.required") }]}
                          style={{ marginBottom: 0, flex: 1 }}
                        >
                          <Input placeholder={t("conveyor_dispatch.value")} />
                        </Form.Item>
                        <GhostButton type="button" onClick={() => remove(field.name)}>
                          <MinusCircleOutlined />
                        </GhostButton>
                      </Toolbar>
                    ))}
                    <GhostButton
                      type="button"
                      style={{ marginTop: 8 }}
                      onClick={() => add({ key: "", value: "" })}
                    >
                      <PlusOutlined />
                      {t("conveyor_dispatch.add_condition")}
                    </GhostButton>
                  </>
                )}
              </Form.List>
            </>
          )}

          <FieldGrid $cols={2} style={{ marginTop: 16 }}>
            <Field>
              <FieldLabel>{t("conveyor_dispatch.dest_groups")}</FieldLabel>
              <Form.Item
                name="destGroupIds"
                extra={t("conveyor_dispatch.dest_groups_hint")}
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <Select
                  mode="multiple"
                  options={config.groups.map((g) => ({ label: g.name, value: g.id }))}
                />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("conveyor_dispatch.priority")}</FieldLabel>
              <Form.Item name="priority">
                <Select
                  options={config.priorities.map((p) => ({ label: p.label, value: p.value }))}
                />
              </Form.Item>
            </Field>
          </FieldGrid>
        </Form>
      </Modal>
    </Section>
  );
};

export default ConveyorDispatchPanel;
