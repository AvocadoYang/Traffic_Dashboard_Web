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
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useAMRsample from "@/api/useAMRsample";
import { Err } from "@/utils/responseErr";
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
  WarnNote,
} from "../../ui/primitives";

type RobotType = {
  id: string;
  name: string;
  value: string;
  width: number;
  length: number;
  height: number;
};

type FormValues = Omit<RobotType, "id">;

type RelatedMission = { id: string; name: string };

const AmrConfigPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const [replaceForm] = Form.useForm();

  const { data, isLoading, isFetching, refetch } = useAMRsample();

  const [editingId, setEditingId] = useState<string | null>(null);
  /** 刪除車種時後端回報有任務還在用,這裡存那些任務,非空就跳出改派 Modal */
  const [blockingMissions, setBlockingMissions] = useState<RelatedMission[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const rows = (data ?? []) as RobotType[];

  const onError = (error: Err) =>
    void messageApi.error(error.response.data.message);

  const replaceOptions = useMemo(
    () =>
      rows
        .filter((a) => a.name !== "人形機器人" && a.id !== deletingId)
        .map((a) => ({ label: a.name, value: a.id })),
    [rows, deletingId],
  );

  const createMutation = useMutation({
    mutationFn: (payload: FormValues) =>
      client.post("api/setting/create-robot-type", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void queryClient.refetchQueries({ queryKey: ["amr-sample"] });
      form.resetFields();
    },
    onError,
  });

  const editMutation = useMutation({
    mutationFn: (payload: RobotType) =>
      client.post("api/setting/edit-robot-type", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void queryClient.refetchQueries({ queryKey: ["amr-sample"] });
      cancelEdit();
    },
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      client.post("api/setting/delete-robot-type", { id }),
    onSuccess: async (resp: {
      data: { hasRelativeMission: boolean; missions: RelatedMission[] };
    }) => {
      if (resp.data.hasRelativeMission) {
        setBlockingMissions(resp.data.missions);
        return;
      }
      await queryClient.refetchQueries({
        queryKey: ["all-mission-title-detail"],
      });
      void messageApi.success(t("utils.success"));
      void queryClient.refetchQueries({ queryKey: ["amr-sample"] });
      void queryClient.refetchQueries({ queryKey: ["all-register-amr"] });
      setDeletingId(null);
    },
    onError,
  });

  const continueDeleteMutation = useMutation({
    mutationFn: (payload: { id: string; replace_id: string }) =>
      client.post("api/setting/delete-robot-type-continue", payload),
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["all-mission-title-detail"],
      });
      void messageApi.success(t("utils.success"));
      void queryClient.refetchQueries({ queryKey: ["amr-sample"] });
      void queryClient.refetchQueries({ queryKey: ["all-register-amr"] });
      closeReplace();
    },
    onError,
  });

  const closeReplace = () => {
    setBlockingMissions([]);
    setDeletingId(null);
    replaceForm.resetFields();
  };

  const cancelEdit = () => {
    setEditingId(null);
    form.resetFields();
  };

  const startEdit = (row: RobotType) => {
    form.setFieldsValue(row);
    setEditingId(row.id);
  };

  const submit = async () => {
    let values: FormValues;
    try {
      values = (await form.validateFields()) as FormValues;
    } catch {
      return;
    }
    if (editingId) {
      editMutation.mutate({ ...values, id: editingId });
      return;
    }
    createMutation.mutate(values);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    deleteMutation.mutate(id);
  };

  const submitReplace = async () => {
    let values: { change_id: string };
    try {
      values = (await replaceForm.validateFields()) as { change_id: string };
    } catch {
      return;
    }
    if (!deletingId) return;
    continueDeleteMutation.mutate({
      id: deletingId,
      replace_id: values.change_id,
    });
  };

  const columns: TableColumnsType<RobotType> = [
    {
      title: t("toolbar.amr_setting.amr_name"),
      dataIndex: "name",
      key: "name",
      width: 130,
      fixed: "left",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: t("toolbar.amr_setting.serial_name"),
      dataIndex: "value",
      key: "value",
      width: 150,
    },
    {
      title: t("toolbar.amr_setting.length"),
      dataIndex: "length",
      key: "length",
      width: 80,
      render: (v: number) => `${v} M`,
    },
    {
      title: t("toolbar.amr_setting.width"),
      dataIndex: "width",
      key: "width",
      width: 80,
      render: (v: number) => `${v} M`,
    },
    {
      title: t("toolbar.amr_setting.height"),
      dataIndex: "height",
      key: "height",
      width: 80,
      render: (v: number) => `${v} M`,
    },
    {
      title: "",
      key: "actions",
      width: 110,
      fixed: "right",
      render: (_, row) => (
        <Toolbar>
          <GhostButton onClick={() => startEdit(row)}>
            <EditOutlined />
          </GhostButton>
          <Popconfirm
            title={t("utils.delete_warn")}
            okText={t("utils.confirm")}
            cancelText={t("utils.cancel")}
            onConfirm={() => handleDelete(row.id)}
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
          <ToolOutlined />
          {editingId
            ? `${t("utils.edit")} — ${t("toolbar.amr_setting.amr_config")}`
            : t("toolbar.amr_setting.amr_config")}
        </SectionTitle>

        <Form form={form} layout="vertical" autoComplete="off">
          <FieldGrid $cols={2}>
            <Field>
              <FieldLabel>{t("toolbar.amr_setting.amr_name")}</FieldLabel>
              <Form.Item
                name="name"
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <Input placeholder="平衡式" />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>{t("toolbar.amr_setting.serial_name")}</FieldLabel>
              <Form.Item
                name="value"
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <Input placeholder="anfa-ps14-16" />
              </Form.Item>
            </Field>
          </FieldGrid>

          <FieldGrid $cols={3}>
            <Field>
              <FieldLabel>{t("toolbar.amr_setting.length")}</FieldLabel>
              <Form.Item
                name="length"
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <InputNumber
                  placeholder="1"
                  min={0.1}
                  max={999}
                  step={0.1}
                  addonAfter="M"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>{t("toolbar.amr_setting.width")}</FieldLabel>
              <Form.Item
                name="width"
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <InputNumber
                  placeholder="1"
                  min={0.1}
                  max={999}
                  step={0.1}
                  addonAfter="M"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>{t("toolbar.amr_setting.height")}</FieldLabel>
              <Form.Item
                name="height"
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <InputNumber
                  placeholder="1"
                  min={0.1}
                  max={999}
                  step={0.1}
                  addonAfter="M"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Field>
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
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
        </Toolbar>
      </Section>

      <Section>
        <SectionTitle>
          <ToolOutlined />
          {t("toolbar.amr_setting.robot")}
        </SectionTitle>

        {rows.length === 0 ? (
          <EmptyState>NO ROBOT TYPES</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.id} $selected={row.id === editingId}>
                <CardTitleRow>
                  <span>{row.name}</span>
                  <Tag>{row.value}</Tag>
                </CardTitleRow>

                <CardFacts>
                  <dt>{t("toolbar.amr_setting.length")}</dt>
                  <dd>{row.length} M</dd>
                  <dt>{t("toolbar.amr_setting.width")}</dt>
                  <dd>{row.width} M</dd>
                  <dt>{t("toolbar.amr_setting.height")}</dt>
                  <dd>{row.height} M</dd>
                </CardFacts>

                <Toolbar>
                  <GhostButton onClick={() => startEdit(row)}>
                    <EditOutlined />
                    {t("utils.edit")}
                  </GhostButton>
                  <Popconfirm
                    title={t("utils.delete_warn")}
                    okText={t("utils.confirm")}
                    cancelText={t("utils.cancel")}
                    onConfirm={() => handleDelete(row.id)}
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
            <Table<RobotType>
              size="small"
              rowKey="id"
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              scroll={{ x: "max-content" }}
              rowClassName={(row: RobotType) =>
                row.id === editingId ? "ant-table-row-selected" : ""
              }
              pagination={{
                pageSize: 12,
                showTotal: (total) => `TOTAL ${total}`,
              }}
            />
          </TableWrap>
        )}
      </Section>

      <Modal
        open={blockingMissions.length > 0}
        title={t("utils.delete")}
        onCancel={closeReplace}
        onOk={submitReplace}
        confirmLoading={continueDeleteMutation.isLoading}
        okText={t("utils.confirm")}
        cancelText={t("utils.cancel")}
        destroyOnHidden
      >
        <WarnNote>
          這個車種還被下列任務使用中,必須指定要改用哪一個車種才能刪除。
        </WarnNote>

        <ul style={{ margin: "12px 0", paddingLeft: 20, fontSize: 12 }}>
          {blockingMissions.map((mission) => (
            <li key={mission.id}>{mission.name}</li>
          ))}
        </ul>

        <Form form={replaceForm} layout="vertical">
          <Field>
            <FieldLabel>{t("toolbar.amr_setting.amr_name")}</FieldLabel>
            <Form.Item
              name="change_id"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <Select
                options={replaceOptions}
                placeholder={t("utils.select")}
              />
            </Form.Item>
          </Field>
        </Form>
      </Modal>
    </PanelShell>
  );
};

export default AmrConfigPanel;
