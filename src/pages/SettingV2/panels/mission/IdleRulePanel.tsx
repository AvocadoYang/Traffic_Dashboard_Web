import { FC, useState } from "react";
import {
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
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import StatusTag from "../../ui/StatusTag";
import useNormalMissionOptions from "../../ui/useNormalMissionOptions";
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

type TargetKind = "ALL" | "ROBOT_TYPE" | "ROBOTS";
type LocationMode = "ANY" | "IN" | "NOT_IN";
type ActionKind = "STANDBY" | "MISSION";

type RuleForm = {
  name: string;
  enabled: boolean;
  targetKind: TargetKind;
  targetIds: string[];
  idleMin: number;
  locationMode: LocationMode;
  locationValues: string[];
  actionKind: ActionKind;
  missionTitleId: string | null;
  onlyWhenFleetIdle: boolean;
  retrySec: number;
};

type IdleRule = RuleForm & {
  id: string;
  missionName: string | null;
  /** 從舊的閒置任務轉過來的 */
  isLegacy: boolean;
};

type RuleOptions = {
  areaTypes: string[];
  locationIds: string[];
  robotTypes: { id: string; name: string }[];
  robots: { fullName: string; isReal: boolean; robotTypeId: string }[];
};

const RULES_KEY = ["idle-rules"];

/** 有中文名稱的點位類型; 其他的直接顯示代號 */
const AREA_TYPE_LABELS = {
  STANDBY: "idle_rules.area_type.STANDBY",
  CHARGING: "idle_rules.area_type.CHARGING",
  STORAGE: "idle_rules.area_type.STORAGE",
  EXTRA: "idle_rules.area_type.EXTRA",
  DISPATCH: "idle_rules.area_type.DISPATCH",
  STACK: "idle_rules.area_type.STACK",
  CONVEYOR: "idle_rules.area_type.CONVEYOR",
  PACKAGE: "idle_rules.area_type.PACKAGE",
  PACKAGE_IN: "idle_rules.area_type.PACKAGE_IN",
  PACKAGE_OUT: "idle_rules.area_type.PACKAGE_OUT",
  ELEVATOR: "idle_rules.area_type.ELEVATOR",
  PRE_ELEVATOR: "idle_rules.area_type.PRE_ELEVATOR",
  ROBOTIC_ARM: "idle_rules.area_type.ROBOTIC_ARM",
  LIFT_GATE: "idle_rules.area_type.LIFT_GATE",
  GATE_WAIT_POINT: "idle_rules.area_type.GATE_WAIT_POINT",
  PALLETIZER: "idle_rules.area_type.PALLETIZER",
  ROTATE_TABLE: "idle_rules.area_type.ROTATE_TABLE",
} as const;

const isLabelledAreaType = (type: string): type is keyof typeof AREA_TYPE_LABELS =>
  type in AREA_TYPE_LABELS;

const getRules = async () => {
  const { data } = await client.get<{ rules: IdleRule[] }>("api/setting/idle-rules");
  return data.rules;
};

const getOptions = async () => {
  const { data } = await client.get<RuleOptions>("api/setting/idle-rule-options");
  return data;
};

const emptyForm: RuleForm = {
  name: "",
  enabled: true,
  targetKind: "ALL",
  targetIds: [],
  idleMin: 1,
  locationMode: "NOT_IN",
  locationValues: ["STANDBY", "CHARGING"],
  actionKind: "STANDBY",
  missionTitleId: null,
  onlyWhenFleetIdle: false,
  retrySec: 30,
};

const toForm = (rule: IdleRule | null): RuleForm =>
  rule
    ? {
        name: rule.name,
        enabled: rule.enabled,
        targetKind: rule.targetKind,
        targetIds: rule.targetIds,
        idleMin: rule.idleMin,
        locationMode: rule.locationMode,
        locationValues: rule.locationValues,
        actionKind: rule.actionKind,
        missionTitleId: rule.missionTitleId,
        onlyWhenFleetIdle: rule.onlyWhenFleetIdle,
        retrySec: rule.retrySec,
      }
    : emptyForm;

/**
 * 閒置規則: 車閒置時要做什麼。清單由上往下比對, 一台車做第一條符合的。
 * 每條規則 = 哪些車 + 閒置多久、在不在哪些地方 + 回待命點或執行任務。
 */
const IdleRulePanel: FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<RuleForm>();
  const [editing, setEditing] = useState<IdleRule | null>(null);
  const [open, setOpen] = useState(false);

  const { data: rules, isLoading, isFetching, refetch } = useQuery(RULES_KEY, getRules);
  const { data: options } = useQuery(["idle-rule-options"], getOptions);
  const missionOptions = useNormalMissionOptions();

  const targetKind = Form.useWatch("targetKind", form);
  const locationMode = Form.useWatch("locationMode", form);
  const actionKind = Form.useWatch("actionKind", form);

  const areaTypeLabel = (type: string) =>
    isLabelledAreaType(type) ? t(AREA_TYPE_LABELS[type]) : type;
  // 規則裡存的可能是點位類型也可能是點位 id
  const placeLabel = (value: string) =>
    options?.areaTypes.includes(value) ? areaTypeLabel(value) : value;
  const robotTypeName = (id: string) =>
    options?.robotTypes.find((r) => r.id === id)?.name ?? id;

  const targetOptions =
    targetKind === "ROBOT_TYPE"
      ? (options?.robotTypes ?? []).map((r) => ({ value: r.id, label: r.name }))
      : (options?.robots ?? []).map((r) => ({
          value: r.fullName,
          label: r.isReal ? r.fullName : `${r.fullName} ${t("simulate")}`,
        }));

  const placeOptions = [
    {
      label: t("idle_rules.area_types"),
      options: (options?.areaTypes ?? []).map((type) => ({
        value: type,
        label: areaTypeLabel(type),
      })),
    },
    {
      label: t("idle_rules.points"),
      options: (options?.locationIds ?? []).map((id) => ({ value: id, label: id })),
    },
  ];

  const onDone = () => {
    void messageApi.success(t("utils.success"));
    void refetch();
  };
  const onError = (e: ErrorResponse) => errorHandler(e, messageApi);

  const saveMutation = useMutation({
    mutationFn: (payload: RuleForm & { id?: string }) =>
      payload.id
        ? client.put(`api/setting/idle-rules/${payload.id}`, payload)
        : client.post("api/setting/idle-rules", payload),
    onSuccess: () => {
      onDone();
      setOpen(false);
    },
    onError,
  });

  const toggleMutation = useMutation({
    mutationFn: (rule: IdleRule) =>
      client.put(`api/setting/idle-rules/${rule.id}`, {
        ...toForm(rule),
        enabled: !rule.enabled,
      }),
    onSuccess: onDone,
    onError,
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => client.post("api/setting/idle-rules/reorder", { ids }),
    onSuccess: onDone,
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.delete(`api/setting/idle-rules/${id}`),
    onSuccess: onDone,
    onError,
  });

  const openEdit = (rule: IdleRule | null) => {
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
    // 條件收起來的欄位不在表單裡, 補上預設值
    saveMutation.mutate({
      ...values,
      targetIds: values.targetKind === "ALL" ? [] : values.targetIds ?? [],
      locationValues: values.locationMode === "ANY" ? [] : values.locationValues ?? [],
      missionTitleId: values.actionKind === "MISSION" ? values.missionTitleId : null,
      id: editing?.id,
    });
  };

  const move = (index: number, step: -1 | 1) => {
    if (!rules) return;
    const ids = rules.map((r) => r.id);
    const to = index + step;
    if (to < 0 || to >= ids.length) return;
    [ids[index], ids[to]] = [ids[to], ids[index]];
    reorderMutation.mutate(ids);
  };

  const describeTarget = (rule: IdleRule) => {
    if (rule.targetKind === "ALL") return t("idle_rules.target_all");
    if (rule.targetKind === "ROBOT_TYPE") {
      return rule.targetIds.map((id) => <Tag key={id}>{robotTypeName(id)}</Tag>);
    }
    return rule.targetIds.length
      ? rule.targetIds.map((name) => <Tag key={name}>{name}</Tag>)
      : t("idle_rules.target_none");
  };

  if (isLoading || !rules) return <Skeleton active />;

  return (
    <PanelShell>
      {contextHolder}

      <Section>
        <SectionTitle>
          <ClockCircleOutlined />
          {t("idle_rules.title")}
        </SectionTitle>
        <Hint>{t("idle_rules.hint")}</Hint>

        <Toolbar>
          <SolidButton onClick={() => openEdit(null)}>
            <PlusOutlined />
            {t("idle_rules.add")}
          </SolidButton>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
        </Toolbar>

        {rules.length === 0 ? (
          <EmptyState>{t("idle_rules.empty")}</EmptyState>
        ) : (
          <CardList>
            {rules.map((rule, index) => (
              <ItemCard key={rule.id}>
                <CardTitleRow>
                  <span>{`${index + 1}. ${rule.name}`}</span>
                  <StatusTag $on={rule.enabled}>
                    {rule.enabled ? t("idle_rules.enabled") : t("idle_rules.disabled")}
                  </StatusTag>
                </CardTitleRow>

                <CardFacts>
                  <dt>{t("idle_rules.target")}</dt>
                  <dd>{describeTarget(rule)}</dd>
                  <dt>{t("idle_rules.when")}</dt>
                  <dd>
                    {rule.idleMin > 0
                      ? t("idle_rules.idle_for", { min: rule.idleMin })
                      : t("idle_rules.idle_at_once")}
                    {rule.locationMode !== "ANY" && (
                      <div>
                        {rule.locationMode === "IN"
                          ? t("idle_rules.location_IN")
                          : t("idle_rules.location_NOT_IN")}
                        {"："}
                        {rule.locationValues.map((v) => (
                          <Tag key={v}>{placeLabel(v)}</Tag>
                        ))}
                      </div>
                    )}
                    {rule.onlyWhenFleetIdle && <div>{t("idle_rules.only_when_fleet_idle")}</div>}
                  </dd>
                  <dt>{t("idle_rules.action")}</dt>
                  <dd>
                    {rule.actionKind === "STANDBY"
                      ? t("idle_rules.action_STANDBY")
                      : t("idle_rules.run_mission", {
                          name: rule.missionName ?? t("idle_rules.mission_gone"),
                        })}
                  </dd>
                  <dt>{t("idle_rules.retry")}</dt>
                  <dd>{t("idle_rules.retry_after", { sec: rule.retrySec })}</dd>
                </CardFacts>

                <Toolbar>
                  <GhostButton
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || reorderMutation.isLoading}
                    title={t("idle_rules.move_up")}
                  >
                    <ArrowUpOutlined />
                  </GhostButton>
                  <GhostButton
                    onClick={() => move(index, 1)}
                    disabled={index === rules.length - 1 || reorderMutation.isLoading}
                    title={t("idle_rules.move_down")}
                  >
                    <ArrowDownOutlined />
                  </GhostButton>
                  <GhostButton
                    onClick={() => toggleMutation.mutate(rule)}
                    disabled={toggleMutation.isLoading}
                  >
                    {rule.enabled ? <CloseCircleOutlined /> : <PlayCircleOutlined />}
                    {rule.enabled ? t("idle_rules.turn_off") : t("idle_rules.turn_on")}
                  </GhostButton>
                  <GhostButton onClick={() => openEdit(rule)}>
                    <EditOutlined />
                    {t("utils.edit")}
                  </GhostButton>
                  <Popconfirm
                    title={t("utils.delete_warn")}
                    okText={t("utils.confirm")}
                    cancelText={t("utils.cancel")}
                    onConfirm={() => deleteMutation.mutate(rule.id)}
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
        <Hint>{t("idle_rules.order_hint")}</Hint>
      </Section>

      <Modal
        open={open}
        title={editing ? t("idle_rules.edit") : t("idle_rules.add")}
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
              <FieldLabel>{t("idle_rules.name")}</FieldLabel>
              <Form.Item name="name" rules={[{ required: true, message: t("utils.required") }]}>
                <Input maxLength={50} placeholder={t("idle_rules.name_placeholder")} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("idle_rules.enabled")}</FieldLabel>
              <Form.Item name="enabled" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Field>
          </FieldGrid>

          <FieldLabel>{t("idle_rules.target")}</FieldLabel>
          <Form.Item name="targetKind">
            <Select
              options={(["ALL", "ROBOT_TYPE", "ROBOTS"] as const).map((kind) => ({
                value: kind,
                label: t(`idle_rules.target_${kind}`),
              }))}
              onChange={() => form.setFieldValue("targetIds", [])}
            />
          </Form.Item>
          {targetKind !== "ALL" && (
            <Form.Item
              name="targetIds"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <Select
                mode="multiple"
                options={targetOptions}
                optionFilterProp="label"
                placeholder={t("utils.select")}
              />
            </Form.Item>
          )}

          <FieldLabel>{t("idle_rules.idle_min")}</FieldLabel>
          <Form.Item
            name="idleMin"
            extra={t("idle_rules.idle_min_hint")}
            rules={[{ required: true, message: t("utils.required") }]}
          >
            <InputNumber
              min={0}
              max={1440}
              step={0.5}
              suffix={t("utils.minutes")}
              style={{ width: 160 }}
            />
          </Form.Item>

          <FieldLabel>{t("idle_rules.location")}</FieldLabel>
          <Form.Item name="locationMode">
            <Select
              options={(["ANY", "IN", "NOT_IN"] as const).map((mode) => ({
                value: mode,
                label: t(`idle_rules.location_mode_${mode}`),
              }))}
            />
          </Form.Item>
          {locationMode !== "ANY" && (
            <Form.Item
              name="locationValues"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <Select
                mode="multiple"
                options={placeOptions}
                optionFilterProp="label"
                placeholder={t("idle_rules.location_placeholder")}
              />
            </Form.Item>
          )}

          <FieldLabel>{t("idle_rules.action")}</FieldLabel>
          <Form.Item
            name="actionKind"
            extra={actionKind === "STANDBY" ? t("idle_rules.action_STANDBY_hint") : undefined}
          >
            <Select
              options={(["STANDBY", "MISSION"] as const).map((kind) => ({
                value: kind,
                label: t(`idle_rules.action_${kind}`),
              }))}
            />
          </Form.Item>
          {actionKind === "MISSION" && (
            <Form.Item
              name="missionTitleId"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <Select
                options={missionOptions}
                optionFilterProp="label"
                showSearch
                placeholder={t("utils.select")}
              />
            </Form.Item>
          )}

          <FieldGrid $cols={2}>
            <Field>
              <FieldLabel>{t("idle_rules.only_when_fleet_idle")}</FieldLabel>
              <Form.Item
                name="onlyWhenFleetIdle"
                valuePropName="checked"
                extra={t("idle_rules.only_when_fleet_idle_hint")}
              >
                <Switch />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("idle_rules.retry_label")}</FieldLabel>
              <Form.Item
                name="retrySec"
                extra={t("idle_rules.retry_hint")}
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <InputNumber
                  min={5}
                  max={3600}
                  precision={0}
                  suffix={t("idle_rules.seconds")}
                  style={{ width: 160 }}
                />
              </Form.Item>
            </Field>
          </FieldGrid>
        </Form>
      </Modal>
    </PanelShell>
  );
};

export default IdleRulePanel;
