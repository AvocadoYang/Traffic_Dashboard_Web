import { FC, memo, useState } from "react";
import {
  Form,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Select,
  Upload,
  UploadProps,
  Flex,
  Image,
} from "antd";
import {
  InboxOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  PictureOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import useAllMapInfo from "@/api/useAllMapInfo";
import useMapGroup from "@/api/useMapGroup";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import SyncJobsModal from "./SyncJobsModal";
import {
  IndustrialButton,
  IndustrialModal,
  IndustrialTable,
} from "./industrialStyle";

const { Dragger } = Upload;

// Industrial Styled Components
const Header = styled.div`
  background: #fafafa;
  border-bottom: 2px solid #d9d9d9;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  cursor: grab;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: #1890ff;
  }
`;

const Title = styled.h2`
  margin: 0;
  color: #1890ff;
  font-family: "Roboto Mono", monospace;
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Content = styled.div`
  padding: 24px;
  background: #ffffff;
`;

const SectionHeader = styled.div`
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-left: 3px solid #1890ff;
  padding: 10px 16px;
  margin-bottom: 16px;
  font-family: "Roboto Mono", monospace;
  color: #1890ff;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
`;

const UploadSection = styled.div`
  background: #fafafa;
  border: 2px solid #d9d9d9;
  padding: 24px;
  margin-bottom: 24px;
  border-left: 4px solid #52c41a;
`;

const SectionDivider = styled.div`
  height: 2px;
  background: repeating-linear-gradient(
    90deg,
    #d9d9d9 0,
    #d9d9d9 10px,
    transparent 10px,
    transparent 20px
  );
  margin: 32px 0;
  position: relative;

  &::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 8px;
    background: #1890ff;
    border: 2px solid #ffffff;
    box-shadow: 0 0 0 2px #d9d9d9;
  }
