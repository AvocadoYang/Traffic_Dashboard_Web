import { FC, useState } from "react";
import {
  Form,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Table,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  ApiOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import {
  SignalTriggerRow,
  useSignalTriggers,
} from "@/api/useSignalTriggers";
import {
  SignalCondition,
  SignalSources,
  isRefComplete,
  useSignalSources,
} from "@/api/useSignalSources";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import useIsNarrow from "../../ui/useIsNarrow";
import StatusTag from "../../ui/StatusTag";
import useAmrOptions from "../../ui/useAmrOptions";
import useNormalMissionOptions from "../../ui/useNormalMissionOptions";
import {
  ConditionListField,
  NoSignalSourcesHint,
  SignalLive,
  describeCondition,
} from "../../ui/signalFields";
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
  EmptyState,
  TableWrap,
  CardList,
  ItemCard,
  CardTitleRow,
  CardFacts,
  Tag,
  Hint,
} from "../../ui/primitives";

type EditValues = {
  amrId: string[];
  missionId: string;
  conditions: SignalCondition[];
  match: "all" | "any";
  holdSec: number;
};

/**
 * 設定 > 任務 > 訊號觸發任務: 研華模組 / 訊號程式的輸入點條件從「不成立」變成「成立」時派任務。
 * 欄位和操作照定時任務 (新增空白一筆 → 編輯 → 啟用)。
 */
const SignalTriggerPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<EditValues>();

  const { data, isLoading, isFetching, refetch } = useSignalTriggers();
  const { data: sources } = useSignalSources();
  const amrOptions = useAmrOptions();
  const missionOptions = useNormalMissionOptions();

  const [editingId, setEditingId] = useState<string | null>(null);
  const conditions = Form.useWatch("conditions", form) as SignalCondition[] | undefined;
  const rows = data ?? [];

  const onError = (e: ErrorResponse) => errorHandler(e, messageApi);
  const done = () => {
    void messageApi.success(t("utils.success"));
    void refetch();
  };

  const addMutation = useMutation({
    mutationFn: () => client.post("api/setting/add-signal-trigger"),
    onSuccess: done,
    onError,
  });
  const activeMutation = useMutation({
    mutationFn: (payload: { id: string; isActive: boolean }) =>
      client.post("api/setting/active-signal-trigger", payload),
    onSuccess: done,
    onError,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.post("api/setting/remove-signal-trigger", { id }),
    onSuccess: done,
    onError,
  });
  const updateMutation = useMutation({
    mutationFn: (payload: EditValues & { id: string }) =>
      client.post("api/setting/update-signal-trigger", payload),
    onSuccess: () => {
      done();
      closeEdit();
    },
    onError,
  });

  const closeEdit = () => {
    setEditingId(null);
    form.resetFields();
  };

  const openEdit = (row: SignalTriggerRow) => {
    form.setFieldsValue({
      amrId: row.amrId,
      missionId: row.missionId ?? undefined,
      conditions: row.conditions.length
        ? row.conditions
        : [{ source: "advantech", module: "", channel: 0, expect: true }],
      match: row.match,
      holdSec: row.holdSec,
    });
    setEditingId(row.id);
  };

  const submitEdit = async () => {
    if (!editingId) return;
    let values: EditValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    if (!values.conditions?.length || !values.conditions.every((c) => isRefComplete(c))) {
      void messageApi.warning(t("setting_v2.mission.signal.incomplete"));
      return;
    }
    updateMutation.mutate({
      id: editingId,
      amrId: values.amrId ?? [],
      missionId: values.missionId,
      conditions: values.conditions,
      match: values.match ?? "all",
      holdSec: values.holdSec ?? 0,
    });
  };

  const conditionText = (row: SignalTriggerRow, src: SignalSources | undefined) => {
    if (!row.conditions.length) return t("setting_v2.signal_trigger.no_condition");
    const join = row.match === "any" ? ` ${t("setting_v2.signal_trigger.or")} ` : ` ${t("setting_v2.signal_trigger.and")} `;
    const base = row.conditions.map((c) => describeCondition(c, src, t)).join(join);
    return row.holdSec > 0
      ? `${base} ${t("setting_v2.signal_trigger.hold_fact", { sec: row.holdSec })}`
      : base;
  };

  const nowTag = (row: SignalTriggerRow) => {
    const now = row.status?.now;
    if (!row.active || now === "off" || now === undefined) return null;
    return (
      <SignalLive $on={now}>
        {now === null
          ? t("setting_v2.signal_trigger.now_unknown")
          : now
          ? t("setting_v2.signal_trigger.now_met")
          : t("setting_v2.signal_trigger.now_not_met")}
      </SignalLive>
    );
  };

  const lastText = (row: SignalTriggerRow) =>
    row.status?.last
      ? `${dayjs(row.status.last.at).format("MM-DD HH:mm:ss")} ${row.status.last.text}`
      : "-";

  const cars = (row: SignalTriggerRow) =>
    row.amrId.length ? (
      row.amrId.map((a) => <Tag key={a}>{a}</Tag>)
    ) : (
      <Tag>{t("setting_v2.signal_trigger.any_car")}</Tag>
    );

  const toggle = (row: SignalTriggerRow) =>
    row.active ? (
      <GhostButton onClick={() => activeMutation.mutate({ id: row.id, isActive: false })}>
        <CloseCircleOutlined />
        {t("utils.inactive")}
      </GhostButton>
    ) : (
      <GhostButton onClick={() => activeMutation.mutate({ id: row.id, isActive: true })}>
        <PlayCircleOutlined />
        {t("utils.active")}
      </GhostButton>
    );

  const statusTag = (row: SignalTriggerRow) => (
    <StatusTag $on={row.active}>
      {row.active
        ? t("mission.schedule_mission.executing")
        : t("mission.schedule_mission.stale")}
    </StatusTag>
  );

  const columns: TableColumnsType<SignalTriggerRow> = [
    {
      title: t("mission.schedule_mission.status"),
      key: "active",
      width: 90,
      fixed: "left",
      render: (_, r) => statusTag(r),
    },
    {
      title: t("setting_v2.signal_trigger.condition"),
      key: "conditions",
      width: 280,
      render: (_, r) => (
        <span>
          {conditionText(r, sources)} {nowTag(r)}
        </span>
      ),
    },
    {
      title: t("mission.schedule_mission.car"),
      key: "amrId",
      width: 150,
      render: (_, r) => cars(r),
    },
    {
      title: t("mission.schedule_mission.mission"),
      key: "missionName",
      width: 180,
      render: (_, r) => r.missionName || t("setting_v2.signal_trigger.no_mission"),
    },
    {
      title: t("setting_v2.signal_trigger.last"),
      key: "last",
      width: 240,
      render: (_, r) => lastText(r),
    },
    {
      title: "",
      key: "actions",
      width: 190,
      fixed: "right",
      render: (_, row) => (
        <Toolbar>
          {toggle(row)}
          <GhostButton onClick={() => openEdit(row)}>
            <EditOutlined />
          </GhostButton>
          <Popconfirm
            title={t("utils.delete_warn")}
            okText={t("utils.confirm")}
            cancelText={t("utils.cancel")}
            onConfirm={() => deleteMutation.mutate(row.id)}
          >
            <DangerButton>
              <DeleteOutlined />
            </DangerButton>
          </Popconfirm>
        </Toolbar>
      ),
    },
  ];

  if (isLoading) return <Skeleton active />;

  return (
    <PanelShell>
      {contextHolder}

      <Section>
        <SectionTitle>
          <ApiOutlined />
          {t("toolbar.mission.signal_trigger")}
        </SectionTitle>

        <Toolbar>
          <SolidButton onClick={() => addMutation.mutate()} disabled={addMutation.isLoading}>
            <PlusOutlined />
            {t("utils.add")}
          </SolidButton>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
        </Toolbar>

        <Hint>{t("setting_v2.signal_trigger.hint")}</Hint>

        {rows.length === 0 ? (
          <EmptyState>{t("setting_v2.signal_trigger.empty")}</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.id}>
                <CardTitleRow>
                  <span>{row.missionName || t("setting_v2.signal_trigger.no_mission")}</span>
                  {statusTag(row)}
                </CardTitleRow>
                <CardFacts>
                  <dt>{t("setting_v2.signal_trigger.condition")}</dt>
                  <dd>
                    {conditionText(row, sources)} {nowTag(row)}
                  </dd>
                  <dt>{t("mission.schedule_mission.car")}</dt>
                  <dd>{cars(row)}</dd>
                  <dt>{t("setting_v2.signal_trigger.last")}</dt>
                  <dd>{lastText(row)}</dd>
                </CardFacts>
                <Toolbar>
                  {toggle(row)}
                  <GhostButton onClick={() => openEdit(row)}>
                    <EditOutlined />
                    {t("utils.edit")}
                  </GhostButton>
                  <Popconfirm
                    title={t("utils.delete_warn")}
                    okText={t("utils.confirm")}
                    cancelText={t("utils.cancel")}
                    onConfirm={() => deleteMutation.mutate(row.id)}
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
        ) : (
          <TableWrap>
            <Table<SignalTriggerRow>
              size="small"
              rowKey="id"
              dataSource={rows}
              columns={columns}
              scroll={{ x: "max-content" }}
              pagination={{
                pageSize: 12,
                showTotal: (total) => t("utils.total", { total }),
              }}
            />
          </TableWrap>
        )}
      </Section>

      <Modal
        open={!!editingId}
        title={t("toolbar.mission.signal_trigger")}
        onCancel={closeEdit}
        onOk={submitEdit}
        confirmLoading={updateMutation.isLoading}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        width={720}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <NoSignalSourcesHint sources={sources} />

          <Field as="div">
            <FieldLabel>{t("setting_v2.signal_trigger.condition")}</FieldLabel>
            <ConditionListField name="conditions" sources={sources} />
          </Field>

          {(conditions?.length ?? 0) > 1 && (
            <Field as="div">
              <FieldLabel>{t("setting_v2.mission.signal.match")}</FieldLabel>
              <Form.Item name="match" initialValue="all">
                <Select
                  options={[
                    { value: "all", label: t("setting_v2.mission.signal.match_all") },
                    { value: "any", label: t("setting_v2.mission.signal.match_any") },
                  ]}
                />
              </Form.Item>
            </Field>
          )}

          <Field as="div">
            <FieldLabel>{t("setting_v2.mission.signal.hold_sec")}</FieldLabel>
            <Form.Item name="holdSec" initialValue={0} extra={t("setting_v2.mission.signal.hold_hint")}>
              <InputNumber min={0} max={86400} precision={0} style={{ width: 160 }} />
            </Form.Item>
          </Field>

          <Field as="div">
            <FieldLabel>{t("mission.schedule_mission.mission")}</FieldLabel>
            <Form.Item
              name="missionId"
              rules={[{ required: true, message: t("mission.schedule_mission.mission_required") }]}
            >
              <Select
                options={missionOptions}
                showSearch={{
                  filterOption: (input, option) =>
                    (option?.label ?? "").toLowerCase().includes(input.toLowerCase()),
                }}
              />
            </Form.Item>
          </Field>

          <Field as="div">
            <FieldLabel>{t("mission.schedule_mission.car")}</FieldLabel>
            <Form.Item name="amrId" extra={t("setting_v2.signal_trigger.car_hint")}>
              <Select
                mode="multiple"
                options={amrOptions}
                placeholder={t("setting_v2.signal_trigger.any_car")}
              />
            </Form.Item>
          </Field>
        </Form>
      </Modal>
    </PanelShell>
  );
};

export default SignalTriggerPanel;
