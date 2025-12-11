import { FC, memo, useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Radio,
  Table,
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
  CloseOutlined,
  PictureOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import useAllMapInfo from "@/api/useAllMapInfo";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useAtom } from "jotai";
import { isOpenSwitchMap } from "@/utils/siderGloble";

const { Dragger } = Upload;

// Industrial Styled Components
const MapManagerContainer = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  right: ${({ $isOpen }) => ($isOpen ? "0" : "-100%")};
  width: 90%;
  max-width: 1200px;
  height: 100vh;
  background: #ffffff;
  border-left: 3px solid #1890ff;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.15);
  transition: right 0.3s ease;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  font-family: "Roboto Mono", monospace;
`;

const Header = styled.div`
  background: #fafafa;
  border-bottom: 2px solid #d9d9d9;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;

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

const CloseButton = styled(Button)`
  width: 36px;
  height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d9d9d9;
  background: #ffffff;

  &:hover {
    background: #fff1f0;
    border-color: #ff4d4f;
    color: #ff4d4f;
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
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

const IndustrialButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 36px;
  font-weight: 600;
  border-radius: 0;
  transition: all 0.2s ease;

  &.ant-btn-primary {
    background: #1890ff;
    border-color: #1890ff;

    &:hover {
      background: #40a9ff;
      border-color: #40a9ff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
    }
  }

  &.upload-btn {
    background: #52c41a;
    border-color: #52c41a;
    color: #ffffff;

    &:hover {
      background: #73d13d;
      border-color: #73d13d;
      box-shadow: 0 2px 8px rgba(82, 196, 26, 0.4);
    }
  }

  &.view-btn {
    background: #ffffff;
    border: 1px solid #1890ff;
    color: #1890ff;

    &:hover {
      background: #f0f5ff;
      border-color: #40a9ff;
      color: #40a9ff;
    }
  }

  &.edit-btn {
    background: #ffffff;
    border: 1px solid #faad14;
    color: #faad14;

    &:hover {
      background: #fffbe6;
      border-color: #faad14;
      color: #fa8c16;
    }
  }

  &.delete-btn {
    background: #ffffff;
    border: 1px solid #ff4d4f;
    color: #ff4d4f;

    &:hover {
      background: #fff1f0;
      border-color: #ff7875;
      color: #ff7875;
    }
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

const IndustrialTable = styled(Table)`
  .ant-table {
    border: 1px solid #d9d9d9;
    border-radius: 0;
    font-family: "Roboto Mono", monospace;
  }

  .ant-table-thead > tr > th {
    background: #fafafa;
    border-bottom: 2px solid #d9d9d9;
    color: #595959;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;
    padding: 12px 16px;

    &::before {
      display: none;
    }
  }

  .ant-table-tbody > tr {
    transition: all 0.2s;
    position: relative;

    &:hover {
      background: #f0f5ff;

      &::before {
        width: 4px;
      }

      td {
        background: transparent;
      }
    }
  }

  .ant-table-tbody > tr > td {
    border-bottom: 1px solid #f0f0f0;
    padding: 12px 16px;
    font-size: 12px;
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

const IndustrialModal = styled(Modal)`
  .ant-modal-content {
    background: #ffffff;
    border: 2px solid #d9d9d9;
    border-radius: 0;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  .ant-modal-header {
    background: #fafafa;
    border-bottom: 2px solid #d9d9d9;
    border-left: 4px solid #1890ff;
    padding: 16px 24px;
    border-radius: 0;
  }

  .ant-modal-title {
    color: #1890ff;
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: "Roboto Mono", monospace;
  }

  .ant-modal-body {
    padding: 24px;
  }

  .ant-modal-footer {
    border-top: 1px solid #d9d9d9;
    padding: 16px 24px;

    .ant-btn {
      font-family: "Roboto Mono", monospace;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 1px;
      height: 36px;
      font-weight: 600;
      border-radius: 0;
    }
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
  isUsing: boolean;
  mapOriginX: number;
  mapOriginY: number;
};

const MapManager: FC = () => {
  const { t } = useTranslation();
  const [openSwitchMap, setOpenSwitchMap] = useAtom(isOpenSwitchMap);
  const [uploadForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [file, setFile] = useState<File | null>(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMap, setEditingMap] = useState<MapInfo | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const { data: maps, refetch } = useAllMapInfo();

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

  // Edit Mutation
  const editMutation = useMutation({
    mutationFn: (payload: any) => {
      return client.patch("api/setting/map-update", payload);
    },
    onSuccess: async () => {
      messageApi.success(t("utils.success"));
      await refetch();
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
      isUsing: record.isUsing,
      mapOriginX: record.mapOriginX,
      mapOriginY: record.mapOriginY,
    });
    setEditModalOpen(true);
  };

  const baseUrl = `${window.location.origin}`
    .replace("localhost", location.hostname)
    .replace(/:5173/, ":4000")
    .replace(/\/+$/, "");

  const viewImage = (systemPath: string, fileName: string) => {
    const imageUrl = `${baseUrl}${systemPath}${fileName}`;
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
      title: "File Name",
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
      title: "Status",
      dataIndex: "isUsing",
      key: "isUsing",
      render: (isUsing: boolean) => (
        <StatusBadge $active={isUsing}>
          {isUsing ? (
            <>
              <CheckCircleOutlined />
              Active
            </>
          ) : (
            <>
              <CloseCircleOutlined />
              Inactive
            </>
          )}
        </StatusBadge>
      ),
    },
    {
      title: "Origin X",
      dataIndex: "mapOriginX",
      key: "mapOriginX",
    },
    {
      title: "Origin Y",
      dataIndex: "mapOriginY",
      key: "mapOriginY",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: MapInfo) => (
        <Flex gap="small">
          <IndustrialButton
            className="view-btn"
            size="small"
            icon={<EyeOutlined />}
            onClick={() =>
              viewImage(maps?.systemFilePath as string, record.fileName)
            }
          >
            View
          </IndustrialButton>
          <IndustrialButton
            className="edit-btn"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            Edit
          </IndustrialButton>
          <Popconfirm
            title="Delete map?"
            description="Are you sure you want to delete this map?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <IndustrialButton
              className="delete-btn"
              size="small"
              icon={<DeleteOutlined />}
            >
              Delete
            </IndustrialButton>
          </Popconfirm>
        </Flex>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <MapManagerContainer $isOpen={openSwitchMap}>
        <Header>
          <Title>
            <PictureOutlined />
            Map Management
          </Title>
          <CloseButton
            icon={<CloseOutlined />}
            onClick={() => setOpenSwitchMap(false)}
          />
        </Header>

        <Content>
          {/* Upload Section */}
          <SectionHeader>
            <UploadOutlined />
            Upload New Map
          </SectionHeader>
          <UploadSection>
            <StyledForm form={uploadForm} layout="vertical">
              <Flex gap="middle">
                <Form.Item
                  name="mapOriginX"
                  label="Map Origin X"
                  rules={[{ required: true, message: "Required" }]}
                  style={{ flex: 1 }}
                >
                  <IndustrialInputNumber
                    style={{ width: "100%" }}
                    placeholder="Enter X coordinate"
                  />
                </Form.Item>
                <Form.Item
                  name="mapOriginY"
                  label="Map Origin Y"
                  rules={[{ required: true, message: "Required" }]}
                  style={{ flex: 1 }}
                >
                  <IndustrialInputNumber
                    style={{ width: "100%" }}
                    placeholder="Enter Y coordinate"
                  />
                </Form.Item>
              </Flex>
              <Form.Item label="Upload File">
                <StyledDragger {...uploadProps}>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">
                    Click or drag file to this area
                  </p>
                  <p className="ant-upload-hint">
                    Support PNG format only. File name must be alphanumeric.
                  </p>
                </StyledDragger>
              </Form.Item>
              <Form.Item>
                <IndustrialButton
                  className="upload-btn"
                  icon={<UploadOutlined />}
                  onClick={handleUpload}
                  loading={uploadMutation.isLoading}
                  disabled={!file}
                  block
                >
                  Upload Map
                </IndustrialButton>
              </Form.Item>
            </StyledForm>
          </UploadSection>

          <SectionDivider />

          {/* Maps Table */}
          <SectionHeader>
            <PictureOutlined />
            Existing Maps ({maps?.allMap?.length || 0})
          </SectionHeader>
          {maps?.allMap && maps.allMap.length > 0 ? (
            <IndustrialTable
              columns={columns}
              dataSource={maps.allMap}
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
              [ No maps found ]
            </EmptyState>
          )}
        </Content>
      </MapManagerContainer>

      {/* Image Preview Modal */}
      <Image
        style={{ display: "none" }}
        preview={{
          visible: imagePreviewOpen,
          src: previewImage,
          onVisibleChange: (visible) => setImagePreviewOpen(visible),
        }}
      />

      {/* Edit Modal */}
      <IndustrialModal
        title="Edit Map Information"
        open={editModalOpen}
        onOk={handleEdit}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingMap(null);
        }}
        okText="Save"
        cancelText="Cancel"
        confirmLoading={editMutation.isPending}
      >
        <StyledForm form={editForm} layout="vertical">
          <Form.Item label="File Name" name="fileName">
            <IndustrialInput disabled />
          </Form.Item>
          <Form.Item label="Status" name="isUsing">
            <Radio.Group>
              <Radio value={false}>Inactive</Radio>
              <Radio value={true}>Active</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            label="Map Origin X"
            name="mapOriginX"
            rules={[{ required: true }]}
          >
            <IndustrialInputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="Map Origin Y"
            name="mapOriginY"
            rules={[{ required: true }]}
          >
            <IndustrialInputNumber style={{ width: "100%" }} />
          </Form.Item>
        </StyledForm>
      </IndustrialModal>
    </>
  );
};

export default memo(MapManager);