`;

const IndustrialInput = styled(Input)`
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  height: 36px;
  border-radius: 0;
  border: 1px solid #d9d9d9;

  &:hover {
    border-color: #40a9ff;
  }

  &:focus {
    border-color: #1890ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }
`;

const IndustrialInputNumber = styled(InputNumber)`
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  height: 36px;
  border-radius: 0;

  .ant-input-number-input {
    height: 34px;
  }

  &:hover {
    border-color: #40a9ff;
  }

  &.ant-input-number-focused {
    border-color: #1890ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }
`;

const StyledDragger = styled(Dragger)`
  background: #ffffff !important;
  border: 2px dashed #d9d9d9 !important;
  border-radius: 0 !important;

  &:hover {
    border-color: #40a9ff !important;
  }

  .ant-upload-drag-icon {
    color: #1890ff;
  }

  .ant-upload-text {
    font-family: "Roboto Mono", monospace;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 1px;
    color: #595959;
  }

  .ant-upload-hint {
    font-family: "Roboto Mono", monospace;
    font-size: 10px;
    color: #8c8c8c;
  }
`;

const StyledForm = styled(Form)`
  .ant-form-item-label > label {
    color: #595959;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: "Roboto Mono", monospace;
    font-weight: 600;
  }
`;

const StatusBadge = styled.div<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: ${({ $active }) => ($active ? "#f6ffed" : "#fff1f0")};
  border: 1px solid ${({ $active }) => ($active ? "#52c41a" : "#ff4d4f")};
  color: ${({ $active }) => ($active ? "#52c41a" : "#ff4d4f")};
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const FolderList = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  padding-bottom: 1em;
  flex-wrap: wrap;
`;

const FolderItem = styled.div<{
  $isSelected: boolean;
  $isActiveGroup?: boolean;
}>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
  background: ${({ $isSelected }) => ($isSelected ? "#f6ffed" : "#ffffff")};
  border: 1px solid
    ${({ $isSelected }) => ($isSelected ? "#52c41a" : "#d9d9d9")};
  border-left: 2px solid
    ${({ $isSelected }) => ($isSelected ? "#52c41a" : "#d9d9d9")};
  transition: all 0.2s;
  max-height: 2em;
  position: relative;
  box-shadow: ${({ $isSelected }) =>
    $isSelected
      ? "inset 0 0 20px rgba(82, 196, 26, 0.08), 0 2px 8px rgba(82, 196, 26, 0.25)"
      : "none"};

  ${({ $isActiveGroup }) =>
    $isActiveGroup &&
    `
    border-left: 3px solid #eb2f96;
    box-shadow: 0 0 0 1px rgba(235, 47, 150, 0.35), 0 2px 8px rgba(235, 47, 150, 0.2);
  `}

  ${({ $isSelected }) =>
    $isSelected &&
    `
    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(82, 196, 26, 0.03) 2px,
        rgba(82, 196, 26, 0.03) 4px
      );
      pointer-events: none;
    }
  `}

  &:hover {
    background: ${({ $isSelected }) => ($isSelected ? "#f6ffed" : "#f6ffed")};
    border-color: ${({ $isSelected }) => ($isSelected ? "#52c41a" : "#73d13d")};
    border-left-color: ${({ $isSelected, $isActiveGroup }) =>
      $isActiveGroup ? "#eb2f96" : $isSelected ? "#52c41a" : "#73d13d"};
    transform: ${({ $isSelected }) =>
      $isSelected ? "none" : "translateX(4px)"};
    box-shadow: ${({ $isSelected }) =>
      $isSelected
        ? "inset 0 0 20px rgba(82, 196, 26, 0.08), 0 2px 8px rgba(82, 196, 26, 0.25)"
        : "0 2px 8px rgba(82, 196, 26, 0.15)"};
  }
`;

const FolderName = styled.div<{ $isSelected: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  color: ${({ $isSelected }) => ($isSelected ? "#52c41a" : "#262626")};
  font-weight: ${({ $isSelected }) => ($isSelected ? 700 : 600)};
  text-transform: uppercase;
  letter-spacing: ${({ $isSelected }) => ($isSelected ? "1.2px" : "0.5px")};
  transition: all 0.2s;

  .anticon {
    font-size: 14px;
    color: ${({ $isSelected }) => ($isSelected ? "#52c41a" : "#8c8c8c")};
    transition: all 0.2s;
  }
`;

const ActiveGroupBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  margin-left: 8px;
  background: #fff0f6;
  border: 1px solid #eb2f96;
  color: #eb2f96;
  font-size: 9px;
  font-weight: 700;
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FolderCount = styled.span<{ $isSelected: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 20px;
  padding: 0 6px;
  background: ${({ $isSelected }) => ($isSelected ? "#52c41a" : "#e6f7ff")};
  border: 1px solid
    ${({ $isSelected }) => ($isSelected ? "#389e0d" : "#1890ff")};
  color: ${({ $isSelected }) => ($isSelected ? "#ffffff" : "#1890ff")};
  font-size: 10px;
  font-weight: 700;
  font-family: "Roboto Mono", monospace;
  margin-left: 8px;
  transition: all 0.2s;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #8c8c8c;
  font-family: "Roboto Mono", monospace;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 1px;
  border: 2px dashed #d9d9d9;
  background: #fafafa;

  .icon {
    font-size: 64px;
    color: #d9d9d9;
    margin-bottom: 16px;
  }
`;

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
  group?: {
    id: string;
    group_name: string;
    isUsing?: boolean;
    active_map_id?: string | null;
  } | null;
  floor: number;
};

type MirSyncPushResponse = {
  status: string;
  response: {
    laggards: number;
    verified: number;
    partial: number;
    failed: number;
    skippedOffline: number;
    details: {
      vehicleId: string;
      groupId: string;
      jobId: string | null;
      done: number;
      total: number;
      status: string;
    }[];
  };
};

const MapManager: FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const { t } = useTranslation();
  const [uploadForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [file, setFile] = useState<File | null>(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMap, setEditingMap] = useState<MapInfo | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [syncJobsModalOpen, setSyncJobsModalOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const { data: maps, refetch } = useAllMapInfo();
  const { data: mapGroups } = useMapGroup();

  const displayedMaps =
    maps?.allMap?.filter((map: MapInfo) =>
      selectedGroupId === "" ? true : map.map_group_id === selectedGroupId,
    ) || [];
  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => {
      return client.post("api/setting/map-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: async () => {
      messageApi.success(t("upload.success"));
      await refetch();
      uploadForm.resetFields();
      setFile(null);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  // Sync Mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      await client.post("api/setting/map-sync");
      const pushRes = await client.post<MirSyncPushResponse>(
        "api/setting/mir/sync-push",
      );
      return pushRes.data?.response ?? null;
    },
    onSuccess: async (pushResult) => {
      messageApi.success(t("utils.success"));
      if (pushResult) {
        messageApi.info(
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

  // Edit Mutation
  const editMutation = useMutation({
    mutationFn: (payload: any) => {
      return client.patch("api/setting/map-update", payload);
    },
    onSuccess: async () => {
      messageApi.success(t("utils.success"));
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ["map"] }),
      ]);
      setEditModalOpen(false);
      setEditingMap(null);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      return client.delete("api/setting/map-delete", { data: { id } });
    },
    onSuccess: async () => {
      messageApi.success(t("utils.success"));
      await refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleUpload = async () => {
    try {
      const values = await uploadForm.validateFields();
      if (!file) {
        messageApi.error(t("upload.no_file"));
        return;
      }

      const formData = new FormData();
      formData.append("filePath", file);
      formData.append("mapOriginX", values.mapOriginX);
      formData.append("mapOriginY", values.mapOriginY);
      if (values.map_group_id) {
        formData.append("map_group_id", values.map_group_id);
      }

      uploadMutation.mutate(formData);
    } catch (err) {
      console.error("Validation Error:", err);
    }
  };

  const handleEdit = async () => {
    try {
      const values = await editForm.validateFields();
      editMutation.mutate({ ...values, id: editingMap?.id });
    } catch (err) {
      console.error("Validation Error:", err);
    }
  };

  const openEditModal = (record: MapInfo) => {
    setEditingMap(record);
    editForm.setFieldsValue({
      fileName: record.fileName.split(".")[0],
      mapOriginX: record.mapOriginX,
      mapOriginY: record.mapOriginY,
      scrollX: record.scrollX,
      scrollY: record.scrollY,
      scale: record.scale,
      map_group_id: record.map_group_id,
      floor: record.floor,
    });
    setEditModalOpen(true);
  };

  const baseUrl = `${window.location.origin}`
    .replace("localhost", location.hostname)
    .replace(/:5173/, ":4000")
    .replace(/\/+$/, "");

  const viewImage = (systemPath: string, imagePath: string) => {
    const imageUrl = `${baseUrl}${systemPath}${imagePath}`;
    setPreviewImage(imageUrl);
    setImagePreviewOpen(true);
  };

  const uploadProps: UploadProps = {
    accept: "image/*",
    multiple: false,
    fileList: file ? [file as any] : [],
    beforeUpload: (newFile) => {
      const isPNG = newFile.type === "image/png";
      const validName = /^[a-zA-Z0-9-_]+\.(png)$/i.test(newFile.name);

      if (!validName) {
        messageApi.error(t("upload.invalid_filename"));
        return false;
      }

      if (!isPNG) {
        messageApi.error(t("upload.invalid_file_type"));
        return false;
      }

      if (file) {
        messageApi.warning(t("upload.only_one_file"));
        return false;
      }

      setFile(newFile);
      return false;
    },
    onRemove: () => {
      setFile(null);
    },
  };

  const columns = [
    {
      title: t("map_manager.file_name"),
      dataIndex: "fileName",
      key: "fileName",
      render: (text: string) => (
        <Flex align="center" gap="small">
          <PictureOutlined style={{ color: "#1890ff" }} />
          <span style={{ fontWeight: 600 }}>{text}</span>
        </Flex>
      ),
    },
    {
      title: t("map_manager.status"),
      dataIndex: "isUsing",
      key: "isUsing",
      render: (isUsing: boolean) => (
        <StatusBadge $active={isUsing}>
          {isUsing ? (
            <>
              <CheckCircleOutlined />
              {t("map_manager.active")}
            </>
          ) : (
            <>
              <CloseCircleOutlined />
              {t("map_manager.inactive")}
            </>
          )}
        </StatusBadge>
      ),
    },
    {
      title: t("map_manager.origin_x"),
      dataIndex: "mapOriginX",
      key: "mapOriginX",
    },
    {
      title: t("map_manager.origin_y"),
      dataIndex: "mapOriginY",
      key: "mapOriginY",
    },
    {
      title: t("map_manager.actions"),
      key: "actions",
      render: (_: any, record: MapInfo) => (
        <Flex gap="small">
          <IndustrialButton
            className="view-btn"
            size="small"
            icon={<EyeOutlined />}
            onClick={() =>
              viewImage(maps?.systemFilePath as string, record.imagePath)
            }
          >
            {t("map_manager.view")}
          </IndustrialButton>
          <IndustrialButton
            className="edit-btn"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            {t("map_manager.edit")}
          </IndustrialButton>
          <Popconfirm
            title={t("map_manager.delete_title")}
            description={t("map_manager.delete_description")}
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText={t("map_manager.delete_ok")}
            cancelText={t("map_manager.delete_cancel")}
          >
            <IndustrialButton
              className="delete-btn"
              size="small"
              icon={<DeleteOutlined />}
            >
              {t("map_manager.delete")}
            </IndustrialButton>
          </Popconfirm>
        </Flex>
      ),
    },
    {
      title: t("map_manager.map_group"),
      dataIndex: "group",
      key: "group",
      render: (group: MapInfo["group"]) => group?.group_name || "-",
    },
    {
      title: t("map_manager.floor"),
      dataIndex: "floor",
      key: "floor",
    },
  ];

  return (
    <>
      {contextHolder}
      <div>
        <Header {...listeners} {...attributes}>
          <Title>
            <PictureOutlined />
            {t("map_manager.title")}
          </Title>
        </Header>

        <Content>
          {/* Upload Section */}
          <SectionHeader>
            <UploadOutlined />
            {t("map_manager.upload_section")}
          </SectionHeader>
          <UploadSection>
            <StyledForm form={uploadForm} layout="vertical">
              <Flex gap="middle">
                <Form.Item
                  name="mapOriginX"
                  label={t("map_manager.map_origin_x")}
                  rules={[
                    { required: true, message: t("map_manager.file_required") },
                  ]}
                  style={{ flex: 1 }}
                >
                  <IndustrialInputNumber
                    style={{ width: "100%" }}
                    placeholder={t("map_manager.enter_x_coord")}
                  />
                </Form.Item>
                <Form.Item
                  name="mapOriginY"
                  label={t("map_manager.map_origin_y")}
                  rules={[
                    { required: true, message: t("map_manager.file_required") },
                  ]}
                  style={{ flex: 1 }}
                >
                  <IndustrialInputNumber
                    style={{ width: "100%" }}
                    placeholder={t("map_manager.enter_y_coord")}
                  />
                </Form.Item>
              </Flex>
              <Form.Item name="map_group_id" label={t("map_manager.map_group")}>
                <Select
                  allowClear
                  placeholder={t("map_manager.select_map_group")}
                  options={mapGroups?.map((g) => ({
                    label: g?.group_name,
                    value: g?.id,
                  }))}
                />
              </Form.Item>
              <Form.Item label={t("map_manager.upload_file")}>
                <StyledDragger {...uploadProps}>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">
                    {t("map_manager.drag_file_text")}
                  </p>
                  <p className="ant-upload-hint">{t("map_manager.png_hint")}</p>
                </StyledDragger>
              </Form.Item>
              <Form.Item>
                <IndustrialButton
                  className="upload-btn"
                  icon={<UploadOutlined />}
                  onClick={handleUpload}
                  loading={uploadMutation.isPending}
                  disabled={!file}
                  block
                >
                  {t("map_manager.upload_map_btn")}
                </IndustrialButton>
              </Form.Item>
            </StyledForm>
          </UploadSection>

          <SectionDivider />

          {/* Maps Table */}
          <SectionHeader>
            <PictureOutlined />
            {t("map_manager.existing_maps")} ({displayedMaps.length})
            <IndustrialButton
              className="view-btn"
              size="small"
              onClick={() => syncMutation.mutate()}
              loading={syncMutation.isPending}
              disabled={syncMutation.isPending}
            >
              {t("map_manager.sync_map")}
            </IndustrialButton>
            <IndustrialButton
              className="view-btn"
              size="small"
              icon={<HistoryOutlined />}
              onClick={() => setSyncJobsModalOpen(true)}
            >
              {t("map_manager.sync_jobs")}
            </IndustrialButton>
          </SectionHeader>

          <FolderList>
            <FolderItem
              $isSelected={selectedGroupId === ""}
              onClick={() => setSelectedGroupId("")}
            >
              <FolderName $isSelected={selectedGroupId === ""}>
                {selectedGroupId === "" ? (
                  <FolderOpenOutlined />
                ) : (
                  <FolderOutlined />
                )}
                {t("map_manager.all_groups")}
              </FolderName>
            </FolderItem>
            {mapGroups?.map((group) => {
              const isSelected = selectedGroupId === group.id;
              const mapCount = group.maps?.length || 0;

              return (
                <FolderItem
                  key={group.id}
                  $isSelected={isSelected}
                  $isActiveGroup={group.isUsing}
                  onClick={() => setSelectedGroupId(group.id)}
                >
                  <FolderName $isSelected={isSelected}>
                    {isSelected ? <FolderOpenOutlined /> : <FolderOutlined />}
                    {group.group_name}
                    {mapCount > 0 && (
                      <FolderCount $isSelected={isSelected}>
                        {mapCount}
                      </FolderCount>
                    )}
                    {group.isUsing && (
                      <ActiveGroupBadge>
                        {t("map_manager.active_group")}
                      </ActiveGroupBadge>
                    )}
                  </FolderName>
                </FolderItem>
              );
            })}
          </FolderList>

          <div style={{ minHeight: 560 }}>
            {displayedMaps.length > 0 ? (
              <IndustrialTable
                columns={columns as any}
                dataSource={displayedMaps}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showTotal: (total, range) => (
                    <span style={{ fontFamily: "Roboto Mono, monospace" }}>
                      {range[0]}-{range[1]} of {total}
                    </span>
                  ),
                }}
              />
            ) : (
              <EmptyState>
                <div className="icon">
                  <PictureOutlined />
                </div>
                {t("map_manager.no_maps")}
              </EmptyState>
            )}
          </div>
        </Content>
      </div>

      {/* Image Preview Modal */}
      <Image
        style={{ display: "none" }}
        preview={{
          open: imagePreviewOpen,
          src: previewImage,
          onOpenChange: (visible) => setImagePreviewOpen(visible),
        }}
      />

      {/* Edit Modal */}
      <IndustrialModal
        title={t("map_manager.edit_modal_title")}
        open={editModalOpen}
        onOk={handleEdit}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingMap(null);
        }}
        okText={t("map_manager.edit_modal_save")}
        cancelText={t("map_manager.edit_modal_cancel")}
        confirmLoading={editMutation.isPending}
      >
        <StyledForm form={editForm} layout="vertical">
          <Form.Item label={t("map_manager.file_name")} name="fileName">
            <IndustrialInput disabled />
          </Form.Item>
          <Form.Item
            label={t("map_manager.map_origin_x")}
            name="mapOriginX"
            rules={[{ required: true }]}
          >
            <IndustrialInputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label={t("map_manager.map_origin_y")}
            name="mapOriginY"
            rules={[{ required: true }]}
          >
            <IndustrialInputNumber style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label={t("upload.scroll_x")}
            name="scrollX"
            rules={[{ required: true }]}
          >
            <IndustrialInputNumber style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label={t("upload.scroll_y")}
            name="scrollY"
            rules={[{ required: true }]}
          >
            <IndustrialInputNumber style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label={t("upload.scale")}
            name="scale"
            rules={[{ required: true }]}
          >
            <IndustrialInputNumber min={0.1} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label={t("map_manager.floor")}
            name="floor"
            rules={[{ required: true }]}
          >
            <IndustrialInputNumber min={0.1} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label={t("map_manager.map_group")} name="map_group_id">
            <Select
              allowClear
              placeholder={t("map_manager.select_map_group")}
              options={mapGroups?.map((g) => ({
                label: g?.group_name,
                value: g?.id,
              }))}
            />
          </Form.Item>
        </StyledForm>
      </IndustrialModal>

      <SyncJobsModal
        open={syncJobsModalOpen}
        onClose={() => setSyncJobsModalOpen(false)}
      />
    </>
  );
};

export default memo(MapManager);
