import React, { Dispatch, FC, SetStateAction, useState } from "react";
import styled from "styled-components";
import { Modal, Upload, message, Progress, Flex } from "antd";
import type { UploadProps, UploadFile } from "antd";
import {
  InboxOutlined,
  FileExcelOutlined,
  CloudUploadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";

const { Dragger } = Upload;

// Industrial Styled Components
const StyledModal = styled(Modal)`
  .ant-modal-content {
    background: #ffffff;
    border: 2px solid #d9d9d9;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    padding: 0;
    overflow: hidden;
  }

  .ant-modal-header {
    background: #fafafa;
    border-bottom: 2px solid #d9d9d9;
    padding: 16px 20px;
    margin-bottom: 0;
  }

  .ant-modal-title {
    font-family: "Roboto Mono", monospace;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #52c41a;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .ant-modal-body {
    padding: 24px 20px;
    background: #ffffff;
  }

  .ant-modal-footer {
    background: #fafafa;
    border-top: 2px solid #d9d9d9;
    padding: 12px 20px;
    margin-top: 0;

    .ant-btn {
      font-family: "Roboto Mono", monospace;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 1px;
      height: 36px;
      border: 1px solid #d9d9d9;
      min-width: 100px;

      &.ant-btn-default {
        background: #ffffff;
        color: #595959;

        &:hover {
          background: #fafafa;
          border-color: #8c8c8c;
          color: #262626;
        }
      }

      &.ant-btn-primary {
        background: #52c41a;
        border-color: #52c41a;
        color: #ffffff;
        font-weight: 600;

        &:hover {
          background: #73d13d;
          border-color: #73d13d;
        }

        &:disabled {
          background: #f5f5f5;
          border-color: #d9d9d9;
          color: #bfbfbf;
        }
      }
    }
  }

  .ant-modal-close {
    color: #8c8c8c;

    &:hover {
      color: #ff4d4f;
      background: #fff1f0;
    }
  }
`;

const InstructionPanel = styled.div`
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-left: 3px solid #52c41a;
  padding: 12px 16px;
  margin-bottom: 20px;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  color: #262626;
  line-height: 1.7;

  .instruction-title {
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #52c41a;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .instruction-list {
    margin-top: 8px;
    padding-left: 16px;

    li {
      color: #595959;
      margin-bottom: 4px;
      position: relative;

      &::marker {
        color: #52c41a;
      }
    }
  }

  .format-info {
    margin-top: 10px;
    padding: 8px 10px;
    background: #e6f7ff;
    border: 1px solid #91d5ff;
    border-left: 2px solid #1890ff;
    color: #003a8c;
    font-size: 10px;
    display: flex;
    align-items: flex-start;
    gap: 6px;

    .info-icon {
      color: #1890ff;
      font-size: 12px;
      margin-top: 1px;
    }
  }
`;

const StyledDragger = styled(Dragger)`
  &.ant-upload-wrapper {
    .ant-upload-drag {
      background: #fafafa;
      border: 2px dashed #d9d9d9;
      transition: all 0.3s ease;
      padding: 40px 20px;

      &:hover {
        border-color: #52c41a;
        background: #f6ffed;
      }
    }

    .ant-upload-drag-icon {
      margin-bottom: 16px;

      .anticon {
        color: #52c41a;
        font-size: 64px;
      }
    }

    .ant-upload-text {
      font-family: "Roboto Mono", monospace;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #262626;
      margin-bottom: 8px;
    }

    .ant-upload-hint {
      font-family: "Roboto Mono", monospace;
      font-size: 11px;
      color: #8c8c8c;
      letter-spacing: 0.5px;
    }
  }
`;

const FilePreviewCard = styled.div`
  background: #ffffff;
  border: 2px solid #d9d9d9;
  border-left: 3px solid #52c41a;
  padding: 16px;
  margin-top: 20px;
  font-family: "Roboto Mono", monospace;
  transition: all 0.2s ease;

  &:hover {
    border-color: #52c41a;
    box-shadow: 0 2px 8px rgba(82, 196, 26, 0.15);
  }
`;

const FileHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const FileInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;

  .file-icon {
    font-size: 32px;
    color: #52c41a;
  }

  .file-details {
    flex: 1;

    .file-name {
      font-size: 12px;
      font-weight: 600;
      color: #262626;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .file-size {
      font-size: 10px;
      color: #8c8c8c;
      letter-spacing: 0.5px;
    }
  }
`;

const DeleteButton = styled.button`
  background: transparent;
  border: 1px solid #ff4d4f;
  color: #ff4d4f;
  padding: 6px 12px;
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    background: #fff1f0;
    border-color: #ff7875;
    color: #ff7875;
  }

  .anticon {
    font-size: 12px;
  }
