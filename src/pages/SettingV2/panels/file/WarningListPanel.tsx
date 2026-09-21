import { FC, useMemo, useState } from "react";
import {
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Skeleton,
  Switch,
  Table,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useWarningTable from "@/api/useWarningTable";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
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
} from "../../ui/primitives";

type WarningRow = {
  id: number;
  is_open_buzzer: boolean;
  info_ch: string;
  info_en: string;
  solution_ch?: string;
  solution_en?: string;
};

const WarningListPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const { data, isLoading, isFetching, refetch } = useWarningTable();

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  /** 有值代表在編輯那一筆,null 代表新增 */
  const [editing, setEditing] = useState<WarningRow | null>(null);

  const rows = useMemo(() => {
    const all = (data ?? []).filter(Boolean) as WarningRow[];
    const keyword = search.trim().toLowerCase();
    if (!keyword) return all;
    return all.filter(
      (r) =>
        String(r.id).includes(keyword) ||
        r.info_ch.toLowerCase().includes(keyword) ||
        r.info_en.toLowerCase().includes(keyword),
    );
  }, [data, search]);

  const invalidate = () =>
    queryClient.refetchQueries({ queryKey: ["warning-table"] });

  const addMutation = useMutation({
    mutationFn: (payload: WarningRow) =>
      client.post("api/setting/add-warning", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void invalidate();
      close();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const editMutation = useMutation({
    mutationFn: (payload: WarningRow & { origin_id: number }) =>
      client.post("api/setting/edit-warning", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void invalidate();
      close();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      client.post("api/setting/delete-warning", { id }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void invalidate();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const close = () => {
    form.resetFields();
    setEditing(null);
    setOpen(false);
  };

  const openAdd = () => {
    form.resetFields();
    form.setFieldsValue({ is_open_buzzer: false });
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (row: WarningRow) => {
    form.setFieldsValue(row);
    setEditing(row);
    setOpen(true);
  };

  const submit = async () => {
    let values: WarningRow;
    try {
      values = (await form.validateFields()) as WarningRow;
    } catch {
      return;
    }

    if (editing) {
      // 錯誤編號本身可以改,所以要另外帶原本的 id 讓後端知道改的是哪一筆
      editMutation.mutate({ ...values, origin_id: editing.id });
      return;
    }

    const all = (data ?? []).filter(Boolean) as WarningRow[];
    if (all.some((v) => v.id === values.id)) {
      void messageApi.warning(t("file.warning_list.id_duplicate_warn"));
      return;
    }
    addMutation.mutate(values);
  };

  const columns: TableColumnsType<WarningRow> = [
    {
      title: t("file.warning_list.error_code"),
      dataIndex: "id",
      key: "id",
      width: 100,
      fixed: "left",
      defaultSortOrder: "ascend",
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: t("file.warning_list.buzzer"),
      dataIndex: "is_open_buzzer",
      key: "is_open_buzzer",
      width: 90,
      filters: [
        { text: t("utils.yes"), value: true },
        { text: t("utils.no"), value: false },
      ],
      onFilter: (value, r) => r.is_open_buzzer === value,
      render: (v: boolean) => (
        <StatusTag $on={v}>{v ? t("utils.yes") : t("utils.no")}</StatusTag>
      ),
    },
    {
      title: t("file.warning_list.info_ch"),
      dataIndex: "info_ch",
      key: "info_ch",
      width: 200,
    },
    {
      title: t("file.warning_list.info_en"),
      dataIndex: "info_en",
      key: "info_en",
      width: 200,
    },
    {
      title: t("file.warning_list.solution_ch"),
      dataIndex: "solution_ch",
      key: "solution_ch",
      width: 220,
      render: (v: string) => v || "—",
    },
    {
      title: t("file.warning_list.solution_en"),
      dataIndex: "solution_en",
      key: "solution_en",
      width: 220,
      render: (v: string) => v || "—",
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
            title={t("utils.delete_warn")}
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
          <WarningOutlined />
          {t("file.warning_list.warning_table")}
        </SectionTitle>

        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={`${t("utils.search")} ${t("file.warning_list.error_code")}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Toolbar>
          <SolidButton onClick={openAdd}>
            <PlusOutlined />
            {t("utils.add")}
          </SolidButton>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState>NO WARNINGS</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.id} $selected={row.id === editing?.id}>
                <CardTitleRow>
                  <span>#{row.id}</span>
                  <StatusTag $on={row.is_open_buzzer}>
                    {t("file.warning_list.buzzer")}
                  </StatusTag>
                </CardTitleRow>

                <CardFacts>
                  <dt>{t("file.warning_list.info_ch")}</dt>
                  <dd>{row.info_ch}</dd>
                  <dt>{t("file.warning_list.info_en")}</dt>
                  <dd>{row.info_en}</dd>
                  <dt>{t("file.warning_list.solution_ch")}</dt>
                  <dd>{row.solution_ch || "—"}</dd>
                  <dt>{t("file.warning_list.solution_en")}</dt>
                  <dd>{row.solution_en || "—"}</dd>
                </CardFacts>

                <Toolbar>
                  <GhostButton onClick={() => openEdit(row)}>
                    <EditOutlined />
                    {t("utils.edit")}
                  </GhostButton>
                  <Popconfirm
                    title={t("utils.delete_warn")}
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
              </ItemCard>
            ))}
          </CardList>
        ) : (
          <TableWrap>
            <Table<WarningRow>
              size="small"
              rowKey="id"
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              scroll={{ x: "max-content" }}
              pagination={{
                pageSize: 15,
                showSizeChanger: true,
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
            ? `${t("utils.edit")} — #${editing.id}`
            : `${t("utils.add")} — ${t("file.warning_list.warning_table")}`
        }
        onCancel={close}
        onOk={submit}
        confirmLoading={addMutation.isLoading || editMutation.isLoading}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        width={600}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <FieldGrid $cols={2}>
            <Field>
              <FieldLabel>{t("file.warning_list.error_code")}</FieldLabel>
              <Form.Item
                name="id"
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>{t("file.warning_list.buzzer")}</FieldLabel>
              <Form.Item name="is_open_buzzer" valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
            </Field>
          </FieldGrid>

          <FieldGrid $cols={2}>
            <Field>
              <FieldLabel>{t("file.warning_list.info_ch")}</FieldLabel>
              <Form.Item
                name="info_ch"
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <Input />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>{t("file.warning_list.info_en")}</FieldLabel>
              <Form.Item
                name="info_en"
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <Input />
              </Form.Item>
            </Field>
          </FieldGrid>

          <Field>
            <FieldLabel>{t("file.warning_list.solution_ch")}</FieldLabel>
            <Form.Item name="solution_ch">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Field>

          <Field>
            <FieldLabel>{t("file.warning_list.solution_en")}</FieldLabel>
            <Form.Item name="solution_en">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Field>
        </Form>
      </Modal>
    </PanelShell>
  );
};

export default WarningListPanel;
