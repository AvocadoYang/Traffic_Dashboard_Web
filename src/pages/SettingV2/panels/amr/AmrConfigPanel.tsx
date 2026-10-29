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
import type { OptimizeResult } from "@/components/Fleet3D/upload/optimizeModel";
import Model3dField, { UploadedModelFile } from "./Model3dField";
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
  /** 3D 檢視的模型 (null = 預設, 照車名), 上傳的模型要轉幾度 */
  model_3d: string | null;
  model_3d_yaw: number;
  model_3d_file: UploadedModelFile;
};

type FormValues = Omit<RobotType, "id" | "model_3d_file">;

/** 車型的 3D 模型 glb 送到後端 (檔名另外用文字欄位送, multer 收中文檔名會變亂碼) */
const uploadModel = (id: string, file: File) => {
  const body = new FormData();
  body.append("id", id);
  body.append("fileName", file.name);
  body.append("model", file);
  return client.post("api/setting/upload-robot-type-model", body);
};

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
  /** 選好、處理好的 3D 模型, 按新增 / 儲存時才上傳 */
  const [pendingModel, setPendingModel] = useState<OptimizeResult | null>(null);

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

  // 有選 3D 模型檔的話, 車型存好之後接著上傳 (新增的車型要等後端給 id)
  const createMutation = useMutation({
    mutationFn: async (payload: FormValues) => {
      const resp = await client.post<{ data: { id: string } }>("api/setting/create-robot-type", payload);
      if (pendingModel) await uploadModel(resp.data.data.id, pendingModel.file);
      return resp;
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void queryClient.refetchQueries({ queryKey: ["amr-sample"] });
      form.resetFields();
      setPendingModel(null);
    },
    onError,
  });

  const editMutation = useMutation({
    mutationFn: async (payload: FormValues & { id: string }) => {
      const resp = await client.post("api/setting/edit-robot-type", payload);
      if (pendingModel) await uploadModel(payload.id, pendingModel.file);
      return resp;
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void queryClient.refetchQueries({ queryKey: ["amr-sample"] });
      cancelEdit();
    },
    onError,
  });

  const removeModelMutation = useMutation({
    mutationFn: (id: string) => client.post("api/setting/delete-robot-type-model", { id }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void queryClient.refetchQueries({ queryKey: ["amr-sample"] });
      form.setFieldValue("model_3d", null);
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
    setPendingModel(null);
  };

  const startEdit = (row: RobotType) => {
    form.setFieldsValue(row);
    setEditingId(row.id);
    setPendingModel(null);
  };

  const editingRow = rows.find((r) => r.id === editingId) ?? null;
  const modelLabel = (row: RobotType) =>
    row.model_3d === "custom" && row.model_3d_file
      ? row.model_3d_file.file_name
      : row.model_3d && row.model_3d !== "custom"
        ? t(`fleet3d.model.${row.model_3d}` as "fleet3d.model.forklift")
        : t("fleet3d.model.default_short");

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
      title: t("fleet3d.model.label"),
      key: "model_3d",
      width: 160,
      render: (_, row) => modelLabel(row),
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

        <Form form={form} layout="vertical" autoComplete="off" initialValues={{ model_3d: null, model_3d_yaw: 0 }}>
          <FieldGrid $cols={2}>
            <Field>
              <FieldLabel>{t("toolbar.amr_setting.amr_name")}</FieldLabel>
              <Form.Item
                name="name"
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <Input placeholder={t("setting_v2.amr.name_placeholder")} />
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

          <Model3dField
            typeId={editingId}
            uploaded={editingRow?.model_3d_file ?? null}
            pending={pendingModel}
            onPending={setPendingModel}
            onRemoveUploaded={() => editingId && removeModelMutation.mutate(editingId)}
            removing={removeModelMutation.isLoading}
          />
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
          <EmptyState>{t("setting_v2.empty.robot_types")}</EmptyState>
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
                  <dt>{t("fleet3d.model.label")}</dt>
                  <dd>{modelLabel(row)}</dd>
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
                showTotal: (total) => t("utils.total", { total }),
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
          {t("setting_v2.amr.delete_in_use")}
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
