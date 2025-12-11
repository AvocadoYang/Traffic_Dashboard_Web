import client from "@/api/axiosClient";
import useBackup from "@/api/useBackupFile";
import { Err } from "@/utils/responseErr";
import {
  FileProtectOutlined,
  HistoryOutlined,
  DownloadOutlined,
  FileTextOutlined,
  CloudUploadOutlined,
  QuestionCircleFilled,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import {
  FloatButton,
  message,
  Modal,
  Button,
  Flex,
  Typography,
  Table,
  Space,
  Tooltip,
} from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import moment from "moment";
import { useAtomValue } from "jotai";
import { darkMode } from "@/utils/gloable"; // Assuming this is imported

const { Text, Title } = Typography;

// --- 1. Industrial Styled Components ---

const IndustrialFloatButton = styled(FloatButton)`
  .ant-float-btn-body {
    background-color: #00ff41;
    border: 2px solid #00ff41;
    box-shadow: 0 4px 12px rgba(0, 255, 65, 0.4);
    transition: all 0.2s ease;

    &:hover {
      background-color: #00e038;
      border-color: #00e038;
      box-shadow: 0 6px 16px rgba(0, 255, 65, 0.6);
    }
  }

  .ant-float-btn-icon {
    color: #0a0a0a;
    font-size: 20px;
  }
`;

const IndustrialModal = styled(Modal)<{ $isDark: boolean }>`
  .ant-modal-content {
    background: ${({ $isDark }) => ($isDark ? "#0f0f0f" : "#ffffff")};
    border: 1px solid ${({ $isDark }) => ($isDark ? "#2a2a2a" : "#d9d9d9")};
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    padding: 0;
  }
  .ant-modal-header {
    background: #0a0a0a;
    border-bottom: 2px solid #00ff41;
    padding: 16px 24px;
    border-radius: 2px 2px 0 0;
  }
  .ant-modal-title {
    color: #00ff41;
    font-family: "Roboto Mono", monospace;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;
  }
  .ant-modal-close-x {
    color: #00ff41;
    font-size: 16px;
  }
  .ant-modal-body {
    padding: 24px;
  }
  .ant-modal-footer {
    border-top: 1px solid ${({ $isDark }) => ($isDark ? "#2a2a2a" : "#f0f0f0")};
    padding: 12px 24px;
    background: ${({ $isDark }) => ($isDark ? "#0a0a0a" : "#fafafa")};
  }
`;

const IndustrialButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.5px;
  height: 36px;
  font-weight: 600;
  border-radius: 4px;
  transition: all 0.2s ease;
  padding: 0 16px;

  &.backup-btn {
    background: #00ff41;
    border: 1px solid #00ff41;
    color: #0a0a0a;

    &:hover:not(:disabled) {
      background: #00e038;
      border-color: #00e038;
      color: #0a0a0a;
      box-shadow: 0 2px 8px rgba(0, 255, 65, 0.3);
    }
  }
`;

const IndustrialTableContainer = styled.div<{ $isDark: boolean }>`
  .ant-table {
    background: ${({ $isDark }) => ($isDark ? "#1a1a1a" : "#ffffff")};
    border: 1px solid ${({ $isDark }) => ($isDark ? "#2a2a2a" : "#d9d9d9")};
    box-shadow: none;
    margin-top: 16px;
  }

  .ant-table-thead > tr > th {
    background: ${({ $isDark }) => ($isDark ? "#0a0a0a" : "#fafafa")};
    color: ${({ $isDark }) => ($isDark ? "#00ff41" : "#262626")};
    font-weight: 600;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 1px;
    border-bottom: 2px solid
      ${({ $isDark }) => ($isDark ? "#2a2a2a" : "#d9d9d9")};
    font-family: "Roboto Mono", monospace;
  }

  .ant-table-tbody > tr > td {
    border-bottom: 1px solid
      ${({ $isDark }) => ($isDark ? "#2a2a2a" : "#f0f0f0")};
    font-size: 12px;
    color: ${({ $isDark }) => ($isDark ? "#ffffff" : "#595959")};
    font-family: "Roboto Mono", monospace;
  }

  .ant-table-tbody > tr {
    &:hover {
      background: ${({ $isDark }) =>
        $isDark ? "#2a2a2a" : "#f0f5ff"} !important;
    }
  }
`;

const ConsoleText = styled(Text)<{ $isDark: boolean }>`
  font-family: "Roboto Mono", monospace;
  color: ${({ $isDark }) => ($isDark ? "#00ff41" : "#1f1f1f")};
  font-size: 12px;
  background-color: ${({ $isDark }) => ($isDark ? "#1a1a1a" : "#f0f0f0")};
  padding: 2px 6px;
  border-radius: 2px;
  word-break: break-all;
`;

const HeaderTitle = styled(Title)`
  font-family: "Roboto Mono", monospace !important;
  color: #00ff41 !important;
  text-transform: uppercase;
  margin-bottom: 4px !important;
  font-size: 16px !important;
  letter-spacing: 1px;
`;

const MetricDisplay = styled(Flex)<{ $isDark: boolean }>`
  border: 1px solid #00ff41;
  background-color: ${({ $isDark }) => ($isDark ? "#0a0a0a" : "#f0fff0")};
  padding: 8px 16px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-family: "Roboto Mono", monospace;
  box-shadow: 0 0 5px rgba(0, 255, 65, 0.2);
`;

const MetricValue = styled(Text)<{ $isDark: boolean }>`
  font-size: 18px;
  font-weight: 700;
  color: #00ff41; /* Signature neon color */
  text-shadow: 0 0 4px rgba(0, 255, 65, 0.5);
  margin-left: 8px;
`;

const MetricLabel = styled(Text)`
  font-size: 12px;
  text-transform: uppercase;
  color: #909090;
  letter-spacing: 1px;
`;

// --- 2. Main Component ---

const BKBtn = () => {
  const { data, refetch, isLoading: isBackupListLoading } = useBackup();
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const isDark = useAtomValue(darkMode); // Get dark mode state

  const editMutation = useMutation({
    mutationFn: () => {
      return client.post("api/setting/backup");
    },
    onSuccess: async () => {
      messageApi.success(t("utils.success"));
      // Refetch backup list after successful creation
      await refetch();
    },
    onError(error: Err) {
      messageApi.error(error.response.data.message);
    },
  });

  const handleBackup = () => {
    editMutation.mutate();
  };

  const handleOpen = () => {
    setOpen(true);
    refetch(); // Refresh list when modal opens
  };

  const formatBytes = (bytes: number | undefined) => {
    if (bytes === undefined || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
  };

  const handleClose = () => {
    setOpen(false);
  };
  const baseURL = `${window.location.origin.replace("5173", "4000")}`;
  // --- Backup List Table Columns ---
  const backupColumns = [
    {
      title: t("backup.file_name"),
      dataIndex: "file",
      key: "file",
      render: (text: string) => (
        <ConsoleText $isDark={isDark}>{text}</ConsoleText>
      ),
      sorter: (a: any, b: any) => a.file.localeCompare(b.file),
    },
    {
      title: t("backup.size"),
      dataIndex: "size",
      key: "size",
      render: (size: number) => {
        // Simple function to format bytes
        if (size === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(size) / Math.log(k));
        return (size / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
      },
      sorter: (a: any, b: any) => a.size - b.size,
      width: 120,
    },
    {
      title: t("backup.created_at"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: Date) => (
        <ConsoleText $isDark={isDark}>
          {moment(date).format("YYYY-MM-DD HH:mm:ss")}
        </ConsoleText>
      ),
      sorter: (a: any, b: any) =>
        moment(a.createdAt).unix() - moment(b.createdAt).unix(),
      width: 180,
    },
    {
      title: t("backup.actions"),
      key: "actions",
      render: (_: any, record: any) => (
        <Space size="middle">
          {/* Action button for downloading */}
          <Tooltip title={t("backup.download_file")}>
            <IndustrialButton
              type="primary"
              icon={<DownloadOutlined />}
              href={`${baseURL}/api/setting/backup/${record.file}`}
              target="_blank"
              download={record.file}
            />
          </Tooltip>
        </Space>
      ),
      width: 100,
    },
  ];

  return (
    <>
      {contextHolder}
      <IndustrialFloatButton
        icon={<FileProtectOutlined />}
        tooltip={<div>{t("backup.trigger_backup")}</div>}
        onClick={() => handleOpen()}
      />
      <IndustrialModal
        $isDark={isDark}
        title={t("backup.title")}
        onCancel={handleClose}
        onOk={handleClose}
        open={open}
        footer={[
          <IndustrialButton key="close" onClick={handleClose}>
            {t("utils.close")}
          </IndustrialButton>,
        ]}
        width={800}
      >
        <Flex
          justify="space-between"
          align="center"
          style={{ marginBottom: 16 }}
        >
          <HeaderTitle level={5}>
            <HistoryOutlined style={{ marginRight: 8 }} />
            {t("backup.backup_history")}
          </HeaderTitle>
          <IndustrialButton
            className="backup-btn"
            onClick={handleBackup}
            loading={editMutation.isLoading}
            icon={<CloudUploadOutlined />}
          >
            {t("backup.create_new")}
          </IndustrialButton>
        </Flex>

        <MetricDisplay $isDark={isDark} justify="space-between" align="center">
          <MetricLabel>{t("backup.total_disk_usage")}</MetricLabel>
          <MetricValue $isDark={isDark}>
            {formatBytes(data?.totalSize)}
          </MetricValue>
        </MetricDisplay>
        <IndustrialTableContainer $isDark={isDark}>
          <Table
            columns={backupColumns as []}
            dataSource={data?.backups || []}
            loading={isBackupListLoading || editMutation.isLoading}
            rowKey="file"
            pagination={false}
            size="small"
            bordered
            scroll={{ y: 300 }}
            locale={{
              emptyText: (
                <ConsoleText $isDark={isDark}>
                  {t("backup.no_backups")}
                </ConsoleText>
              ),
            }}
          />
        </IndustrialTableContainer>

        <Flex align="center" style={{ marginTop: 16 }}>
          <QuestionCircleFilled
            style={{ color: "#00ff41", marginRight: 8, fontSize: 14 }}
          />
          <ConsoleText $isDark={isDark} style={{ fontSize: 10, opacity: 0.8 }}>
            {t("backup.note")}
          </ConsoleText>
        </Flex>
      </IndustrialModal>
    </>
  );
};

export default BKBtn;
