import { FC, useState } from "react";
import {
  Checkbox,
  Form,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Switch,
  Table,
  TimePicker,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  ClockCircleOutlined,
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
import useSchedule from "@/api/useSchedule";
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

const TIME_FORMAT = "HH:mm";

type ScheduleRow = {
  id: string;
  active: boolean;
  amrId: string[];
  /** 格式是「星期字串-時-分」,例如 "135-08-30" 代表一三五 08:30 */
  schedule: string;
  missionId: string;
  missionName: string;
  /** 有值 = 從開始時間每幾分鐘派一次, 派到 repeatUntil; null = 只派一次 */
  repeatEveryMin?: number | null;
  repeatUntil?: string | null;
};

type UpdatePayload = {
  id: string;
  schedule: string;
  missionId: string;
  amrId: string[];
  repeatEveryMin: number | null;
  repeatUntil: string | null;
};

const SchedulePanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const { data, isLoading, isFetching, refetch } = useSchedule();
  const amrOptions = useAmrOptions();
  const missionOptions = useNormalMissionOptions();

  const [editingId, setEditingId] = useState<string | null>(null);
  const repeat = Form.useWatch("repeat", form) as boolean | undefined;

  const rows = (data ?? []) as ScheduleRow[];

  const weekOptions = Array.from({ length: 7 }, (_v, i) => i + 1).map((v) => ({
    label: t("mission.schedule_mission.week_n", { n: v }),
    value: v,
  }));

  const addMutation = useMutation({
    mutationFn: () => client.post("api/setting/add-schedule"),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const activeMutation = useMutation({
    mutationFn: (payload: { id: string; isActive: boolean }) =>
      client.post("api/setting/active-schedule", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.post("api/setting/remove-schedule", { id }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdatePayload) =>
      client.post("api/setting/update-schedule", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
      closeEdit();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const closeEdit = () => {
    setEditingId(null);
    form.resetFields();
  };

  const openEdit = (row: ScheduleRow) => {
    const [day, hour, minute] = row.schedule.split("-");
    form.setFieldsValue({
      amrId: row.amrId,
      missionId: row.missionId,
      day: day.split("").map((d) => parseInt(d, 10)),
      time: dayjs(`${hour}:${minute}`, TIME_FORMAT),
      repeat: !!row.repeatEveryMin,
      repeatEveryMin: row.repeatEveryMin ?? 30,
      repeatUntil: row.repeatUntil ? dayjs(row.repeatUntil, TIME_FORMAT) : null,
    });
    setEditingId(row.id);
  };

  const submitEdit = async () => {
    if (!editingId) return;
    let values: {
      amrId: string[];
      missionId: string;
      day: number[];
      time: dayjs.Dayjs;
      repeat?: boolean;
      repeatEveryMin?: number | null;
      repeatUntil?: dayjs.Dayjs | null;
    };
    try {
      values = (await form.validateFields()) as typeof values;
    } catch {
      return;
    }
    updateMutation.mutate({
      id: editingId,
      // 後端吃的是「星期連成一串-時-分」,例如 [1,3,5] + 08:30 → "135-08-30"
      schedule: `${values.day.join("")}-${values.time.format("HH")}-${values.time.format("mm")}`,
      missionId: values.missionId,
      amrId: values.amrId,
      repeatEveryMin: values.repeat ? values.repeatEveryMin ?? null : null,
      repeatUntil:
        values.repeat && values.repeatUntil ? values.repeatUntil.format(TIME_FORMAT) : null,
    });
  };

  const readableSchedule = (row: ScheduleRow) => {
    const [week, hour, minute] = row.schedule.split("-");
    const base = `${t("mission.schedule_mission.week")} ${week.split("").join(", ")} · ${hour}:${minute}`;
    if (!row.repeatEveryMin) return base;
    return `${base} ${t("time_condition.repeat_fact", {
      min: row.repeatEveryMin,
      until: row.repeatUntil ?? "23:59",
    })}`;
  };

  const toggle = (row: ScheduleRow) =>
    row.active ? (
      <GhostButton
        onClick={() => activeMutation.mutate({ id: row.id, isActive: false })}
      >
        <CloseCircleOutlined />
        {t("utils.inactive")}
      </GhostButton>
    ) : (
      <GhostButton
        onClick={() => activeMutation.mutate({ id: row.id, isActive: true })}
      >
        <PlayCircleOutlined />
        {t("utils.active")}
      </GhostButton>
    );

  const columns: TableColumnsType<ScheduleRow> = [
    {
      title: t("mission.schedule_mission.status"),
      key: "active",
      width: 90,
      fixed: "left",
      filters: [
        { text: t("mission.schedule_mission.executing"), value: true },
        { text: t("mission.schedule_mission.stale"), value: false },
      ],
      onFilter: (value, r) => r.active === value,
      render: (_, r) => (
        <StatusTag $on={r.active}>
          {r.active
            ? t("mission.schedule_mission.executing")
            : t("mission.schedule_mission.stale")}
        </StatusTag>
      ),
    },
    {
      title: t("mission.schedule_mission.what_time"),
      dataIndex: "schedule",
      key: "schedule",
      width: 190,
      sorter: (a, b) =>
        Number(a.schedule.split("-")[1]) - Number(b.schedule.split("-")[1]),
      render: (_: string, row) => readableSchedule(row),
    },
    {
      title: t("mission.schedule_mission.car"),
      key: "amrId",
      width: 170,
      render: (_, r) => r.amrId.map((a) => <Tag key={a}>{a}</Tag>),
    },
    {
      title: t("mission.schedule_mission.mission"),
      dataIndex: "missionName",
      key: "missionName",
      width: 200,
      sorter: (a, b) => a.missionName.localeCompare(b.missionName),
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
          <ClockCircleOutlined />
          {t("mission.schedule_mission.schedule_mission")}
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
          {t("setting_v2.mission.schedule_hint")}
        </Hint>

        {rows.length === 0 ? (
          <EmptyState>{t("setting_v2.empty.schedules")}</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.id}>
                <CardTitleRow>
                  <span>{row.missionName}</span>
                  <StatusTag $on={row.active}>
                    {row.active
                      ? t("mission.schedule_mission.executing")
                      : t("mission.schedule_mission.stale")}
                  </StatusTag>
                </CardTitleRow>

                <CardFacts>
                  <dt>{t("mission.schedule_mission.what_time")}</dt>
                  <dd>{readableSchedule(row)}</dd>
                  <dt>{t("mission.schedule_mission.car")}</dt>
                  <dd>
                    {row.amrId.map((a) => (
                      <Tag key={a}>{a}</Tag>
                    ))}
                  </dd>
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
            <Table<ScheduleRow>
              size="small"
              rowKey="id"
              dataSource={rows}
              columns={columns}
              loading={isFetching}
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
        title={t("mission.schedule_mission.schedule_mission")}
        onCancel={closeEdit}
        onOk={submitEdit}
        confirmLoading={updateMutation.isLoading}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
          initialValues={{ time: dayjs("12:08", TIME_FORMAT) }}
        >
          <Field>
            <FieldLabel>{t("mission.schedule_mission.car")}</FieldLabel>
            <Form.Item
              name="amrId"
              rules={[
                {
                  required: true,
                  message: t("mission.schedule_mission.car_required"),
                },
              ]}
            >
              <Select mode="multiple" options={amrOptions} />
            </Form.Item>
          </Field>

          <Field>
            <FieldLabel>{t("mission.schedule_mission.mission")}</FieldLabel>
            <Form.Item
              name="missionId"
              rules={[
                {
                  required: true,
                  message: t("mission.schedule_mission.mission_required"),
                },
              ]}
            >
              <Select
                options={missionOptions}
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
            <FieldLabel>{t("mission.schedule_mission.week")}</FieldLabel>
            <Form.Item
              name="day"
              rules={[
                {
                  required: true,
                  message: t("mission.schedule_mission.week_required"),
                },
              ]}
            >
              <Checkbox.Group options={weekOptions} />
            </Form.Item>
          </Field>

          <Field>
            <FieldLabel>{t("mission.schedule_mission.what_time")}</FieldLabel>
            <Form.Item
              name="time"
              rules={[
                {
                  required: true,
                  message: t("mission.schedule_mission.time_required"),
                },
              ]}
            >
              <TimePicker
                needConfirm={false}
                format={TIME_FORMAT}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Field>

          <Field>
            <FieldLabel>{t("time_condition.repeat")}</FieldLabel>
            <Form.Item name="repeat" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Field>

          {repeat && (
            <>
              <Field>
                <FieldLabel>{t("time_condition.repeat_every")}</FieldLabel>
                <Form.Item
                  name="repeatEveryMin"
                  rules={[{ required: true, message: t("utils.required") }]}
                >
                  <InputNumber
                    min={1}
                    max={1440}
                    precision={0}
                    suffix={t("utils.minutes")}
                    style={{ width: 160 }}
                  />
                </Form.Item>
              </Field>
              <Field>
                <FieldLabel>{t("time_condition.repeat_until")}</FieldLabel>
                <Form.Item name="repeatUntil" extra={t("time_condition.repeat_hint")}>
                  <TimePicker
                    needConfirm={false}
                    format={TIME_FORMAT}
                    placeholder="23:59"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Field>
            </>
          )}
        </Form>
      </Modal>
    </PanelShell>
  );
};

export default SchedulePanel;
