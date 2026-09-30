import { FC, useMemo, useState } from "react";
import {
  Form,
  Input,
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
  CloudSyncOutlined,
  EditOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useCorningPeripheralFormat from "@/api/useCorningPeripheralFormat";
import usePeripheralGroup from "@/api/usePeripheralGroup";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { EndpointStatus } from "@/types/corning";
import useIsNarrow from "../../ui/useIsNarrow";
import {
  PanelShell,
  Section,
  SectionTitle,
  FieldGrid,
  Field,
  FieldLabel,
  Toolbar,
  GhostButton,
  EmptyState,
  TableWrap,
  CardList,
  ItemCard,
  CardTitleRow,
  CardFacts,
  Tag,
} from "../../ui/primitives";

type PeripheralRow = {
  id: string;
  name: string | null;
  description: string | null;
  group: string | null;
  status: EndpointStatus;
  quantity: number;
  peripheralNameDBId: string;
  level: number;
};

/** Corning 端點狀態碼。被保留位的狀態由系統寫入,不開放手動指定。 */
const STATUS_OPTIONS = [
  { value: 0, label: "UNDEFINED" },
  { value: 10, label: "OFFLINE" },
  { value: 20, label: "EMPTY_AVAILABLE_FOR_RECEIVING" },
  { value: 30, label: "EMPTY_ITEM_RESERVED", disabled: true },
  { value: 31, label: "EMPTY_DEFECT_ITEM_RESERVED", disabled: true },
  { value: 40, label: "EMPTY_NOT_AVAILABLE" },
  { value: 50, label: "OCCUPIED_AVAILABLE_FOR_PICKUP" },
  { value: 60, label: "OCCUPIED_ITEM_PICKUP_RESERVED", disabled: true },
  { value: 70, label: "OCCUPIED_NOT_AVAILABLE" },
];

const STATUS_LABEL = STATUS_OPTIONS.reduce<Record<number, string>>(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {},
);

const PeripheralNamePanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const { data, isLoading, isFetching, error, refetch } =
    useCorningPeripheralFormat(null);
  const { data: groups } = usePeripheralGroup();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<PeripheralRow | null>(null);

  const groupOptions = useMemo(
    () => groups?.map((g) => ({ label: g?.name, value: g?.name })) ?? [],
    [groups],
  );

  const rows = useMemo(() => {
    const all = (data?.payload ?? []) as PeripheralRow[];
    const keyword = search.trim().toLowerCase();
    if (!keyword) return all;
    return all.filter(
      (item) =>
        item.id.toLowerCase().includes(keyword) ||
        (item.name ?? "").toLowerCase().includes(keyword),
    );
  }, [data?.payload, search]);

  const updateMutation = useMutation({
    mutationFn: (payload: PeripheralRow) =>
      client.post("/api/setting/update-peripheral-name", payload),
    onSuccess: () => {
      void messageApi.success(t("peripheral_name_table.updatedSuccess"));
      void queryClient.invalidateQueries({ queryKey: ["peripheral-name"] });
      void refetch();
      setEditing(null);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const syncMutation = useMutation({
    mutationFn: () => client.post("/api/wcs/sync-with-corning"),
    onSuccess: () => void messageApi.success(t("utils.success")),
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const openEdit = (row: PeripheralRow) => {
    form.setFieldsValue({
      name: row.name ?? "",
      description: row.description ?? "",
      quantity: row.quantity,
      group: row.group ?? null,
      status: row.status,
    });
    setEditing(row);
  };

  const submit = async () => {
    if (!editing) return;
    let values: {
      name: string;
      description: string;
      quantity: number;
      group: string;
      status: EndpointStatus;
    };
    try {
      values = (await form.validateFields()) as typeof values;
    } catch {
      return;
    }
    updateMutation.mutate({
      ...values,
      id: editing.id,
      peripheralNameDBId: editing.peripheralNameDBId,
      level: editing.level,
    });
  };

  const columns: TableColumnsType<PeripheralRow> = [
    {
      title: t("peripheral_name_table.locationId"),
      dataIndex: "id",
      key: "id",
      width: 100,
      fixed: "left",
      sorter: (a, b) => Number(a.id) - Number(b.id),
    },
    {
      title: t("utils.status"),
      dataIndex: "status",
      key: "status",
      width: 240,
      filters: STATUS_OPTIONS.map((o) => ({ text: o.label, value: o.value })),
      onFilter: (value, r) => r.status === value,
      render: (v: number) => <Tag>{STATUS_LABEL[v] ?? v}</Tag>,
    },
    {
      title: t("peripheral_name_table.name"),
      dataIndex: "name",
      key: "name",
      width: 160,
      render: (v: string | null) => v || "—",
    },
    {
      title: t("peripheral_name_table.description"),
      dataIndex: "description",
      key: "description",
      width: 200,
      render: (v: string | null) => v || "—",
    },
    {
      title: t("peripheral_name_table.group"),
      dataIndex: "group",
      key: "group",
      width: 150,
      render: (v: string | null) => (v ? <Tag>{v}</Tag> : "—"),
    },
    {
      title: t("utils.count"),
      dataIndex: "quantity",
      key: "quantity",
      width: 80,
    },
    {
      title: "",
      key: "actions",
      width: 80,
      fixed: "right",
      render: (_, row) => (
        <Toolbar>
          <GhostButton onClick={() => openEdit(row)}>
            <EditOutlined />
          </GhostButton>
        </Toolbar>
      ),
    },
  ];

  if (error) return <EmptyState>{String(error)}</EmptyState>;
  if (isLoading) return <Skeleton active />;

  return (
    <PanelShell>
      {contextHolder}

      <Section>
        <SectionTitle>
          <ApiOutlined />
          {t("toolbar.peripheral.name_table")}
        </SectionTitle>

        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={`${t("utils.search")} ${t("peripheral_name_table.name")}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Toolbar>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("peripheral_name_table.reload")}
          </GhostButton>
          <Popconfirm
            title={t("utils.confirm")}
            okText={t("utils.confirm")}
            cancelText={t("utils.cancel")}
            onConfirm={() => syncMutation.mutate()}
          >
            <GhostButton disabled={syncMutation.isLoading}>
              <CloudSyncOutlined />
              SYNC WITH CORNING
            </GhostButton>
          </Popconfirm>
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState>NO PERIPHERALS</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.id} $selected={row.id === editing?.id}>
                <CardTitleRow>
                  <span>{row.name || row.id}</span>
                  <Tag>{STATUS_LABEL[row.status] ?? row.status}</Tag>
                </CardTitleRow>

                <CardFacts>
                  <dt>{t("peripheral_name_table.locationId")}</dt>
                  <dd>{row.id}</dd>
                  <dt>{t("peripheral_name_table.description")}</dt>
                  <dd>{row.description || "—"}</dd>
                  <dt>{t("peripheral_name_table.group")}</dt>
                  <dd>{row.group || "—"}</dd>
                  <dt>{t("utils.count")}</dt>
                  <dd>{row.quantity}</dd>
                </CardFacts>

                <Toolbar>
                  <GhostButton onClick={() => openEdit(row)}>
                    <EditOutlined />
                    {t("utils.edit")}
                  </GhostButton>
                </Toolbar>
              </ItemCard>
            ))}
          </CardList>
        ) : (
          <TableWrap>
            <Table<PeripheralRow>
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
        open={!!editing}
        title={`${t("utils.edit")} — ${editing?.id ?? ""}`}
        onCancel={() => setEditing(null)}
        onOk={submit}
        confirmLoading={updateMutation.isLoading}
        okText={t("peripheral_name_table.save")}
        cancelText={t("peripheral_name_table.cancel")}
        width={560}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <FieldGrid $cols={2}>
            <Field>
              <FieldLabel>{t("peripheral_name_table.name")}</FieldLabel>
              <Form.Item name="name">
                <Input
                  placeholder={t("peripheral_name_table.inputPlaceholder")}
                />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>{t("peripheral_name_table.group")}</FieldLabel>
              <Form.Item name="group">
                <Select
                  allowClear
                  options={groupOptions}
                  placeholder={t("utils.select")}
                />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>{t("utils.status")}</FieldLabel>
              <Form.Item name="status">
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>{t("utils.count")}</FieldLabel>
              <Form.Item name="quantity">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Field>
          </FieldGrid>

          <Field>
            <FieldLabel>{t("peripheral_name_table.description")}</FieldLabel>
            <Form.Item name="description">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Field>
        </Form>
      </Modal>
    </PanelShell>
  );
};

export default PeripheralNamePanel;