`;

const UploadStatus = styled.div<{ status: "uploading" | "success" | "error" }>`
  padding: 12px;
  background: ${({ status }) =>
    status === "success"
      ? "#f6ffed"
      : status === "error"
        ? "#fff1f0"
        : "#e6f7ff"};
  border: 1px solid
    ${({ status }) =>
      status === "success"
        ? "#b7eb8f"
        : status === "error"
          ? "#ffa39e"
          : "#91d5ff"};
  border-left: 3px solid
    ${({ status }) =>
      status === "success"
        ? "#52c41a"
        : status === "error"
          ? "#ff4d4f"
          : "#1890ff"};
  margin-top: 12px;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 10px;

  .status-icon {
    font-size: 16px;
    color: ${({ status }) =>
      status === "success"
        ? "#52c41a"
        : status === "error"
          ? "#ff4d4f"
          : "#1890ff"};
  }

  .status-text {
    flex: 1;
    color: ${({ status }) =>
      status === "success"
        ? "#389e0d"
        : status === "error"
          ? "#cf1322"
          : "#096dd9"};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
`;

const UploadIcon = styled(CloudUploadOutlined)`
  font-size: 18px;
  color: #52c41a;
`;

interface UploadMissionProps {
  open: boolean;
  setShowUploadMission: Dispatch<SetStateAction<boolean>>;
}

const UploadMission: FC<UploadMissionProps> = ({
  open,
  setShowUploadMission,
}) => {
  const { t } = useTranslation();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "uploading" | "success" | "error" | null
  >(null);
  const [messageApi, contextHolder] = message.useMessage();

  const handleClose = () => {
    setShowUploadMission(false);
    setFileList([]);
    setUploadStatus(null);
  };

  const handleRemove = () => {
    setFileList([]);
    setUploadStatus(null);
  };

  const uploadProps: UploadProps = {
    name: "file",
    multiple: false,
    maxCount: 1,
    accept: ".xlsx,.xls",
    fileList: fileList,
    beforeUpload: (file) => {
      const isExcel =
        file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.type === "application/vnd.ms-excel";

      if (!isExcel) {
        messageApi.error(t("upload.invalid_file_type", { name: file.name }));
        return Upload.LIST_IGNORE;
      }

      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        messageApi.error(t("upload.file_too_large"));
        return Upload.LIST_IGNORE;
      }

      setFileList([file]);
      setUploadStatus(null);
      return false; // Prevent auto upload
    },
    onRemove: handleRemove,
    showUploadList: false,
  };

  const mutation = useMutation({
    mutationFn: (formData: FormData) =>
      client.post("/api/missions/update_mission", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: () => {
      setUploadStatus("success");
      messageApi.success(t("upload.success"));
      setTimeout(() => {
        handleClose();
      }, 1500);
    },
    onError: (e: ErrorResponse) => {
      setUploadStatus("error");
      errorHandler(e, messageApi);
    },
  });

  const handleUpload = async () => {
    if (fileList.length === 0) {
      messageApi.warning(t("upload.select_file_first"));
      return;
    }

    setUploading(true);
    setUploadStatus("uploading");

    const formData = new FormData();
    formData.append("file", fileList[0] as any);

    try {
      if (fileList.length === 0) {
        messageApi.warning(t("upload.select_file_first"));
        return;
      }

      const formData = new FormData();

      const fileToUpload = fileList[0].originFileObj || fileList[0];
      formData.append("file", fileToUpload as any);

      mutation.mutate(formData);
    } catch (error) {
      setUploadStatus("error");
      messageApi.error(t("upload.upload_failed"));
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <>
      {contextHolder}
      <StyledModal
        open={open}
        onCancel={handleClose}
        onOk={handleUpload}
        style={{ top: 10 }}
        title={
          <>
            <UploadIcon />
            {t("upload.upload_mission_file")}
          </>
        }
        okText={t("upload.upload_execute")}
        cancelText={t("utils.cancel")}
        confirmLoading={uploading}
        okButtonProps={{ disabled: fileList.length === 0 || uploading }}
        width={600}
      >
        <Flex gap="large">
          <InstructionPanel>
            <div className="instruction-title">
              <CheckCircleOutlined />
              {t("upload.instructions_title")}
            </div>
            <ul className="instruction-list">
              <li>
                <strong>{t("upload.file_format")}:</strong>{" "}
                {t("upload.file_format_desc")}
              </li>
              <li>
                <strong>{t("upload.file_size")}:</strong>{" "}
                {t("upload.file_size_desc")}
              </li>
              <li>
                <strong>{t("upload.auto_execution")}:</strong>{" "}
                {t("upload.auto_execution_desc")}
              </li>
              <li>
                <strong>{t("upload.single_upload")}:</strong>{" "}
                {t("upload.single_upload_desc")}
              </li>
            </ul>
            <div className="format-info">
              <FileExcelOutlined className="info-icon" />
              <span>
                <strong>{t("upload.note")}:</strong> {t("upload.note_desc")}
              </span>
            </div>
          </InstructionPanel>

          <StyledDragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">{t("upload.drag_text")}</p>
            <p className="ant-upload-hint">{t("upload.hint")}</p>
          </StyledDragger>
        </Flex>

        {fileList.length > 0 && (
          <FilePreviewCard>
            <FileHeader>
              <FileInfo>
                <FileExcelOutlined className="file-icon" />
                <div className="file-details">
                  <div className="file-name">{fileList[0].name}</div>
                  <div className="file-size">
                    {formatFileSize(fileList[0].size || 0)}
                  </div>
                </div>
              </FileInfo>
              <DeleteButton onClick={handleRemove}>
                <DeleteOutlined />
                {t("upload.remove")}
              </DeleteButton>
            </FileHeader>

            {uploadStatus && (
              <UploadStatus status={uploadStatus}>
                {uploadStatus === "uploading" && (
                  <>
                    <CloudUploadOutlined className="status-icon" />
                    <span className="status-text">{t("upload.uploading")}</span>
                  </>
                )}
                {uploadStatus === "success" && (
                  <>
                    <CheckCircleOutlined className="status-icon" />
                    <span className="status-text">{t("upload.complete")}</span>
                  </>
                )}
                {uploadStatus === "error" && (
                  <>
                    <WarningOutlined className="status-icon" />
                    <span className="status-text">{t("upload.failed")}</span>
                  </>
                )}
              </UploadStatus>
            )}

            {uploadStatus === "uploading" && (
              <div style={{ marginTop: 12 }}>
                <Progress
                  percent={100}
                  status="active"
                  strokeColor="#52c41a"
                  style={{ fontFamily: '"Roboto Mono", monospace' }}
                />
              </div>
            )}
          </FilePreviewCard>
        )}
      </StyledModal>
    </>
  );
};

export default UploadMission;
