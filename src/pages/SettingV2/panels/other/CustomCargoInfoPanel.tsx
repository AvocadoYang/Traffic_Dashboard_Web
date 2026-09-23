import { FC, useState } from "react";
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Switch,
  Table,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  InboxOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
} from "@ant-design/icons";
import ReactJsonView from "@uiw/react-json-view";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useCustomCargoFormat from "@/api/useCustomCargoFormat";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import useIsNarrow from "../../ui/useIsNarrow";
import StatusTag from "../../ui/StatusTag";
import { c } from "../../ui/tokens";
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
  Hint,
} from "../../ui/primitives";

type CargoFormatRow = {
  id: string;
  custom_name: string;
  is_default: boolean;
  format?: string;
  unique_key: string;
};

/** 表單裡的欄位清單長這樣,送出前才攤平成 { key: type } 的物件 */
type FieldPair = { key: string; value: string };

type FormValues = {
  custom_name: string;
  is_default?: boolean;
  format: FieldPair[];
  unique_key: string;
};

const TYPE_OPTIONS = [
  { value: "string", label: "string" },
  { value: "number", label: "number" },
  { value: "boolean", label: "boolean" },
];

const safeParse = (raw?: string): Record<string, string> => {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
};

const CustomCargoInfoPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const { data, isLoading, isFetching, refetch } = useCustomCargoFormat();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CargoFormatRow | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);

  const formatFields = Form.useWatch("format", form) as
    | FieldPair[]
    | undefined;

  const rows = (data ?? []).filter(Boolean) as CargoFormatRow[];

  const invalidate = () => {
    void queryClient.refetchQueries({ queryKey: ["custom-cargo-format"] });
    void refetch();
  };

  const createMutation = useMutation({
    mutationFn: (payload: {
      custom_name: string;
      format: string;
      unique_key: string;
    }) => client.post("/api/setting/create-custom-cargo-format", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      invalidate();
      close();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const editMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      is_default: boolean;
      custom_name: string;
      format: string;
    }) => client.post("/api/setting/edit-custom-cargo-format", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      invalidate();
      close();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      client.post("/api/setting/delete-custom-cargo-format", { id }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      invalidate();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const close = () => {
    form.resetFields();
    setEditing(null);
    setOpen(false);
  };

  const openCreate = () => {
    form.resetFields();
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (row: CargoFormatRow) => {
    form.setFieldsValue({
      custom_name: row.custom_name,
      is_default: row.is_default,
      unique_key: row.unique_key,
      format: Object.entries(safeParse(row.format)).map(([key, value]) => ({
        key,
        value,
      })),
    });
    setEditing(row);
    setOpen(true);
  };

  const submit = async () => {
    let values: FormValues;
    try {
      values = (await form.validateFields()) as FormValues;
    } catch {
      return;
    }

    const format = JSON.stringify(
      values.format.reduce<Record<string, string>>((acc, item) => {
        if (item.key) acc[item.key] = item.value;
        return acc;
      }, {}),
    );

    if (editing) {
      editMutation.mutate({
        id: editing.id,
        custom_name: values.custom_name,
        is_default: values.is_default ?? false,
        format,
      });
      return;
    }
    createMutation.mutate({
      custom_name: values.custom_name,
      format,
      unique_key: values.unique_key,
    });
  };

  const toggleCard = (id: string) =>
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );

  const jsonView = (row: CargoFormatRow) => (
    <div style={{ background: c.bgSubtle, padding: 12, border: `1px solid ${c.border}` }}>
      <ReactJsonView
        displayDataTypes={false}
        value={safeParse(row.format)}
        collapsed={false}
        enableClipboard={false}
        style={{ fontSize: 13, background: "transparent" }}
      />
    </div>
  );

  const columns: TableColumnsType<CargoFormatRow> = [
    {
      title: t("customCargo.name"),
      dataIndex: "custom_name",
      key: "custom_name",
      width: 200,
      fixed: "left",
      sorter: (a, b) => a.custom_name.localeCompare(b.custom_name),
    },
    {
      title: t("customCargo.uniqueKey"),
      dataIndex: "unique_key",
      key: "unique_key",
      width: 160,
    },
    {
      title: t("customCargo.isDefault"),
      dataIndex: "is_default",
      key: "is_default",
      width: 100,
      render: (v: boolean) => (
        <StatusTag $on={v}>{v ? t("utils.yes") : t("utils.no")}</StatusTag>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 110,
      fixed: "right",
      render: (_, row) => (
        <Toolbar>
          <GhostButton onClick={() => openEdit(row)}>
            <EditOutlined />
          </GhostButton>
          <Popconfirm
            title={t("customCargo.warn")}
            description={t("customCargo.delete_desc")}
            okText={t("utils.yes")}
            cancelText={t("utils.no")}
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
          <InboxOutlined />
          {t("toolbar.others.custom_cargo_info")}
        </SectionTitle>

        <Toolbar>
          <SolidButton onClick={openCreate}>
            <PlusOutlined />
            {t("customCargo.create")}
          </SolidButton>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState>{t("customCargo.not_defined_format")}</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => {
              const isOpen = expanded.includes(row.id);
              return (
                <ItemCard key={row.id}>
                  <CardTitleRow>
                    <span>{row.custom_name}</span>
                    <StatusTag $on={row.is_default}>
                      {row.is_default ? t("utils.yes") : t("utils.no")}
                    </StatusTag>
                  </CardTitleRow>

                  <CardFacts>
                    <dt>{t("customCargo.uniqueKey")}</dt>
                    <dd>{row.unique_key}</dd>
                  </CardFacts>

                  <Toolbar>
                    <GhostButton onClick={() => toggleCard(row.id)}>
                      {isOpen ? <DownOutlined /> : <RightOutlined />}
                      {t("utils.detail")}
                    </GhostButton>
                    <GhostButton onClick={() => openEdit(row)}>
                      <EditOutlined />
                      {t("utils.edit")}
                    </GhostButton>
                    <Popconfirm
                      title={t("customCargo.warn")}
                      description={t("customCargo.delete_desc")}
                      okText={t("utils.yes")}
                      cancelText={t("utils.no")}
                      onConfirm={() => deleteMutation.mutate(row.id)}
                    >
                      <DangerButton>
                        <DeleteOutlined />
                        {t("utils.delete")}
                      </DangerButton>
                    </Popconfirm>
                  </Toolbar>

                  {isOpen && jsonView(row)}
                </ItemCard>
              );
            })}
          </CardList>
        ) : (
          <TableWrap>
            <Table<CargoFormatRow>
              size="small"
              rowKey="id"
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              scroll={{ x: "max-content" }}
              expandable={{ expandedRowRender: jsonView }}
              pagination={{
                pageSize: 12,
                showTotal: (total) => `TOTAL ${total}`,
              }}
            />
          </TableWrap>
        )}
      </Section>

      <Modal
        open={open}
        title={
          editing
            ? `${t("utils.edit")} — ${editing.custom_name}`
            : t("customCargo.modalTitle")
        }
        onCancel={close}
        onOk={submit}
        confirmLoading={createMutation.isLoading || editMutation.isLoading}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        width={560}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Field>
            <FieldLabel>{t("customCargo.name")}</FieldLabel>
            <Form.Item
              name="custom_name"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <Input placeholder={t("customCargo.namePlaceholder")} />
            </Form.Item>
          </Field>

          {editing && (
            <Field>
              <FieldLabel>{t("customCargo.isDefault")}</FieldLabel>
              <Form.Item name="is_default" valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
            </Field>
          )}

          <FieldLabel>{t("customCargo.addField")}</FieldLabel>
          <Form.List name="format">
            {(fields, { add, remove }) => (
              <div style={{ margin: "8px 0 16px" }}>
                {fields.map(({ key, name, ...restField }) => (
                  <div
                    key={key}
                    style={{ display: "flex", gap: 8, marginBottom: 8 }}
                  >
                    <Form.Item
                      {...restField}
                      name={[name, "key"]}
                      rules={[
                        {
                          required: true,
                          message: t("customCargo.keyRequired"),
                        },
                      ]}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <Input placeholder="e.g. container_id" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "value"]}
                      rules={[
                        {
                          required: true,
                          message: t("customCargo.valueRequired"),
                        },
                      ]}
                      style={{ width: 130, marginBottom: 0 }}
                    >
                      <Select options={TYPE_OPTIONS} />
                    </Form.Item>
                    <MinusCircleOutlined
                      onClick={() => remove(name)}
                      style={{ alignSelf: "center", color: "#c0341d" }}
                    />
                  </div>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                >
                  {t("customCargo.addField")}
                </Button>
              </div>
            )}
          </Form.List>

          {/* 唯一值只在新增時決定,後端不接受事後更動 */}
          {!editing && (
            <Field>
              <FieldLabel>{t("customCargo.uniqueKey")}</FieldLabel>
              <Form.Item
                name="unique_key"
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <Select
                  options={
                    formatFields
                      ?.filter((f) => f?.key)
                      .map((f) => ({ value: f.key, label: f.key })) ?? []
                  }
                />
              </Form.Item>
            </Field>
          )}

          {editing && (
            <Hint>
              {t("customCargo.uniqueKey")}:{editing.unique_key}(建立後不可更改)
            </Hint>
          )}
        </Form>
      </Modal>
    </PanelShell>
  );
};

export default CustomCargoInfoPanel;
