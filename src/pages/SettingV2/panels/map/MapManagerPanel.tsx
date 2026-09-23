import { FC, useMemo, useState } from "react";
import {
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Table,
  Upload,
  message,
} from "antd";
import type { TableColumnsType, UploadProps } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  HistoryOutlined,
  InboxOutlined,
  PictureOutlined,
  ReloadOutlined,
  SyncOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useAllMapInfo from "@/api/useAllMapInfo";
import useMapGroup from "@/api/useMapGroup";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import SyncJobsModal from "@/pages/Setting/components/ChangeMap/SyncJobsModal";
import useIsNarrow from "../../ui/useIsNarrow";
import StatusTag from "../../ui/StatusTag";
import GroupMapFilter from "../../ui/GroupMapFilter";
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
  Hint,
} from "../../ui/primitives";

const { Dragger } = Upload;

type MapInfo = {
  id: string;
  fileName: string;
  imagePath: string;
  isUsing: boolean;
  mapOriginX: number;
  mapOriginY: number;
  scrollX: number;
  scrollY: number;
  scale: number;
  map_group_id?: string | null;
  group?: { id: string; group_name: string } | null;
  floor: number;
};

type MirSyncPushResponse = {
  status: string;
  response: {
    verified: number;
    partial: number;
    failed: number;
    skippedOffline: number;
  };
};

const MapManagerPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [uploadForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const { data: maps, isLoading, isFetching, refetch } = useAllMapInfo();
  const { data: mapGroups } = useMapGroup();

  const [file, setFile] = useState<File | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [editing, setEditing] = useState<MapInfo | null>(null);
  const [previewImage, setPreviewImage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [syncJobsOpen, setSyncJobsOpen] = useState(false);

  const groupOptions = useMemo(
    () =>
      mapGroups?.map((g) => ({ label: g?.group_name, value: g?.id })) ?? [],
    [mapGroups],
  );

  const folders = useMemo(
    () =>
      mapGroups?.map((g) => ({
        groupId: g?.id ?? "",
        groupName: g?.group_name ?? "",
        isUsing: !!g?.isUsing,
        count: g?.maps?.length ?? 0,
        // 這裡的第二排只是讓你快速跳到單一地圖,不是再一層分類
        maps:
          g?.maps?.map((m) => ({
            mapId: m?.id ?? "",
            fileName: m?.fileName ?? "",
            floor: 0,
            count: 1,
          })) ?? [],
      })) ?? [],
    [mapGroups],
  );

  const rows = useMemo(() => {
    const all = (maps?.allMap ?? []) as MapInfo[];
    return all.filter((m) => {
      if (selectedMapId) return m.id === selectedMapId;
      if (selectedGroupId) return m.map_group_id === selectedGroupId;
      return true;
    });
  }, [maps?.allMap, selectedGroupId, selectedMapId]);

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) =>
      client.post("api/setting/map-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: async () => {
      void messageApi.success(t("upload.success"));
      await refetch();
      uploadForm.resetFields();
      setFile(null);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  // 同步分兩步:先把地圖同步到伺服器,再推送到各車端
  const syncMutation = useMutation({
    mutationFn: async () => {
      await client.post("api/setting/map-sync");
      const res = await client.post<MirSyncPushResponse>(
        "api/setting/mir/sync-push",
      );
      return res.data?.response ?? null;
    },
    onSuccess: async (pushResult) => {
      void messageApi.success(t("utils.success"));
      if (pushResult) {
        void messageApi.info(
          t("map_manager.sync_push_result", {
            verified: pushResult.verified,
            partial: pushResult.partial,
            failed: pushResult.failed,
            skippedOffline: pushResult.skippedOffline,
          }),
        );
      }
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ["map-group"] }),
      ]);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const editMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      client.patch("api/setting/map-update", payload),
    onSuccess: async () => {
      void messageApi.success(t("utils.success"));
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ["map"] }),
      ]);
      closeEdit();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      client.delete("api/setting/map-delete", { data: { id } }),
    onSuccess: async () => {
      void messageApi.success(t("utils.success"));
      await refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const closeEdit = () => {
    setEditing(null);
    editForm.resetFields();
  };

  const openEdit = (row: MapInfo) => {
    editForm.setFieldsValue({
      fileName: row.fileName.split(".")[0],
      mapOriginX: row.mapOriginX,
      mapOriginY: row.mapOriginY,
      scrollX: row.scrollX,
      scrollY: row.scrollY,
      scale: row.scale,
      map_group_id: row.map_group_id,
      floor: row.floor,
    });
    setEditing(row);
  };

  const submitEdit = async () => {
    if (!editing) return;
    let values: Record<string, unknown>;
    try {
      values = (await editForm.validateFields()) as Record<string, unknown>;
    } catch {
      return;
    }
    editMutation.mutate({ ...values, id: editing.id });
  };

  const submitUpload = async () => {
    let values: { mapOriginX: number; mapOriginY: number; map_group_id?: string };
    try {
      values = (await uploadForm.validateFields()) as typeof values;
    } catch {
      return;
    }
    if (!file) {
      void messageApi.error(t("upload.no_file"));
      return;
    }
    const formData = new FormData();
    formData.append("filePath", file);
    formData.append("mapOriginX", String(values.mapOriginX));
    formData.append("mapOriginY", String(values.mapOriginY));
    if (values.map_group_id) {
      formData.append("map_group_id", values.map_group_id);
    }
    uploadMutation.mutate(formData);
  };

  // 圖片是後端靜態檔,dev 時前端跑在 5173、後端在 4000,要換掉 port
  const baseUrl = `${window.location.origin}`
    .replace("localhost", location.hostname)
    .replace(/:5173/, ":4000")
    .replace(/\/+$/, "");

  const viewImage = (imagePath: string) => {
    setPreviewImage(`${baseUrl}${maps?.systemFilePath ?? ""}${imagePath}`);
    setPreviewOpen(true);
  };

  const uploadProps: UploadProps = {
    accept: "image/png",
    multiple: false,
    fileList: file ? ([file] as unknown as UploadProps["fileList"]) : [],
    beforeUpload: (newFile) => {
      if (!/^[a-zA-Z0-9-_]+\.png$/i.test(newFile.name)) {
        void messageApi.error(t("upload.invalid_filename"));
        return false;
      }
      if (newFile.type !== "image/png") {
        void messageApi.error(t("upload.invalid_file_type", { name: newFile.name }));
        return false;
      }
      if (file) {
        void messageApi.warning(t("upload.only_one_file"));
        return false;
      }
      setFile(newFile);
      return false;
    },
    onRemove: () => setFile(null),
  };

  const columns: TableColumnsType<MapInfo> = [
    {
      title: t("map_manager.file_name"),
      dataIndex: "fileName",
      key: "fileName",
      width: 180,
      fixed: "left",
      sorter: (a, b) => a.fileName.localeCompare(b.fileName),
    },
    {
      title: t("map_manager.status"),
      dataIndex: "isUsing",
      key: "isUsing",
      width: 90,
      filters: [
        { text: t("map_manager.active"), value: true },
        { text: t("map_manager.inactive"), value: false },
      ],
      onFilter: (value, r) => r.isUsing === value,
      render: (v: boolean) => (
        <StatusTag $on={v}>
          {v ? t("map_manager.active") : t("map_manager.inactive")}
        </StatusTag>
      ),
    },
    {
      title: `${t("map_manager.origin_x")} / ${t("map_manager.origin_y")}`,
      key: "origin",
      width: 140,
      render: (_, r) => `${r.mapOriginX}, ${r.mapOriginY}`,
    },
    {
      title: t("map_manager.map_group"),
      key: "group",
      width: 140,
      render: (_, r) => r.group?.group_name || "—",
    },
    {
      title: t("map_manager.floor"),
      dataIndex: "floor",
      key: "floor",
      width: 80,
      sorter: (a, b) => a.floor - b.floor,
    },
    {
      title: "",
      key: "actions",
      width: 150,
      fixed: "right",
      render: (_, row) => (
        <Toolbar>
          <GhostButton onClick={() => viewImage(row.imagePath)}>
            <EyeOutlined />
          </GhostButton>
          <GhostButton onClick={() => openEdit(row)}>
            <EditOutlined />
          </GhostButton>
          <Popconfirm
            title={t("map_manager.delete_title")}
            description={t("map_manager.delete_description")}
            okText={t("map_manager.delete_ok")}
            cancelText={t("map_manager.delete_cancel")}
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
          <UploadOutlined />
          {t("map_manager.upload_section")}
        </SectionTitle>

        <Form form={uploadForm} layout="vertical" autoComplete="off">
          <FieldGrid $cols={3}>
            <Field>
              <FieldLabel>{t("map_manager.map_origin_x")}</FieldLabel>
              <Form.Item
                name="mapOriginX"
                rules={[
                  { required: true, message: t("map_manager.file_required") },
                ]}
              >
                <InputNumber
                  placeholder={t("map_manager.enter_x_coord")}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>{t("map_manager.map_origin_y")}</FieldLabel>
              <Form.Item
                name="mapOriginY"
                rules={[
                  { required: true, message: t("map_manager.file_required") },
                ]}
              >
                <InputNumber
                  placeholder={t("map_manager.enter_y_coord")}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>{t("map_manager.map_group")}</FieldLabel>
              <Form.Item name="map_group_id">
                <Select
                  allowClear
                  placeholder={t("map_manager.select_map_group")}
                  options={groupOptions}
                />
              </Form.Item>
            </Field>
          </FieldGrid>
        </Form>

        <Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">{t("map_manager.drag_file_text")}</p>
          <p className="ant-upload-hint">{t("map_manager.png_hint")}</p>
        </Dragger>

        <Toolbar>
          <SolidButton
            onClick={submitUpload}
            disabled={!file || uploadMutation.isLoading}
          >
            <UploadOutlined />
            {t("map_manager.upload_map_btn")}
          </SolidButton>
        </Toolbar>
      </Section>

      <Section>
        <SectionTitle>
          <PictureOutlined />
          {t("map_manager.existing_maps")} ({rows.length})
        </SectionTitle>

        <GroupMapFilter
          groups={folders}
          selectedGroupId={selectedGroupId}
          selectedMapId={selectedMapId}
          onSelectGroup={setSelectedGroupId}
          onSelectMap={setSelectedMapId}
        />

        <Toolbar>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
          <GhostButton
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isLoading}
          >
            <SyncOutlined />
            {t("map_manager.sync_map")}
          </GhostButton>
          <GhostButton onClick={() => setSyncJobsOpen(true)}>
            <HistoryOutlined />
            {t("map_manager.sync_jobs")}
          </GhostButton>
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState>{t("map_manager.no_maps")}</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.id} $selected={row.id === editing?.id}>
                <CardTitleRow>
                  <span>{row.fileName}</span>
                  <StatusTag $on={row.isUsing}>
                    {row.isUsing
                      ? t("map_manager.active")
                      : t("map_manager.inactive")}
                  </StatusTag>
                </CardTitleRow>

                <CardFacts>
                  <dt>
                    {t("map_manager.origin_x")} / {t("map_manager.origin_y")}
                  </dt>
                  <dd>
                    {row.mapOriginX}, {row.mapOriginY}
                  </dd>
                  <dt>{t("map_manager.map_group")}</dt>
                  <dd>{row.group?.group_name || "—"}</dd>
                  <dt>{t("map_manager.floor")}</dt>
                  <dd>{row.floor}</dd>
                </CardFacts>

                <Toolbar>
                  <GhostButton onClick={() => viewImage(row.imagePath)}>
                    <EyeOutlined />
                    {t("map_manager.view")}
                  </GhostButton>
                  <GhostButton onClick={() => openEdit(row)}>
                    <EditOutlined />
                    {t("map_manager.edit")}
                  </GhostButton>
                  <Popconfirm
                    title={t("map_manager.delete_title")}
                    description={t("map_manager.delete_description")}
                    okText={t("map_manager.delete_ok")}
                    cancelText={t("map_manager.delete_cancel")}
                    onConfirm={() => deleteMutation.mutate(row.id)}
                  >
                    <DangerButton>
                      <DeleteOutlined />
                      {t("map_manager.delete")}
                    </DangerButton>
                  </Popconfirm>
                </Toolbar>
              </ItemCard>
            ))}
          </CardList>
        ) : (
          <TableWrap>
            <Table<MapInfo>
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

      <Image
        style={{ display: "none" }}
        preview={{
          open: previewOpen,
          src: previewImage,
          onOpenChange: setPreviewOpen,
        }}
      />

      <Modal
        open={!!editing}
        title={t("map_manager.edit_modal_title")}
        onCancel={closeEdit}
        onOk={submitEdit}
        confirmLoading={editMutation.isLoading}
        okText={t("map_manager.edit_modal_save")}
        cancelText={t("map_manager.edit_modal_cancel")}
        width={620}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" autoComplete="off">
          <Field>
            <FieldLabel>{t("map_manager.file_name")}</FieldLabel>
            <Form.Item name="fileName">
              <Input disabled />
            </Form.Item>
          </Field>

          <FieldGrid $cols={2}>
            <Field>
              <FieldLabel>{t("map_manager.map_origin_x")}</FieldLabel>
              <Form.Item name="mapOriginX" rules={[{ required: true }]}>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("map_manager.map_origin_y")}</FieldLabel>
              <Form.Item name="mapOriginY" rules={[{ required: true }]}>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("upload.scroll_x")}</FieldLabel>
              <Form.Item name="scrollX" rules={[{ required: true }]}>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("upload.scroll_y")}</FieldLabel>
              <Form.Item name="scrollY" rules={[{ required: true }]}>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("upload.scale")}</FieldLabel>
              <Form.Item name="scale" rules={[{ required: true }]}>
                <InputNumber min={0.1} style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("map_manager.floor")}</FieldLabel>
              <Form.Item name="floor" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Field>
          </FieldGrid>

          <Field>
            <FieldLabel>{t("map_manager.map_group")}</FieldLabel>
            <Form.Item name="map_group_id">
              <Select
                allowClear
                placeholder={t("map_manager.select_map_group")}
                options={groupOptions}
              />
            </Form.Item>
          </Field>

          <Hint>{t("map_manager.png_hint")}</Hint>
        </Form>
      </Modal>

      <SyncJobsModal
        open={syncJobsOpen}
        onClose={() => setSyncJobsOpen(false)}
      />
    </PanelShell>
  );
};

export default MapManagerPanel;
