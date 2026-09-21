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
  AimOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { useMarkerType } from "@/api/useMarkerType";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import useIsNarrow from "../../ui/useIsNarrow";
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

const CREATE_URL = "api/setting/add-marker-type";
const EDIT_URL = "api/setting/edit-marker-type";
const DELETE_URL = "api/setting/delete-marker";

const SHELF_TYPE_BAR = 22;
const SHELF_TYPE_LEG = 24;

type ShelfTypeKey = "BAR" | "LEG";

const SHELF_TYPE_LABEL: Record<ShelfTypeKey, string> = {
  BAR: "Bar Shelf Marker",
  LEG: "Leg Shelf Marker",
};

const SHELF_TYPE_DOCKING_TYPE: Record<ShelfTypeKey, number> = {
  BAR: SHELF_TYPE_BAR,
  LEG: SHELF_TYPE_LEG,
};

const toShelfKey = (dockingType: number): ShelfTypeKey =>
  dockingType === SHELF_TYPE_BAR ? "BAR" : "LEG";

type MarkerTypeRow = {
  id?: string;
  name: string;
  docking_type: number;
  bar_length: number;
  bar_distance: number;
  orientation_offset: number;
  x_offset: number;
  y_offset: number;
  shelf_leg_asymmetry_x: number;
  created_by?: string;
};

type FormValues = {
  name: string;
  shelfType: ShelfTypeKey;
  bar_length: number;
  bar_distance: number;
  orientation_offset: number;
  x_offset: number;
  y_offset: number;
  shelf_leg_asymmetry_x: number;
};

const MarkerTypePanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<FormValues>();

  const { data = [], isLoading, isFetching, refetch } = useMarkerType();

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MarkerTypeRow | null>(null);
  /** MiR 內建的 marker type 只能看不能改 */
  const [viewOnly, setViewOnly] = useState(false);

  const rows = useMemo(() => {
    const all = (data ?? []) as MarkerTypeRow[];
    const keyword = search.trim().toLowerCase();
    if (!keyword) return all;
    return all.filter((r) => r.name.toLowerCase().includes(keyword));
  }, [data, search]);

  const createMutation = useMutation({
    mutationFn: (payload: Omit<MarkerTypeRow, "id" | "created_by">) =>
      client.post(CREATE_URL, payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
      close();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const editMutation = useMutation({
    mutationFn: (payload: Omit<MarkerTypeRow, "created_by">) =>
      client.post(EDIT_URL, payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
      close();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.post(DELETE_URL, { id }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const close = () => {
    form.resetFields();
    setEditing(null);
    setViewOnly(false);
    setOpen(false);
  };

  const openCreate = () => {
    form.resetFields();
    setEditing(null);
    setViewOnly(false);
    setOpen(true);
  };

  const openRow = (row: MarkerTypeRow) => {
    const readOnly = row.created_by === "MiR";
    form.setFieldsValue({
      name: row.name,
      shelfType: toShelfKey(row.docking_type),
      bar_length: row.bar_length,
      bar_distance: row.bar_distance,
      orientation_offset: row.orientation_offset,
      x_offset: row.x_offset,
      y_offset: row.y_offset,
      shelf_leg_asymmetry_x: row.shelf_leg_asymmetry_x,
    });
    setEditing(row);
    setViewOnly(readOnly);
    setOpen(true);
  };

  const submit = async () => {
    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const payload = {
      name: values.name.trim(),
      docking_type: SHELF_TYPE_DOCKING_TYPE[values.shelfType],
      bar_length: values.bar_length,
      bar_distance: values.bar_distance,
      orientation_offset: values.orientation_offset,
      x_offset: values.x_offset,
      y_offset: values.y_offset,
      shelf_leg_asymmetry_x: values.shelf_leg_asymmetry_x || 0,
    };

    if (editing) {
      editMutation.mutate({ ...payload, id: editing.id ?? "" });
      return;
    }
    createMutation.mutate(payload);
  };

  const columns: TableColumnsType<MarkerTypeRow> = [
    {
      title: t("peripheral_name_table.name"),
      dataIndex: "name",
      key: "name",
      width: 180,
      fixed: "left",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: t("utils.category"),
      dataIndex: "docking_type",
      key: "docking_type",
      width: 170,
      render: (v: number) => <Tag>{SHELF_TYPE_LABEL[toShelfKey(v)]}</Tag>,
    },
    {
      title: "BAR LENGTH",
      dataIndex: "bar_length",
      key: "bar_length",
      width: 120,
      sorter: (a, b) => a.bar_length - b.bar_length,
      render: (v: number) => `${v} m`,
    },
    {
      title: "BAR DISTANCE",
      dataIndex: "bar_distance",
      key: "bar_distance",
      width: 130,
      sorter: (a, b) => a.bar_distance - b.bar_distance,
      render: (v: number) => `${v} m`,
    },
    {
      title: "LEG ASYMMETRY",
      dataIndex: "shelf_leg_asymmetry_x",
      key: "shelf_leg_asymmetry_x",
      width: 140,
      render: (v: number) => `${v ?? 0} m`,
    },
    {
      title: "CREATED BY",
      dataIndex: "created_by",
      key: "created_by",
      width: 120,
      render: (v: string) => v || "—",
    },
    {
      title: "",
      key: "actions",
      width: 110,
      fixed: "right",
      render: (_, row) => (
        <Toolbar>
          <GhostButton onClick={() => openRow(row)}>
            {row.created_by === "MiR" ? <EyeOutlined /> : <EditOutlined />}
          </GhostButton>
          <Popconfirm
            title={t("utils.delete_warn")}
            okText={t("utils.confirm")}
            cancelText={t("utils.cancel")}
            onConfirm={() => deleteMutation.mutate(row.id ?? "")}
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
          <AimOutlined />
          MARKER TYPE
        </SectionTitle>

        <Hint>定義貨架 marker 的偵測形狀。MiR 內建的項目只能檢視。</Hint>

        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t("utils.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Toolbar>
          <SolidButton onClick={openCreate}>
            <PlusOutlined />
            {t("utils.add")}
          </SolidButton>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState>NO MARKER TYPES</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.id ?? row.name}>
                <CardTitleRow>
                  <span>{row.name}</span>
                  <Tag>{SHELF_TYPE_LABEL[toShelfKey(row.docking_type)]}</Tag>
                </CardTitleRow>

                <CardFacts>
                  <dt>BAR LENGTH</dt>
                  <dd>{row.bar_length} m</dd>
                  <dt>BAR DISTANCE</dt>
                  <dd>{row.bar_distance} m</dd>
                  <dt>CREATED BY</dt>
                  <dd>{row.created_by || "—"}</dd>
                </CardFacts>

                <Toolbar>
                  <GhostButton onClick={() => openRow(row)}>
                    {row.created_by === "MiR" ? (
                      <EyeOutlined />
                    ) : (
                      <EditOutlined />
                    )}
                    {row.created_by === "MiR"
                      ? t("utils.detail")
                      : t("utils.edit")}
                  </GhostButton>
                  <Popconfirm
                    title={t("utils.delete_warn")}
                    okText={t("utils.confirm")}
                    cancelText={t("utils.cancel")}
                    onConfirm={() => deleteMutation.mutate(row.id ?? "")}
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
            <Table<MarkerTypeRow>
              size="small"
              rowKey={(r) => r.id ?? r.name}
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

      <Modal
        open={open}
        title={
          editing
            ? `${viewOnly ? t("utils.detail") : t("utils.edit")} — ${editing.name}`
            : `${t("utils.add")} — MARKER TYPE`
        }
        onCancel={close}
        onOk={submit}
        confirmLoading={createMutation.isLoading || editMutation.isLoading}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        okButtonProps={{ style: viewOnly ? { display: "none" } : undefined }}
        width={560}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
          disabled={viewOnly}
          initialValues={{
            shelfType: "BAR",
            bar_length: 0.4,
            bar_distance: 1,
            orientation_offset: 0,
            x_offset: 0,
            y_offset: 0,
            shelf_leg_asymmetry_x: 0,
          }}
        >
          <Field>
            <FieldLabel>{t("peripheral_name_table.name")}</FieldLabel>
            <Form.Item
              name="name"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <Input placeholder="my_test" />
            </Form.Item>
          </Field>

          <Field>
            <FieldLabel>SHELF TYPE</FieldLabel>
            <Form.Item name="shelfType">
              <Select
                options={[
                  { value: "BAR", label: SHELF_TYPE_LABEL.BAR },
                  { value: "LEG", label: SHELF_TYPE_LABEL.LEG },
                ]}
              />
            </Form.Item>
          </Field>

          <FieldGrid $cols={2}>
            <Field>
              <FieldLabel>BAR LENGTH</FieldLabel>
              <Form.Item
                name="bar_length"
                rules={[
                  {
                    required: true,
                    type: "number",
                    min: 0.4,
                    max: 0.75,
                    message: "0.4 ~ 0.75",
                  },
                ]}
              >
                <InputNumber
                  addonAfter="m"
                  step={0.01}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>BAR DISTANCE</FieldLabel>
              <Form.Item
                name="bar_distance"
                rules={[
                  {
                    required: true,
                    type: "number",
                    min: 0.75,
                    max: 1.5,
                    message: "0.75 ~ 1.5",
                  },
                ]}
              >
                <InputNumber
                  addonAfter="m"
                  step={0.01}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>ORIENTATION OFFSET</FieldLabel>
              <Form.Item name="orientation_offset">
                <InputNumber addonAfter="deg" style={{ width: "100%" }} />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>LEG ASYMMETRY</FieldLabel>
              <Form.Item name="shelf_leg_asymmetry_x">
                <InputNumber
                  addonAfter="m"
                  step={0.01}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>X-OFFSET</FieldLabel>
              <Form.Item name="x_offset">
                <InputNumber
                  addonAfter="m"
                  step={0.01}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>Y-OFFSET</FieldLabel>
              <Form.Item name="y_offset">
                <InputNumber
                  addonAfter="m"
                  step={0.01}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Field>
          </FieldGrid>

          <Hint>
            Bar：側邊橫桿的長度與兩側橫桿的間距。
            Leg：同側兩支腳的距離與對側兩支腳的距離。
            X / Y offset 調整車輛對接時前進與橫向的位移。
          </Hint>
        </Form>
      </Modal>
    </PanelShell>
  );
};

export default MarkerTypePanel;
