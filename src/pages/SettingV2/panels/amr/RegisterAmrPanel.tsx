import { FC, useMemo, useState } from "react";
import {
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Skeleton,
  Table,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  CarOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useRegisterAmr from "@/api/useRegisterAmr";
import useAMRsample from "@/api/useAMRsample";
import { Err } from "@/utils/responseErr";
import useIsNarrow from "../../ui/useIsNarrow";
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
  EmptyState,
  TableWrap,
  CardList,
  ItemCard,
  CardTitleRow,
  CardFacts,
  Tag,
  Hint,
} from "../../ui/primitives";

/** 只有這個機種要另外填 IP,其他機種送出時會把 ip 拿掉避免髒資料 */
const IP_REQUIRED_TYPE = "anfa-mi15-10";

type RegisterRow = {
  id: string;
  full_name: string;
  serialNum: string;
  is_enable: boolean;
  ip?: string | null;
  Robot_type: { id: string; name: string; value: string };
};

type SubmitPayload = {
  id?: string;
  robot_type: string;
  full_name: string;
  serialNum: string;
  ip?: string;
};

const macRule = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
const ipv4Rule =
  /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

const RegisterAmrPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const { data, isLoading, isFetching, refetch } = useRegisterAmr();
  const { data: robotTypes } = useAMRsample();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const selectedType = Form.useWatch("robot_type", form) as string | undefined;

  const rows = useMemo(() => {
    const all = (data ?? []) as RegisterRow[];
    const keyword = search.trim().toLowerCase();
    if (!keyword) return all;
    return all.filter(
      (r) =>
        r.full_name.toLowerCase().includes(keyword) ||
        r.serialNum.toLowerCase().includes(keyword),
    );
  }, [data, search]);

  const robotTypeOptions = useMemo(
    () => robotTypes?.map((v) => ({ label: v.name, value: v.value })) ?? [],
    [robotTypes],
  );

  const invalidate = () =>
    queryClient.refetchQueries({ queryKey: ["all-register-amr"] });

  const onError = (error: Err) =>
    void messageApi.error(error.response.data.message);

  const createMutation = useMutation({
    mutationFn: (payload: SubmitPayload) =>
      client.post("api/setting/create-register-robot", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void invalidate();
      form.resetFields();
    },
    onError,
  });

  const editMutation = useMutation({
    mutationFn: (payload: SubmitPayload) =>
      client.post("api/setting/edit-register-robot", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void invalidate();
      cancelEdit();
    },
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      client.post("api/setting/delete-register-robot", { id }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void invalidate();
    },
    onError,
  });

  const enableMutation = useMutation({
    mutationFn: (payload: { id: string; isEnable: boolean }) =>
      client.post("api/setting/enable-register-robot", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void invalidate();
    },
    onError,
  });

  const cancelEdit = () => {
    setEditingId(null);
    form.resetFields();
  };

  const startEdit = (row: RegisterRow) => {
    // 車輛全名存的是「機種-003」,表單只讓使用者改後面的編號
    const parts = row.full_name.split("-");
    form.setFieldsValue({
      robot_type: row.Robot_type.value,
      full_name: Number(parts[parts.length - 1]),
      serialNum: row.serialNum,
      ip: row.Robot_type.value === IP_REQUIRED_TYPE ? (row.ip ?? "") : undefined,
    });
    setEditingId(row.id);
  };

  const submit = async () => {
    let values: SubmitPayload;
    try {
      values = (await form.validateFields()) as SubmitPayload;
    } catch {
      return;
    }

    const paddedName = String(values.full_name).padStart(3, "0");
    const ip = values.robot_type === IP_REQUIRED_TYPE ? values.ip : undefined;

    const payload: SubmitPayload = {
      full_name: `${values.robot_type}-${paddedName}`,
      serialNum: values.serialNum,
      robot_type: values.robot_type,
      ...(ip && { ip }),
    };

    if (editingId) {
      editMutation.mutate({ ...payload, id: editingId });
      return;
    }
    createMutation.mutate(payload);
  };

  const statusTag = (enabled: boolean) => (
    <StatusTag $on={enabled}>
      {enabled
        ? t("setting_amr.register_amr.executing")
        : t("setting_amr.register_amr.stale")}
    </StatusTag>
  );

  const toggleRow = (row: RegisterRow) =>
    row.is_enable ? (
      <GhostButton
        onClick={() => enableMutation.mutate({ id: row.id, isEnable: false })}
      >
        <CloseCircleOutlined />
        {t("utils.inactive")}
      </GhostButton>
    ) : (
      <GhostButton
        onClick={() => enableMutation.mutate({ id: row.id, isEnable: true })}
      >
        <PlayCircleOutlined />
        {t("utils.active")}
      </GhostButton>
    );

  const columns: TableColumnsType<RegisterRow> = [
    {
      title: t("utils.status"),
      key: "is_enable",
      width: 90,
      fixed: "left",
      filters: [
        { text: t("setting_amr.register_amr.executing"), value: true },
        { text: t("setting_amr.register_amr.stale"), value: false },
      ],
      onFilter: (value, r) => r.is_enable === value,
      render: (_, r) => statusTag(r.is_enable),
    },
    {
      title: t("setting_amr.register_amr.amr_name"),
      dataIndex: "full_name",
      key: "full_name",
      width: 150,
      sorter: (a, b) => a.full_name.localeCompare(b.full_name),
    },
    {
      title: t("setting_amr.register_amr.serial_number"),
      dataIndex: "serialNum",
      key: "serialNum",
      width: 160,
    },
    {
      title: t("setting_amr.register_amr.type"),
      key: "robot_type",
      width: 120,
      render: (_, r) => <Tag>{r.Robot_type.name}</Tag>,
    },
    {
      title: "IP",
      dataIndex: "ip",
      key: "ip",
      width: 130,
      render: (v: string | null) => v || "—",
    },
    {
      title: "",
      key: "actions",
      width: 180,
      fixed: "right",
      render: (_, row) => (
        <Toolbar>
          {toggleRow(row)}
          <GhostButton onClick={() => startEdit(row)}>
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
          <CarOutlined />
          {editingId
            ? `${t("utils.edit")} — ${t("setting_amr.register_amr.title_name")}`
            : t("setting_amr.register_amr.title_name")}
        </SectionTitle>

        <Form form={form} layout="vertical" autoComplete="off">
          <FieldGrid $cols={2}>
            <Field>
              <FieldLabel>{t("setting_amr.register_amr.type")}</FieldLabel>
              <Form.Item
                name="robot_type"
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <Select
                  options={robotTypeOptions}
                  placeholder={t("utils.select")}
                  onChange={(v: string) => {
                    // 換成不需要 IP 的機種時,把殘留的 IP 清掉
                    if (v !== IP_REQUIRED_TYPE) {
                      form.setFieldValue("ip", undefined);
                    }
                  }}
                />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>{t("setting_amr.register_amr.amr_name")}</FieldLabel>
              <Form.Item
                name="full_name"
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <InputNumber
                  placeholder="002"
                  min={1}
                  max={999}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>
                {t("setting_amr.register_amr.serial_number")}
              </FieldLabel>
              <Form.Item
                name="serialNum"
                rules={[
                  { required: true, message: t("utils.required") },
                  {
                    pattern: macRule,
                    message: t("setting_amr.register_amr.invalid_serial_number"),
                  },
                ]}
              >
                <Input placeholder="58:11:22:3f:f3:b7" />
              </Form.Item>
            </Field>

            {selectedType === IP_REQUIRED_TYPE && (
              <Field>
                <FieldLabel>IP</FieldLabel>
                <Form.Item
                  name="ip"
                  rules={[
                    { required: true, message: t("utils.required") },
                    { pattern: ipv4Rule, message: "INVALID IP ADDRESS" },
                  ]}
                >
                  <Input placeholder="192.168.1.1" />
                </Form.Item>
              </Field>
            )}
          </FieldGrid>
        </Form>

        <Toolbar>
          <SolidButton
            onClick={submit}
            disabled={createMutation.isLoading || editMutation.isLoading}
          >
            {editingId ? <SaveOutlined /> : <PlusOutlined />}
            {editingId ? t("utils.save") : t("utils.add")}
          </SolidButton>
          {editingId && (
            <GhostButton onClick={cancelEdit}>{t("utils.cancel")}</GhostButton>
          )}
        </Toolbar>

        <Hint>
          車輛全名會自動組成「機種-編號」,編號不足三位會補零(例如 2 → 002)。
        </Hint>
      </Section>

      <Section>
        <SectionTitle>
          <CarOutlined />
          {t("toolbar.amr_setting.register_amr")}
        </SectionTitle>

        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={`${t("utils.search")} ${t("setting_amr.register_amr.amr_name")}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Toolbar>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState>NO ROBOTS</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.id} $selected={row.id === editingId}>
                <CardTitleRow>
                  <span>{row.full_name}</span>
                  {statusTag(row.is_enable)}
                </CardTitleRow>

                <CardFacts>
                  <dt>{t("setting_amr.register_amr.serial_number")}</dt>
                  <dd>{row.serialNum}</dd>
                  <dt>{t("setting_amr.register_amr.type")}</dt>
                  <dd>{row.Robot_type.name}</dd>
                  <dt>IP</dt>
                  <dd>{row.ip || "—"}</dd>
                </CardFacts>

                <Toolbar>
                  {toggleRow(row)}
                  <GhostButton onClick={() => startEdit(row)}>
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
            <Table<RegisterRow>
              size="small"
              rowKey="id"
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              scroll={{ x: "max-content" }}
              rowClassName={(row: RegisterRow) =>
                row.id === editingId ? "ant-table-row-selected" : ""
              }
              pagination={{
                pageSize: 12,
                showSizeChanger: true,
                showTotal: (total) => `TOTAL ${total}`,
              }}
            />
          </TableWrap>
        )}
      </Section>
    </PanelShell>
  );
};

export default RegisterAmrPanel;
