import { FC, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AutoComplete,
  Form,
  Input,
  InputNumber,
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
  BranchesOutlined,
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
  PlacementPolicy,
  RouteCondition,
  useConveyorDispatchRuntime,
  usePlacementConfig,
  PICK_ORDERS,
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
 *  - 群組擺放規則: 巷道、層數、高度、同屬性才能疊
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
      <PolicySection config={config} messageApi={messageApi} />
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
              style={{ minWidth: 160 }}
              value={conveyorId}
              onChange={setConveyorId}
              options={config.conveyors.map((c) => ({ label: c.name, value: c.id }))}
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

// ------------------------------------------------------------------ 群組擺放規則

const defaultPolicy = (maxLevels: number): PlacementPolicy => ({
  lanes: [],
  maxLevels,
  heightKey: null,
  maxHeight: null,
  stackMatchKeys: [],
  preferStacking: true,
  pickOrder: "NEAREST",
});

const PolicySection: FC<{
  config: PlacementConfig;
  messageApi: MessageInstance;
}> = ({ config, messageApi }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // 預設選第一個有 STACK 的群組, 擺放規則只管 STACK
  const stackGroups = config.groups.filter((g) =>
    g.members.some((m) => m.type === "STACK"),
  );
  const [groupId, setGroupId] = useState<string | undefined>(stackGroups[0]?.id);
  const group = config.groups.find((g) => g.id === groupId);
  const [draft, setDraft] = useState<PlacementPolicy>(defaultPolicy(config.maxLevels));

  useEffect(() => {
    if (!groupId && stackGroups[0]) setGroupId(stackGroups[0].id);
  }, [groupId, stackGroups]);

  // 換群組或重新讀取設定後, 用後端的值重設草稿
  useEffect(() => {
    setDraft(group?.policy ?? defaultPolicy(config.maxLevels));
  }, [group, config.maxLevels]);

  const stacks = (group?.members ?? []).filter((m) => m.type === "STACK");
  const stackName = (id: string) => stacks.find((s) => s.id === id)?.name ?? id;
  const usedInLanes = new Set(draft.lanes.flat());
  const unassigned = stacks.filter((s) => !usedInLanes.has(s.id));

  const onDone = () => {
    void messageApi.success(t("utils.success"));
    void queryClient.invalidateQueries({ queryKey: PLACEMENT_CONFIG_KEY });
  };
  const onError = (e: ErrorResponse) => errorHandler(e, messageApi);

  const saveMutation = useMutation({
    mutationFn: (policy: PlacementPolicy) =>
      client.put(`/api/placement/group-policy/${groupId}`, {
        ...policy,
        lanes: policy.lanes.filter((l) => l.length > 0),
      }),
    onSuccess: onDone,
    onError,
  });

  const removeMutation = useMutation({
    mutationFn: () => client.delete(`/api/placement/group-policy/${groupId}`),
    onSuccess: onDone,
    onError,
  });

  const patch = (next: Partial<PlacementPolicy>) => setDraft((d) => ({ ...d, ...next }));
  const setLane = (i: number, ids: string[]) =>
    patch({ lanes: draft.lanes.map((l, j) => (j === i ? ids : l)) });

  return (
    <Section>
      <SectionTitle>
        <BranchesOutlined />
        {t("conveyor_dispatch.policy_title")}
        <HelpButton topic="policy" />
      </SectionTitle>
      <Hint>{t("conveyor_dispatch.only_stack_note")}</Hint>

      {stackGroups.length === 0 ? (
        <EmptyState>{t("conveyor_dispatch.no_stack_group")}</EmptyState>
      ) : (
        <>
          <Toolbar>
            <Select
              style={{ minWidth: 160 }}
              value={groupId}
              onChange={setGroupId}
              options={stackGroups.map((g) => ({ label: g.name, value: g.id }))}
            />
            {!group?.policy && <Tag>{t("conveyor_dispatch.no_policy")}</Tag>}
          </Toolbar>

          <FieldGrid $cols={2}>
            <Field>
              <FieldLabel>{t("conveyor_dispatch.max_levels")}</FieldLabel>
              <InputNumber
                min={1}
                max={config.maxLevels}
                value={draft.maxLevels}
                onChange={(v) => patch({ maxLevels: v ?? config.maxLevels })}
              />
            </Field>
            <Field>
              <FieldLabel>{t("conveyor_dispatch.prefer_stacking")}</FieldLabel>
              <Switch
                checked={draft.preferStacking}
                onChange={(v) => patch({ preferStacking: v })}
                style={{ alignSelf: "flex-start" }}
              />
              <Hint>{t("conveyor_dispatch.prefer_stacking_hint")}</Hint>
            </Field>
            <Field>
              <FieldLabel>{t("conveyor_dispatch.stack_match_keys")}</FieldLabel>
              <Select
                mode="tags"
                value={draft.stackMatchKeys}
                onChange={(v: string[]) => patch({ stackMatchKeys: v })}
                options={config.cargoKeys.map((k) => ({ label: k, value: k }))}
              />
              <Hint>{t("conveyor_dispatch.stack_match_hint")}</Hint>
            </Field>
            <Field>
              <FieldLabel>{t("conveyor_dispatch.height_limit")}</FieldLabel>
              <Toolbar>
                <Select
                  allowClear
                  style={{ minWidth: 140 }}
                  placeholder={t("conveyor_dispatch.height_key")}
                  value={draft.heightKey ?? undefined}
                  onChange={(v?: string) =>
                    patch({ heightKey: v ?? null, maxHeight: v ? draft.maxHeight : null })
                  }
                  options={config.cargoKeys.map((k) => ({ label: k, value: k }))}
                />
                <InputNumber
                  min={1}
                  disabled={!draft.heightKey}
                  placeholder={t("conveyor_dispatch.max_height")}
                  value={draft.maxHeight ?? undefined}
                  onChange={(v) => patch({ maxHeight: v ?? null })}
                />
              </Toolbar>
              <Hint>{t("conveyor_dispatch.height_hint")}</Hint>
            </Field>
            <Field>
              <FieldLabel>{t("conveyor_dispatch.pick_order")}</FieldLabel>
              <Select
                style={{ minWidth: 160 }}
                value={draft.pickOrder ?? "NEAREST"}
                onChange={(v) => patch({ pickOrder: v })}
                options={PICK_ORDERS.map((o) => ({
                  label: t(`conveyor_dispatch.pick_order_${o}`),
                  value: o,
                }))}
              />
              <Hint>
                {t(`conveyor_dispatch.pick_order_hint_${draft.pickOrder ?? "NEAREST"}`)}
              </Hint>
            </Field>
          </FieldGrid>

          <FieldLabel style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {t("conveyor_dispatch.lanes")}
            <HelpButton topic="lanes" />
          </FieldLabel>
          <Hint>{t("conveyor_dispatch.lanes_hint")}</Hint>
          {draft.lanes.map((lane, i) => (
            <Toolbar key={i}>
              <span style={{ minWidth: 64 }}>{t("conveyor_dispatch.lane_n", { n: i + 1 })}</span>
              <Select
                mode="multiple"
                style={{ flex: 1, minWidth: 240 }}
                placeholder={t("conveyor_dispatch.lane_placeholder")}
                value={lane}
                onChange={(ids: string[]) => setLane(i, ids)}
                options={stacks.map((s) => ({
                  label: s.name,
                  value: s.id,
                  // 一個點位只能在一條巷道
                  disabled: usedInLanes.has(s.id) && !lane.includes(s.id),
                }))}
              />
              <GhostButton
                type="button"
                onClick={() => patch({ lanes: draft.lanes.filter((_, j) => j !== i) })}
              >
                <MinusCircleOutlined />
              </GhostButton>
              {lane.length > 0 && (
                <Hint style={{ flexBasis: "100%" }}>
                  {t("conveyor_dispatch.lane_inner")} {lane.map(stackName).join(" › ")}{" "}
                  {t("conveyor_dispatch.lane_outer")}
                </Hint>
              )}
            </Toolbar>
          ))}
          <Toolbar>
            <GhostButton type="button" onClick={() => patch({ lanes: [...draft.lanes, []] })}>
              <PlusOutlined />
              {t("conveyor_dispatch.add_lane")}
            </GhostButton>
          </Toolbar>
          {/* 不在巷道裡的 stack 會被當成隨時能直接取放, 而且挑離輸送帶最近的,
              只設一部分巷道時很容易以為巷道沒作用, 所以用警告明講 */}
          {unassigned.length > 0 && (
            <Alert
              type={draft.lanes.some((l) => l.length > 0) ? "warning" : "info"}
              showIcon
              message={`${t("conveyor_dispatch.unassigned")}: ${unassigned
                .map((s) => s.name)
                .join(", ")}`}
              description={t("conveyor_dispatch.unassigned_hint")}
            />
          )}

          <Toolbar>
            <SolidButton
              disabled={saveMutation.isLoading || (!!draft.heightKey && !draft.maxHeight)}
              onClick={() => saveMutation.mutate(draft)}
            >
              {t("utils.save")}
            </SolidButton>
            {group?.policy && (
              <Popconfirm
                title={t("conveyor_dispatch.remove_policy_warn")}
                okText={t("utils.confirm")}
                cancelText={t("utils.cancel")}
                onConfirm={() => removeMutation.mutate()}
              >
                <DangerButton>
                  <DeleteOutlined />
                  {t("conveyor_dispatch.remove_policy")}
                </DangerButton>
              </Popconfirm>
            )}
          </Toolbar>
        </>
      )}
    </Section>
  );
};

export default ConveyorDispatchPanel;
