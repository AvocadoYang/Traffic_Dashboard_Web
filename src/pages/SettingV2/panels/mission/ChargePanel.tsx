import { FC, useEffect, useMemo, useState } from "react";
import {
  Form,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Table,
  Tooltip,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { array, boolean, number, object, string } from "yup";
import client from "@/api/axiosClient";
import useCharge from "@/api/useCharge";
import useAllMissionTitles from "@/api/useMissionTitle";
import { Err } from "@/utils/responseErr";
import useIsNarrow from "../../ui/useIsNarrow";
import StatusTag from "../../ui/StatusTag";
import useAmrOptions from "../../ui/useAmrOptions";
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
  EmptyState,
  TableWrap,
  CardList,
  ItemCard,
  CardTitleRow,
  CardFacts,
  Tag,
  Hint,
} from "../../ui/primitives";

type ChargeRow = {
  id: string;
  active?: boolean | null;
  aggressiveThreshold?: number | null;
  fullThreshold?: number | null;
  availableGetTaskThreshold?: number | null;
  passiveThreshold?: number | null;
  aggressiveTriggerDelayMin?: number | null;
  availableGetTaskTriggerDelayMin?: number | null;
  passiveTriggerDelayMin?: number | null;
  amr?: { fullName?: string; id?: string; isReal?: boolean }[] | null;
  titleId?: string | null;
  title?: string | null;
};

type ChargeFormValues = {
  amrId: string[];
  taskId: string;
  aggressiveThreshold: number;
  passiveThreshold: number;
  fullThreshold: number;
  availableGetTaskThreshold: number;
  aggressiveTriggerDelayMin?: number;
  passiveTriggerDelayMin?: number;
  availableGetTaskTriggerDelayMin?: number;
};

const selectedSchema = object({
  id: string().required(),
  active: boolean().optional().nullable(),
  aggressiveThreshold: number().optional().nullable(),
  fullThreshold: number().optional().nullable(),
  availableGetTaskThreshold: number().optional().nullable(),
  passiveThreshold: number().optional().nullable(),
  aggressiveTriggerDelayMin: number().optional().nullable(),
  availableGetTaskTriggerDelayMin: number().optional().nullable(),
  passiveTriggerDelayMin: number().optional().nullable(),
  titleId: string().optional().nullable(),
  amr: array(
    object({
      fullName: string().optional(),
      id: string().optional(),
      isReal: boolean().optional(),
    }),
  ).optional(),
}).required();

const getSelectedCharge = async (id: string) => {
  const { data } = await client.get<unknown>(
    `api/setting/selected-charge?id=${id}`,
  );
  return selectedSchema.validate(data, { stripUnknown: true });
};

const ChargePanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const { data, isLoading, isFetching, refetch } = useCharge();
  const { data: missionTitle } = useAllMissionTitles();
  const amrOptions = useAmrOptions();

  const [editingId, setEditingId] = useState<string | null>(null);

  const rows = (data ?? []).filter(Boolean) as ChargeRow[];

  const { data: selected, isLoading: isLoadingSelected } = useQuery(
    ["select-charge", editingId],
    () => getSelectedCharge(editingId as string),
    { enabled: !!editingId },
  );

  /** 充電任務只能挑掛在 charge 分類底下的任務,跟一般任務不同 */
  const taskOptions = useMemo(
    () =>
      missionTitle
        ?.filter((g) =>
          g.MissionTitleBridgeCategory.some(
            (s) => s.Category?.tagName === "charge",
          ),
        )
        .map((v) => ({ value: v.id, label: v.name })) ?? [],
    [missionTitle],
  );

  useEffect(() => {
    if (!editingId || !selected) return;
    form.setFieldsValue({
      amrId: selected.amr?.map((r) => r.fullName) ?? [],
      taskId: selected.titleId ?? null,
      aggressiveThreshold: selected.aggressiveThreshold ?? null,
      passiveThreshold: selected.passiveThreshold ?? null,
      fullThreshold: selected.fullThreshold ?? null,
      availableGetTaskThreshold: selected.availableGetTaskThreshold ?? null,
      aggressiveTriggerDelayMin: selected.aggressiveTriggerDelayMin,
      passiveTriggerDelayMin: selected.passiveTriggerDelayMin,
      availableGetTaskTriggerDelayMin:
        selected.availableGetTaskTriggerDelayMin,
    });
  }, [form, editingId, selected]);

  const onError = (error: Err) =>
    void messageApi.error(error.response.data.message);

  const addMutation = useMutation({
    mutationFn: () => client.post("api/setting/add-charge-mission"),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
    },
    onError,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: ChargeFormValues & { id: string }) =>
      client.post("api/setting/save-charge-mission", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
      closeEdit();
    },
    onError,
  });

  const activeMutation = useMutation({
    mutationFn: (payload: { active: boolean; id: string; amrId: string[] }) =>
      client.post("api/setting/active-charge-mission", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
    },
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: { id: string; amrId: string[] }) =>
      client.post("api/setting/delete-charge-mission", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
    },
    onError,
  });

  const closeEdit = () => {
    setEditingId(null);
    form.resetFields();
  };

  const submit = async () => {
    if (!editingId) return;
    let v: ChargeFormValues;
    try {
      v = (await form.validateFields()) as ChargeFormValues;
    } catch {
      return;
    }

    // 這幾條門檻互相有大小關係,antd 的單欄位規則檢查不到,只能在這裡一起判
    if (
      typeof v.aggressiveThreshold !== "number" ||
      v.aggressiveThreshold <= 0
    ) {
      void messageApi.warning(t("mission.charge_mission.aggressive_warn"));
      return;
    }
    if (
      typeof v.fullThreshold !== "number" ||
      v.fullThreshold <= v.aggressiveThreshold
    ) {
      void messageApi.warning(
        t("mission.charge_mission.full_less_than_aggressive"),
      );
      return;
    }
    if (
      typeof v.availableGetTaskThreshold !== "number" ||
      v.availableGetTaskThreshold <= v.aggressiveThreshold
    ) {
      void messageApi.warning(
        t("mission.charge_mission.available_less_than_aggressive"),
      );
      return;
    }

    saveMutation.mutate({ ...v, id: editingId });
  };

  const amrNames = (row: ChargeRow) =>
    (row.amr ?? []).map((v) => v.fullName ?? "").filter(Boolean);

  const toggle = (row: ChargeRow) =>
    row.active ? (
      <GhostButton
        onClick={() =>
          activeMutation.mutate({
            active: false,
            id: row.id,
            amrId: amrNames(row),
          })
        }
      >
        <CloseCircleOutlined />
        {t("mission.charge_mission.stale")}
      </GhostButton>
    ) : (
      <GhostButton
        onClick={() =>
          activeMutation.mutate({
            active: true,
            id: row.id,
            amrId: amrNames(row),
          })
        }
      >
        <PlayCircleOutlined />
        {t("mission.charge_mission.executing")}
      </GhostButton>
    );

  /** 門檻 + 延遲觸發時間合併成一格顯示,省掉一半欄位 */
  const threshold = (pct?: number | null, delay?: number | null) => (
    <span style={{ whiteSpace: "nowrap" }}>
      {pct ?? "—"}%
      {delay !== undefined && delay !== null && (
        <>
          {" / "}
          {delay}
          {t("charge.unit_min")}
        </>
      )}
    </span>
  );

  const columns: TableColumnsType<ChargeRow> = [
    {
      title: t("charge.active"),
      key: "active",
      width: 90,
      fixed: "left",
      filters: [
        { text: t("mission.charge_mission.executing"), value: true },
        { text: t("mission.charge_mission.stale"), value: false },
      ],
      onFilter: (value, r) => !!r.active === value,
      render: (_, r) => (
        <StatusTag $on={!!r.active}>
          {r.active
            ? t("mission.charge_mission.executing")
            : t("mission.charge_mission.stale")}
        </StatusTag>
      ),
    },
    {
      title: t("charge.name"),
      dataIndex: "title",
      key: "title",
      width: 170,
      render: (v: string | null) => v || "—",
    },
    {
      title: t("charge.amrId"),
      key: "amr",
      width: 180,
      render: (_, r) =>
        amrNames(r).length
          ? amrNames(r).map((n) => <Tag key={n}>{n}</Tag>)
          : "—",
    },
    {
      title: t("charge.aggressive"),
      key: "aggressive",
      width: 120,
      render: (_, r) =>
        threshold(r.aggressiveThreshold, r.aggressiveTriggerDelayMin),
    },
    {
      title: t("charge.passiveThreshold"),
      key: "passive",
      width: 120,
      render: (_, r) =>
        threshold(r.passiveThreshold, r.passiveTriggerDelayMin),
    },
    {
      title: t("charge.available_get_task"),
      key: "available",
      width: 120,
      render: (_, r) =>
        threshold(
          r.availableGetTaskThreshold,
          r.availableGetTaskTriggerDelayMin,
        ),
    },
    {
      title: t("charge.full_rate"),
      dataIndex: "fullThreshold",
      key: "fullThreshold",
      width: 90,
      render: (v: number | null) => (v === null || v === undefined ? "—" : `${v}%`),
    },
    {
      title: "",
      key: "actions",
      width: 200,
      fixed: "right",
      render: (_, row) => (
        <Toolbar>
          {toggle(row)}
          <GhostButton onClick={() => setEditingId(row.id)}>
            <EditOutlined />
          </GhostButton>
          <Popconfirm
            title={t("utils.delete_warn")}
            okText={t("utils.confirm")}
            cancelText={t("utils.cancel")}
            onConfirm={() =>
              deleteMutation.mutate({ id: row.id, amrId: amrNames(row) })
            }
          >
            <DangerButton>
              <DeleteOutlined />
            </DangerButton>
          </Popconfirm>
        </Toolbar>
      ),
    },
  ];

  const labelWithTip = (label: string, tip: string) => (
    <FieldLabel>
      {label}{" "}
      <Tooltip title={tip}>
        <QuestionCircleOutlined />
      </Tooltip>
    </FieldLabel>
  );

  if (isLoading) return <Skeleton active />;

  return (
    <PanelShell>
      {contextHolder}

      <Section>
        <SectionTitle>
          <ThunderboltOutlined />
          {t("mission.charge_mission.charge_mission")}
        </SectionTitle>

        <Toolbar>
          <SolidButton
            onClick={() => addMutation.mutate()}
            disabled={addMutation.isLoading}
          >
            <PlusOutlined />
            {t("utils.add")}
          </SolidButton>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
        </Toolbar>

        <Hint>
          {t("charge.threshold_note_title")} {t("charge.threshold_note_desc")}
        </Hint>

        {rows.length === 0 ? (
          <EmptyState>NO CHARGE MISSIONS</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.id} $selected={row.id === editingId}>
                <CardTitleRow>
                  <span>{row.title || "—"}</span>
                  <StatusTag $on={!!row.active}>
                    {row.active
                      ? t("mission.charge_mission.executing")
                      : t("mission.charge_mission.stale")}
                  </StatusTag>
                </CardTitleRow>

                <CardFacts>
                  <dt>{t("charge.amrId")}</dt>
                  <dd>
                    {amrNames(row).length
                      ? amrNames(row).map((n) => <Tag key={n}>{n}</Tag>)
                      : "—"}
                  </dd>
                  <dt>{t("charge.aggressive")}</dt>
                  <dd>
                    {threshold(
                      row.aggressiveThreshold,
                      row.aggressiveTriggerDelayMin,
                    )}
                  </dd>
                  <dt>{t("charge.passiveThreshold")}</dt>
                  <dd>
                    {threshold(
                      row.passiveThreshold,
                      row.passiveTriggerDelayMin,
                    )}
                  </dd>
                  <dt>{t("charge.available_get_task")}</dt>
                  <dd>
                    {threshold(
                      row.availableGetTaskThreshold,
                      row.availableGetTaskTriggerDelayMin,
                    )}
                  </dd>
                  <dt>{t("charge.full_rate")}</dt>
                  <dd>
                    {row.fullThreshold === null ||
                    row.fullThreshold === undefined
                      ? "—"
                      : `${row.fullThreshold}%`}
                  </dd>
                </CardFacts>

                <Toolbar>
                  {toggle(row)}
                  <GhostButton onClick={() => setEditingId(row.id)}>
                    <EditOutlined />
                    {t("utils.edit")}
                  </GhostButton>
                  <Popconfirm
                    title={t("utils.delete_warn")}
                    okText={t("utils.confirm")}
                    cancelText={t("utils.cancel")}
                    onConfirm={() =>
                      deleteMutation.mutate({
                        id: row.id,
                        amrId: amrNames(row),
                      })
                    }
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
            <Table<ChargeRow>
              size="small"
              rowKey="id"
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              scroll={{ x: "max-content" }}
              rowClassName={(row: ChargeRow) =>
                row.id === editingId ? "ant-table-row-selected" : ""
              }
              pagination={{
                pageSize: 12,
                showTotal: (total) => `TOTAL ${total}`,
              }}
            />
          </TableWrap>
        )}
      </Section>

      <Modal
        open={!!editingId}
        title={t("mission.charge_mission.charge_mission")}
        onCancel={closeEdit}
        onOk={submit}
        confirmLoading={saveMutation.isLoading}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        width={640}
        destroyOnHidden
      >
        {isLoadingSelected ? (
          <Skeleton active />
        ) : (
          <Form form={form} layout="vertical" autoComplete="off">
            <FieldGrid $cols={2}>
              <Field>
                <FieldLabel>{t("charge.amrId")}</FieldLabel>
                <Form.Item
                  name="amrId"
                  rules={[
                    { required: true, message: t("charge.amrId_required") },
                  ]}
                >
                  <Select
                    mode="multiple"
                    options={amrOptions}
                    placeholder={t("charge.select_amr")}
                    showSearch={{
                      filterOption: (input, option) =>
                        (option?.label ?? "")
                          .toLowerCase()
                          .includes(input.toLowerCase()),
                    }}
                  />
                </Form.Item>
              </Field>

              <Field>
                <FieldLabel>{t("charge.name")}</FieldLabel>
                <Form.Item
                  name="taskId"
                  rules={[
                    { required: true, message: t("charge.task_required") },
                  ]}
                >
                  <Select
                    options={taskOptions}
                    placeholder={t("charge.select_task")}
                    showSearch={{
                      filterOption: (input, option) =>
                        (option?.label ?? "")
                          .toLowerCase()
                          .includes(input.toLowerCase()),
                    }}
                  />
                </Form.Item>
              </Field>
            </FieldGrid>

            <FieldLabel>{t("charge.section_threshold")}</FieldLabel>
            <FieldGrid $cols={2} style={{ marginTop: 8 }}>
              <Field>
                {labelWithTip(
                  t("charge.aggressive"),
                  t("charge.tooltip_aggressive"),
                )}
                <Form.Item name="aggressiveThreshold">
                  <InputNumber
                    min={0}
                    max={100}
                    addonAfter="%"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Field>

              <Field>
                {labelWithTip(
                  t("charge.passiveThreshold"),
                  t("charge.tooltip_passive"),
                )}
                <Form.Item name="passiveThreshold">
                  <InputNumber
                    min={0}
                    max={100}
                    addonAfter="%"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Field>

              <Field>
                {labelWithTip(t("charge.full_rate"), t("charge.tooltip_full"))}
                <Form.Item name="fullThreshold">
                  <InputNumber
                    min={0}
                    max={100}
                    addonAfter="%"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Field>

              <Field>
                {labelWithTip(
                  t("charge.available_get_task"),
                  t("charge.tooltip_available_get_task"),
                )}
                <Form.Item name="availableGetTaskThreshold">
                  <InputNumber
                    min={0}
                    max={100}
                    addonAfter="%"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Field>
            </FieldGrid>

            <FieldLabel>{t("charge.section_trigger_delay")}</FieldLabel>
            <FieldGrid $cols={3} style={{ marginTop: 8 }}>
              <Field>
                {labelWithTip(
                  t("charge.aggressiveTriggerDelayMin"),
                  t("charge.tooltip_aggressiveTriggerDelayMin"),
                )}
                <Form.Item name="aggressiveTriggerDelayMin">
                  <InputNumber
                    min={0}
                    addonAfter={t("charge.unit_min")}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Field>

              <Field>
                {labelWithTip(
                  t("charge.passiveTriggerDelayMin"),
                  t("charge.tooltip_passiveTriggerDelayMin"),
                )}
                <Form.Item name="passiveTriggerDelayMin">
                  <InputNumber
                    min={0}
                    addonAfter={t("charge.unit_min")}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Field>

              <Field>
                {labelWithTip(
                  t("charge.availableGetTaskTriggerDelayMin"),
                  t("charge.tooltip_availableGetTaskTriggerDelayMin"),
                )}
                <Form.Item name="availableGetTaskTriggerDelayMin">
                  <InputNumber
                    min={0}
                    addonAfter={t("charge.unit_min")}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Field>
            </FieldGrid>
          </Form>
        )}
      </Modal>
    </PanelShell>
  );
};

export default ChargePanel;
