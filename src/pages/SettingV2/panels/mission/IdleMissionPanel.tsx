import { FC } from "react";
import {
  Form,
  InputNumber,
  Popconfirm,
  Select,
  Skeleton,
  Table,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { array, boolean, number, object, string } from "yup";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import useIsNarrow from "../../ui/useIsNarrow";
import StatusTag from "../../ui/StatusTag";
import useAmrOptions from "../../ui/useAmrOptions";
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
  EmptyState,
  TableWrap,
  CardList,
  ItemCard,
  CardTitleRow,
  CardFacts,
  Tag,
} from "../../ui/primitives";

type IdleRow = {
  id: string;
  idleMin: number;
  active: boolean;
  preventLocation: (string | undefined)[] | null;
  taskName: string;
  taskId: string;
  amr: { isReal?: boolean; fullName?: string; id?: string }[] | null;
};

type SubmitPayload = {
  amrId: string[];
  missionId: string;
  preventLocation: string[] | null;
  idle_min: number;
};

const idleSchema = array(
  object({
    id: string().required(),
    idleMin: number().required(),
    active: boolean().required(),
    preventLocation: array(string().optional()).optional().nullable(),
    taskName: string().required(),
    taskId: string().required(),
    amr: array(
      object({
        fullName: string().optional(),
        id: string().optional(),
        isReal: boolean().optional(),
      }),
    )
      .optional()
      .nullable(),
  }).required(),
).required();

const getIdleTasks = async () => {
  const { data } = await client.get<unknown>("api/setting/idle-task");
  return idleSchema.validate(data, { stripUnknown: true });
};

const locSelectSchema = array(
  object({ label: string().optional(), value: string().optional() }),
).optional();

const getIdleLocations = async () => {
  const { data } = await client.get<unknown>(
    "api/setting/idle-task-loc-selection",
  );
  return locSelectSchema.validate(data, { stripUnknown: true });
};

const IdleMissionPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery(["idle-task"], getIdleTasks);
  const { data: locOptions, isLoading: isLoadingLoc } = useQuery(
    ["idle-task-selection"],
    getIdleLocations,
  );
  const amrOptions = useAmrOptions();
  const missionOptions = useNormalMissionOptions();

  const rows = (data ?? []) as IdleRow[];

  const addMutation = useMutation({
    mutationFn: (payload: SubmitPayload) =>
      client.post("api/setting/add-idle-task", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
      form.resetFields();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const activeMutation = useMutation({
    mutationFn: (payload: { idle_id: string; isActive: boolean }) =>
      client.post("api/setting/active-idle-task", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (idle_id: string) =>
      client.post("api/setting/delete-idle-task", { idle_id }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const submit = async () => {
    let values: SubmitPayload;
    try {
      values = (await form.validateFields()) as SubmitPayload;
    } catch {
      return;
    }
    addMutation.mutate(values);
  };

  const toggle = (row: IdleRow) =>
    row.active ? (
      <GhostButton
        onClick={() =>
          activeMutation.mutate({ idle_id: row.id, isActive: false })
        }
      >
        <CloseCircleOutlined />
        {t("mission.idle_mission.stale")}
      </GhostButton>
    ) : (
      <GhostButton
        onClick={() =>
          activeMutation.mutate({ idle_id: row.id, isActive: true })
        }
      >
        <PlayCircleOutlined />
        {t("mission.idle_mission.executing")}
      </GhostButton>
    );

  const columns: TableColumnsType<IdleRow> = [
    {
      title: t("mission.idle_mission.status"),
      key: "active",
      width: 90,
      fixed: "left",
      filters: [
        { text: t("mission.idle_mission.executing"), value: true },
        { text: t("mission.idle_mission.stale"), value: false },
      ],
      onFilter: (value, r) => r.active === value,
      render: (_, r) => (
        <StatusTag $on={r.active}>
          {r.active
            ? t("mission.idle_mission.executing")
            : t("mission.idle_mission.stale")}
        </StatusTag>
      ),
    },
    {
      title: t("mission.idle_mission.car"),
      key: "amr",
      width: 170,
      render: (_, r) =>
        r.amr?.length
          ? r.amr.map((a, i) => <Tag key={`${a.id ?? i}`}>{a.fullName}</Tag>)
          : "—",
    },
    {
      title: t("mission.idle_mission.idle_min"),
      dataIndex: "idleMin",
      key: "idleMin",
      width: 100,
      sorter: (a, b) => a.idleMin - b.idleMin,
      render: (v: number) => `${v} ${t("utils.minutes")}`,
    },
    {
      title: t("mission.idle_mission.mission"),
      dataIndex: "taskName",
      key: "taskName",
      width: 180,
    },
    {
      title: t("mission.idle_mission.forbidden"),
      key: "preventLocation",
      width: 200,
      render: (_, r) =>
        r.preventLocation?.length
          ? r.preventLocation.map((loc, i) => <Tag key={`${loc}-${i}`}>{loc}</Tag>)
          : t("utils.none"),
    },
    {
      title: "",
      key: "actions",
      width: 170,
      fixed: "right",
      render: (_, row) => (
        <Toolbar>
          {toggle(row)}
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
          <ClockCircleOutlined />
          {t("mission.idle_mission.idle_mission")}
        </SectionTitle>

        <Form form={form} layout="vertical" autoComplete="off">
          <FieldGrid $cols={2}>
            <Field>
              <FieldLabel>{t("mission.idle_mission.car")}</FieldLabel>
              <Form.Item
                name="amrId"
                rules={[
                  {
                    required: true,
                    message: t("mission.idle_mission.amr_warn"),
                  },
                ]}
              >
                <Select
                  mode="multiple"
                  options={amrOptions}
                  placeholder={t("utils.select")}
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
              <FieldLabel>{t("mission.idle_mission.idle_min")}</FieldLabel>
              <Form.Item
                name="idle_min"
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <InputNumber
                  min={0.5}
                  step={0.5}
                  addonAfter={t("utils.minutes")}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>{t("mission.idle_mission.forbidden")}</FieldLabel>
              <Form.Item
                name="preventLocation"
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <Select
                  mode="multiple"
                  options={locOptions}
                  loading={isLoadingLoc}
                  placeholder={t("utils.select")}
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
              <FieldLabel>{t("mission.idle_mission.mission")}</FieldLabel>
              <Form.Item
                name="missionId"
                rules={[
                  {
                    required: true,
                    message: t("mission.idle_mission.mission_name_warn"),
                  },
                ]}
              >
                <Select
                  options={missionOptions}
                  placeholder={t("utils.select")}
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
        </Form>

        <Toolbar>
          <SolidButton onClick={submit} disabled={addMutation.isLoading}>
            <PlusOutlined />
            {t("utils.add")}
          </SolidButton>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
        </Toolbar>
      </Section>

      <Section>
        <SectionTitle>
          <ClockCircleOutlined />
          {t("utils.missions")}
        </SectionTitle>

        {rows.length === 0 ? (
          <EmptyState>NO IDLE MISSIONS</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.id}>
                <CardTitleRow>
                  <span>{row.taskName}</span>
                  <StatusTag $on={row.active}>
                    {row.active
                      ? t("mission.idle_mission.executing")
                      : t("mission.idle_mission.stale")}
                  </StatusTag>
                </CardTitleRow>

                <CardFacts>
                  <dt>{t("mission.idle_mission.car")}</dt>
                  <dd>
                    {row.amr?.length
                      ? row.amr.map((a, i) => (
                          <Tag key={`${a.id ?? i}`}>{a.fullName}</Tag>
                        ))
                      : "—"}
                  </dd>
                  <dt>{t("mission.idle_mission.idle_min")}</dt>
                  <dd>
                    {row.idleMin} {t("utils.minutes")}
                  </dd>
                  <dt>{t("mission.idle_mission.forbidden")}</dt>
                  <dd>
                    {row.preventLocation?.length
                      ? row.preventLocation.map((loc, i) => (
                          <Tag key={`${loc}-${i}`}>{loc}</Tag>
                        ))
                      : t("utils.none")}
                  </dd>
                </CardFacts>

                <Toolbar>
                  {toggle(row)}
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
            <Table<IdleRow>
              size="small"
              rowKey="id"
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              scroll={{ x: "max-content" }}
              pagination={{
                pageSize: 12,
                showTotal: (total) => `TOTAL ${total}`,
              }}
            />
          </TableWrap>
        )}
      </Section>
    </PanelShell>
  );
};

export default IdleMissionPanel;
