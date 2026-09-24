import { FC, useEffect, useMemo, useState } from "react";
import {
  Form,
  Input,
  Modal,
  Popconfirm,
  Skeleton,
  Table,
  Transfer,
  message,
} from "antd";
import type { TableColumnsType, TransferProps } from "antd";
import {
  ClusterOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import usePeripheralGroup, {
  PeripheralGroupName,
} from "@/api/usePeripheralGroup";
import usePeripheralName from "@/api/usePeripheralName";
import { prefixLevelName } from "@/utils/globalFunction";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import useIsNarrow from "../../ui/useIsNarrow";
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
import { c } from "../../ui/tokens";

const PeripheralGroupPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const { data: groups, isLoading, isFetching, refetch } = usePeripheralGroup();
  const { data: peripherals } = usePeripheralName();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PeripheralGroupName | null>(null);
  const [targetKeys, setTargetKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const rows = (groups ?? []) as PeripheralGroupName[];

  const transferSource = useMemo(
    () =>
      peripherals
        ?.filter((v) => v.name)
        .map((v) => ({
          key: v.peripheralNameId,
          title: v.name as string,
          description: `${t("sim.timeline.location")}: ${v.locationId} | ${t("sim.timeline.type")}: ${v.type}${
            v.level !== null && v.level !== undefined
              ? ` | ${t("sim.timeline.level")}: ${v.level + 1}`
              : ""
          }`,
        }))
        .sort((a, b) => a.title.localeCompare(b.title)) ?? [],
    [peripherals, t],
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["peripheral-group"] });
    void queryClient.invalidateQueries({ queryKey: ["peripheral-corning"] });
  };

  const addMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      description: string | null;
      peripheralNameIds: string[];
    }) => client.post("/api/setting/add-peripheral-group", payload),
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
      name: string;
      description: string | null;
      peripheralNameIds: string[];
    }) => client.post("/api/setting/edit-peripheral-group", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      invalidate();
      close();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      client.post("/api/setting/delete-peripheral-group", { id }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      invalidate();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const close = () => {
    form.resetFields();
    setTargetKeys([]);
    setSelectedKeys([]);
    setEditing(null);
    setOpen(false);
  };

  const openAdd = () => {
    form.resetFields();
    setTargetKeys([]);
    setSelectedKeys([]);
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (row: PeripheralGroupName) => {
    setEditing(row);
    setOpen(true);
  };

  useEffect(() => {
    if (!editing) return;
    form.setFieldsValue({
      name: editing.name,
      description: editing.description,
    });
    setTargetKeys(editing.peripherals.map((v) => v.id));
  }, [form, editing]);

  const submit = async () => {
    if (targetKeys.length === 0) {
      void messageApi.error(t("utils.required"));
      return;
    }
    let values: { name: string; description?: string };
    try {
      values = (await form.validateFields()) as typeof values;
    } catch {
      return;
    }

    if (editing?.id) {
      editMutation.mutate({
        id: editing.id,
        name: values.name,
        description: values.description || null,
        peripheralNameIds: targetKeys,
      });
      return;
    }
    addMutation.mutate({
      name: values.name,
      description: values.description || null,
      peripheralNameIds: targetKeys,
    });
  };

  const onTransferChange: TransferProps["onChange"] = (next) =>
    setTargetKeys(next as string[]);

  const onTransferSelect: TransferProps["onSelectChange"] = (src, tgt) =>
    setSelectedKeys([...src, ...tgt] as string[]);

  const columns: TableColumnsType<PeripheralGroupName> = [
    {
      title: t("peripheral_group_table.name"),
      dataIndex: "name",
      key: "name",
      width: 140,
      fixed: "left",
      sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
    },
    {
      title: t("peripheral_group_table.description"),
      dataIndex: "description",
      key: "description",
      width: 200,
      render: (v: string | null) => v || "—",
    },
    {
      title: t("peripheral_group_table.peripherals"),
      key: "peripherals",
      width: 280,
      render: (_, r) =>
        r.peripherals?.length
          ? r.peripherals.map((e) => (
              <Tag key={e.id}>{prefixLevelName(e.name)}</Tag>
            ))
          : "—",
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
          <ClusterOutlined />
          {t("toolbar.peripheral.group_table")}
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
          <EmptyState>NO GROUPS</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.id}>
                <CardTitleRow>
                  <span>{row.name}</span>
                </CardTitleRow>

                <CardFacts>
                  <dt>{t("peripheral_group_table.description")}</dt>
                  <dd>{row.description || "—"}</dd>
                  <dt>{t("peripheral_group_table.peripherals")}</dt>
                  <dd>
                    {row.peripherals?.length
                      ? row.peripherals.map((e) => (
                          <Tag key={e.id}>{prefixLevelName(e.name)}</Tag>
                        ))
                      : "—"}
                  </dd>
                </CardFacts>

                <Toolbar>
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
            <Table<PeripheralGroupName>
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
            ? t("peripheral_group_table.edit_title")
            : t("peripheral_group_table.add_title")
        }
        onCancel={close}
        onOk={submit}
        confirmLoading={addMutation.isLoading || editMutation.isLoading}
        okText={t("peripheral_group_table.save")}
        cancelText={t("peripheral_group_table.cancel")}
        width={900}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Field>
            <FieldLabel>{t("peripheral_group_table.name")}</FieldLabel>
            <Form.Item
              name="name"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <Input
                placeholder={t("peripheral_name_table.inputPlaceholder")}
              />
            </Form.Item>
          </Field>

          <Field>
            <FieldLabel>{t("peripheral_group_table.description")}</FieldLabel>
            <Form.Item name="description">
              <Input />
            </Form.Item>
          </Field>
        </Form>

        <FieldLabel>{t("peripheral_group_table.peripherals")}</FieldLabel>
        <div style={{ marginTop: 8 }}>
          <Transfer
            dataSource={transferSource}
            targetKeys={targetKeys}
            selectedKeys={selectedKeys}
            onChange={onTransferChange}
            onSelectChange={onTransferSelect}
            render={(item) => (
              <div>
                <div style={{ fontWeight: 600 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>
                  {item.description}
                </div>
              </div>
            )}
            listStyle={{ width: "100%", height: 380 }}
            titles={[
              t("peripheral_group_table.available_peripherals"),
              t("peripheral_group_table.selected_peripherals"),
            ]}
            showSearch
            filterOption={(input, item) =>
              item.title.toLowerCase().includes(input.toLowerCase()) ||
              item.description.toLowerCase().includes(input.toLowerCase())
            }
          />
        </div>
      </Modal>
    </PanelShell>
  );
};

export default PeripheralGroupPanel;
