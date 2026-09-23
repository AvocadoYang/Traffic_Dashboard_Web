import { FC, useEffect, useState } from "react";
import {
  Form,
  Input,
  Modal,
  Popconfirm,
  Skeleton,
  Table,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  FolderOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useMapGroup, { MapGroupName } from "@/api/useMapGroup";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import useIsNarrow from "../../ui/useIsNarrow";
import StatusTag from "../../ui/StatusTag";
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
} from "../../ui/primitives";

const MapGroupPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const { data: groups, isLoading, isFetching, refetch } = useMapGroup();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MapGroupName | null>(null);

  const rows = (groups ?? []) as MapGroupName[];

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["map-group"] });
    void queryClient.invalidateQueries({ queryKey: ["all-map-Info"] });
  };

  /** 啟用群組會換掉整個場地正在用的地圖,連帶的快取都要重抓 */
  const invalidateAfterActivate = () => {
    invalidate();
    void queryClient.invalidateQueries({ queryKey: ["map"] });
    void queryClient.invalidateQueries({ queryKey: ["map-list"] });
    void queryClient.invalidateQueries({ queryKey: ["active-group-resources"] });
    void queryClient.invalidateQueries({ queryKey: ["all-groups-resources"] });
  };

  const addMutation = useMutation({
    mutationFn: (payload: { group_name: string }) =>
      client.post("/api/setting/map-group", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      invalidate();
      close();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const editMutation = useMutation({
    mutationFn: (payload: { id: string; group_name: string }) =>
      client.patch("/api/setting/map-group", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      invalidate();
      close();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      client.delete("/api/setting/map-group", { data: { id } }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      invalidate();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) =>
      client.patch("api/setting/map-group/activate", { id }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      invalidateAfterActivate();
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
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (row: MapGroupName) => {
    setEditing(row);
    setOpen(true);
  };

  useEffect(() => {
    if (!editing) return;
    form.setFieldsValue({ group_name: editing.group_name });
  }, [form, editing]);

  const submit = async () => {
    let values: { group_name: string };
    try {
      values = (await form.validateFields()) as typeof values;
    } catch {
      return;
    }
    if (editing?.id) {
      editMutation.mutate({ id: editing.id, group_name: values.group_name });
      return;
    }
    addMutation.mutate({ group_name: values.group_name });
  };

  const columns: TableColumnsType<MapGroupName> = [
    {
      title: t("map_group_table.name"),
      dataIndex: "group_name",
      key: "group_name",
      width: 160,
      fixed: "left",
      sorter: (a, b) => (a.group_name || "").localeCompare(b.group_name || ""),
    },
    {
      title: t("map_group_table.status"),
      dataIndex: "isUsing",
      key: "isUsing",
      width: 100,
      filters: [
        { text: t("map_group_table.active"), value: true },
        { text: t("map_group_table.inactive"), value: false },
      ],
      onFilter: (value, r) => !!r.isUsing === value,
      render: (v: boolean) => (
        <StatusTag $on={!!v}>
          {v ? t("map_group_table.active") : t("map_group_table.inactive")}
        </StatusTag>
      ),
    },
    {
      title: t("map_group_table.maps"),
      key: "maps",
      width: 280,
      render: (_, r) =>
        r.maps?.length
          ? r.maps.map((m) => <Tag key={m.id}>{m.fileName}</Tag>)
          : "—",
    },
    {
      title: "",
      key: "actions",
      width: 180,
      fixed: "right",
      render: (_, row) => (
        <Toolbar>
          <Popconfirm
            title={t("map_group_table.activate_confirm")}
            okText={t("utils.confirm")}
            cancelText={t("utils.cancel")}
            onConfirm={() => activateMutation.mutate(row.id)}
            disabled={row.isUsing}
          >
            <GhostButton disabled={row.isUsing}>
              <PlayCircleOutlined />
            </GhostButton>
          </Popconfirm>
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
          <FolderOutlined />
          {t("toolbar.map_setting.map_group")}
        </SectionTitle>

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
          <EmptyState>NO MAP GROUPS</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.id} $selected={row.isUsing}>
                <CardTitleRow>
                  <span>{row.group_name}</span>
                  <StatusTag $on={!!row.isUsing}>
                    {row.isUsing
                      ? t("map_group_table.active")
                      : t("map_group_table.inactive")}
                  </StatusTag>
                </CardTitleRow>

                <CardFacts>
                  <dt>{t("map_group_table.maps")}</dt>
                  <dd>
                    {row.maps?.length
                      ? row.maps.map((m) => <Tag key={m.id}>{m.fileName}</Tag>)
                      : "—"}
                  </dd>
                </CardFacts>

                <Toolbar>
                  <Popconfirm
                    title={t("map_group_table.activate_confirm")}
                    okText={t("utils.confirm")}
                    cancelText={t("utils.cancel")}
                    onConfirm={() => activateMutation.mutate(row.id)}
                    disabled={row.isUsing}
                  >
                    <GhostButton disabled={row.isUsing}>
                      <PlayCircleOutlined />
                      {t("map_group_table.activate")}
                    </GhostButton>
                  </Popconfirm>
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
            <Table<MapGroupName>
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

      <Modal
        open={open}
        title={
          editing
            ? t("map_group_table.edit_title")
            : t("map_group_table.add_title")
        }
        onCancel={close}
        onOk={submit}
        confirmLoading={addMutation.isLoading || editMutation.isLoading}
        okText={t("utils.confirm")}
        cancelText={t("utils.cancel")}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Field>
            <FieldLabel>{t("map_group_table.name")}</FieldLabel>
            <Form.Item
              name="group_name"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <Input placeholder={t("map_group_table.name")} />
            </Form.Item>
          </Field>
        </Form>
      </Modal>
    </PanelShell>
  );
};

export default MapGroupPanel;
