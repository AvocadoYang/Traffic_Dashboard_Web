import { FC, useState } from "react";
import { Form, Input, Modal, Popconfirm, Table, message } from "antd";
import type { TableColumnsType } from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useMissionFolder from "@/api/useMissionFolder";
import { Err } from "@/utils/responseErr";
import {
  Field,
  FieldLabel,
  Toolbar,
  SolidButton,
  GhostButton,
  DangerButton,
  EmptyState,
  TableWrap,
  Tag,
} from "../../../ui/primitives";

type FolderRow = {
  id?: string;
  name?: string;
  missionTitles?: { id?: string }[];
};

type Props = {
  open: boolean;
  onClose: () => void;
};

const FolderEditorModal: FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [addForm] = Form.useForm();

  const { data: folders, refetch } = useMissionFolder();

  /** 正在改名的那一筆 */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const rows = (folders ?? []) as FolderRow[];

  const onError = (error: Err) =>
    void messageApi.error(error?.response?.data?.message || t("utils.error"));

  const addMutation = useMutation({
    mutationFn: (payload: { name: string }) =>
      client.post("api/setting/add-mission-folder", payload),
    onSuccess: async () => {
      await refetch();
      void messageApi.success(t("folder_editor.add_success"));
      addForm.resetFields();
    },
    onError,
  });

  const editMutation = useMutation({
    mutationFn: (payload: { id: string; name: string }) =>
      client.post("api/setting/edit-mission-folder", payload),
    onSuccess: async () => {
      await refetch();
      void messageApi.success(t("folder_editor.edit_success"));
      setEditingId(null);
    },
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      client.post("api/setting/delete-mission-folder", { id }),
    onSuccess: async () => {
      await refetch();
      // 任務清單上顯示的資料夾欄位要一起更新
      await queryClient.refetchQueries({
        queryKey: ["all-mission-title-detail"],
      });
      void messageApi.success(t("folder_editor.delete_success"));
    },
    onError,
  });

  const submitAdd = async () => {
    let values: { name: string };
    try {
      values = (await addForm.validateFields()) as typeof values;
    } catch {
      return;
    }
    addMutation.mutate({ name: values.name });
  };

  const startRename = (row: FolderRow) => {
    setEditingId(row.id ?? null);
    setDraftName(row.name ?? "");
  };

  const saveRename = () => {
    if (!editingId) return;
    if (!draftName.trim()) {
      void messageApi.warning(t("folder_editor.folder_name_required"));
      return;
    }
    editMutation.mutate({ id: editingId, name: draftName.trim() });
  };

  const columns: TableColumnsType<FolderRow> = [
    {
      title: t("folder_editor.folder_name_column"),
      dataIndex: "name",
      key: "name",
      render: (v: string, row) =>
        row.id === editingId ? (
          <Input
            size="small"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onPressEnter={saveRename}
            autoFocus
          />
        ) : (
          v
        ),
    },
    {
      title: t("folder_editor.missions_column"),
      key: "missions",
      width: 100,
      render: (_, row) => <Tag>{row.missionTitles?.length ?? 0}</Tag>,
    },
    {
      title: "",
      key: "actions",
      width: 120,
      render: (_, row) =>
        row.id === editingId ? (
          <Toolbar>
            <GhostButton onClick={saveRename}>
              <CheckOutlined />
            </GhostButton>
            <GhostButton onClick={() => setEditingId(null)}>
              <CloseOutlined />
            </GhostButton>
          </Toolbar>
        ) : (
          <Toolbar>
            <GhostButton onClick={() => startRename(row)}>
              <EditOutlined />
            </GhostButton>
            <Popconfirm
              title={t("folder_editor.delete_title")}
              description={t("folder_editor.delete_description")}
              okText={t("folder_editor.delete_ok_text")}
              cancelText={t("folder_editor.delete_cancel_text")}
              onConfirm={() => row.id && deleteMutation.mutate(row.id)}
            >
              <DangerButton>
                <DeleteOutlined />
              </DangerButton>
            </Popconfirm>
          </Toolbar>
        ),
    },
  ];

  return (
    <Modal
      open={open}
      title={t("folder_editor.title")}
      onCancel={onClose}
      footer={null}
      width={620}
      destroyOnHidden
    >
      {contextHolder}

      <Form form={addForm} layout="vertical" autoComplete="off">
        <Field>
          <FieldLabel>{t("folder_editor.create_new_folder")}</FieldLabel>
          <Form.Item
            name="name"
            rules={[
              {
                required: true,
                message: t("folder_editor.folder_name_required"),
              },
            ]}
          >
            <Input
              placeholder={t("folder_editor.folder_name_placeholder")}
              onPressEnter={submitAdd}
            />
          </Form.Item>
        </Field>
      </Form>

      <Toolbar style={{ marginBottom: 16 }}>
        <SolidButton onClick={submitAdd} disabled={addMutation.isLoading}>
          <PlusOutlined />
          {t("folder_editor.create_folder_btn")}
        </SolidButton>
      </Toolbar>

      <FieldLabel>{t("folder_editor.existing_folders")}</FieldLabel>

      {rows.length === 0 ? (
        <EmptyState style={{ marginTop: 8 }}>NO FOLDERS</EmptyState>
      ) : (
        <TableWrap style={{ marginTop: 8 }}>
          <Table<FolderRow>
            size="small"
            rowKey={(r) => r.id ?? r.name ?? ""}
            dataSource={rows}
            columns={columns}
            pagination={false}
          />
        </TableWrap>
      )}
    </Modal>
  );
};

export default FolderEditorModal;
