import { FC, useMemo, useState } from "react";
import {
  Form,
  InputNumber,
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
  PlusOutlined,
  ReloadOutlined,
  RedoOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useYaw, { YawTypeWithoutList } from "@/api/useYaw";
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
  Hint,
} from "../../ui/primitives";

const YawPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const { data, isLoading, isFetching, refetch } = useYaw();

  const [openAdd, setOpenAdd] = useState(false);
  const [editing, setEditing] = useState<YawTypeWithoutList | null>(null);

  const rows = useMemo(
    () => [...((data ?? []) as YawTypeWithoutList[])].sort((a, b) => a.yaw - b.yaw),
    [data],
  );

  const invalidate = async () => {
    await queryClient.refetchQueries({ queryKey: ["yaw"] });
    await queryClient.refetchQueries({ queryKey: ["cargoLoc-mission"] });
  };

  const addMutation = useMutation({
    mutationFn: (payload: { yaw: number }) =>
      client.post("api/setting/add-yaw", payload),
    onSuccess: async () => {
      await invalidate();
      void messageApi.success(t("utils.success"));
      setOpenAdd(false);
      addForm.resetFields();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const editMutation = useMutation({
    mutationFn: (payload: YawTypeWithoutList) =>
      client.post("api/setting/edit-yaw", {
        id: payload.id,
        yaw: payload.yaw,
      }),
    onSuccess: async () => {
      await invalidate();
      void messageApi.success(t("utils.success"));
      setEditing(null);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.post("api/setting/delete-yaw", { id }),
    onSuccess: async () => {
      await invalidate();
      void messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const submitAdd = async () => {
    try {
      await addForm.validateFields();
    } catch {
      return;
    }
    const { yaw } = addForm.getFieldsValue() as { yaw: number };
    addMutation.mutate({ yaw });
  };

  const submitEdit = async () => {
    if (!editing) return;
    try {
      await editForm.validateFields();
    } catch {
      return;
    }
    const { yaw } = editForm.getFieldsValue() as { yaw: number };
    editMutation.mutate({ id: editing.id, yaw });
  };

  const openEdit = (row: YawTypeWithoutList) => {
    editForm.setFieldsValue({ yaw: row.yaw });
    setEditing(row);
  };

  const columns: TableColumnsType<YawTypeWithoutList> = [
    {
      title: t("utils.yaw"),
      dataIndex: "yaw",
      key: "yaw",
      defaultSortOrder: "ascend",
      sorter: (a, b) => a.yaw - b.yaw,
      render: (v: number) => `${v}°`,
    },
    {
      title: "",
      key: "actions",
      width: 110,
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
          <RedoOutlined />
          {t("edit_yaw.edit_yaw")}
        </SectionTitle>

        <Toolbar>
          <SolidButton onClick={() => setOpenAdd(true)}>
            <PlusOutlined />
            {t("edit_yaw.add")}
          </SolidButton>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState>NO YAW</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.id}>
                <CardTitleRow>
                  <span>{row.yaw}°</span>
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
                      </DangerButton>
                    </Popconfirm>
                  </Toolbar>
                </CardTitleRow>
              </ItemCard>
            ))}
          </CardList>
        ) : (
          <TableWrap>
            <Table<YawTypeWithoutList>
              size="small"
              rowKey="id"
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              pagination={{
                pageSize: 12,
                showTotal: (total) => `TOTAL ${total}`,
              }}
            />
          </TableWrap>
        )}

        <Hint>{t("shelf.cargo_mission.yaw_desc")}</Hint>
      </Section>

      <Modal
        open={openAdd}
        title={t("edit_yaw.add")}
        onCancel={() => {
          setOpenAdd(false);
          addForm.resetFields();
        }}
        onOk={submitAdd}
        confirmLoading={addMutation.isLoading}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        destroyOnHidden
      >
        <Form form={addForm} layout="vertical" autoComplete="off">
          <Field>
            <FieldLabel>{t("utils.yaw")}</FieldLabel>
            <Form.Item
              name="yaw"
              rules={[
                { required: true, message: t("edit_yaw.input_warning") },
              ]}
            >
              <InputNumber min={-360} max={360} style={{ width: "100%" }} />
            </Form.Item>
          </Field>
        </Form>
      </Modal>

      <Modal
        open={!!editing}
        title={t("edit_yaw.edit_yaw")}
        onCancel={() => setEditing(null)}
        onOk={submitEdit}
        confirmLoading={editMutation.isLoading}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" autoComplete="off">
          <Field>
            <FieldLabel>{t("utils.yaw")}</FieldLabel>
            <Form.Item
              name="yaw"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <InputNumber min={-360} max={360} style={{ width: "100%" }} />
            </Form.Item>
          </Field>
        </Form>
      </Modal>
    </PanelShell>
  );
};

export default YawPanel;
