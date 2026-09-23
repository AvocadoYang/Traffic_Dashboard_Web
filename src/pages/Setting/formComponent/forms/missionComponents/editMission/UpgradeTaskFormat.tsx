import { Alert, Button, message, Modal, Skeleton, Table, Tooltip, Typography } from "antd";
import { SyncOutlined } from "@ant-design/icons";
import { FC, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";

type UpgradeResult = {
  dryRun: boolean;
  total: number;
  needUpgrade: number;
  upgraded: number;
  latest: number;
  notFork: number;
  skipped: { id: string; missionName: string; order: number; reason: string }[];
  warnings: { id: string; missionName: string; message: string }[];
  backupFile: string | null;
};

// 把全部任務更新成最新格式，解決派任務時的 0026「任務內容包含舊格式」。
// 先預檢 (dryRun) 讓使用者看到會改哪些、哪些無法自動轉換，確認後才真的寫入。
const UpgradeTaskFormat: FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<UpgradeResult | null>(null);

  const call = (dryRun: boolean) =>
    client
      .post<UpgradeResult>("api/setting/upgrade-all-task-format", { dryRun })
      .then((r) => r.data);

  const checkMutation = useMutation({
    mutationFn: () => call(true),
    onSuccess: (data) => setPreview(data),
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const upgradeMutation = useMutation({
    mutationFn: () => call(false),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries();
      setOpen(false);
      setPreview(null);
      Modal.success({
        title: t("mission.upgrade_format.done_title"),
        content: (
          <div>
            <div>
              {t("mission.upgrade_format.done_desc", { n: data.upgraded })}
            </div>
            {data.backupFile && (
              <Typography.Paragraph
                type="secondary"
                copyable
                style={{ marginTop: 8, wordBreak: "break-all" }}
              >
                {t("mission.upgrade_format.backup")}: {data.backupFile}
              </Typography.Paragraph>
            )}
          </div>
        ),
      });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleOpen = () => {
    setPreview(null);
    setOpen(true);
    checkMutation.mutate();
  };

  const handleClose = () => {
    if (upgradeMutation.isPending) return;
    setOpen(false);
    setPreview(null);
  };

  const allLatest = preview !== null && preview.needUpgrade === 0;

  return (
    <>
      {contextHolder}
      <Tooltip title={t("mission.upgrade_format.tooltip")}>
        <Button icon={<SyncOutlined />} onClick={handleOpen} block>
          {t("mission.upgrade_format.button")}
        </Button>
      </Tooltip>

      <Modal
        title={t("mission.upgrade_format.title")}
        open={open}
        onCancel={handleClose}
        width={640}
        destroyOnHidden
        okText={t("mission.upgrade_format.confirm")}
        cancelText={t("utils.cancel")}
        okButtonProps={{
          disabled: !preview || allLatest,
          loading: upgradeMutation.isPending,
        }}
        onOk={() => upgradeMutation.mutate()}
      >
        {!preview ? (
          <Skeleton active />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {allLatest ? (
              <Alert
                type="success"
                showIcon
                title={t("mission.upgrade_format.all_latest", {
                  n: preview.total,
                })}
              />
            ) : (
              <Alert
                type="info"
                showIcon
                title={t("mission.upgrade_format.summary", {
                  total: preview.total,
                  need: preview.needUpgrade,
                })}
                description={
                  <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                    <li>{t("mission.upgrade_format.change_level")}</li>
                    <li>{t("mission.upgrade_format.change_fork")}</li>
                    <li>{t("mission.upgrade_format.change_fields")}</li>
                    <li>{t("mission.upgrade_format.backup_note")}</li>
                  </ul>
                }
              />
            )}

            {preview.warnings.length > 0 && (
              <Alert
                type="warning"
                showIcon
                title={t("mission.upgrade_format.warnings", {
                  n: preview.warnings.length,
                })}
                description={
                  <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                    {preview.warnings.map((w) => (
                      <li key={w.id}>
                        {w.missionName}: {w.message}
                      </li>
                    ))}
                  </ul>
                }
              />
            )}

            {preview.skipped.length > 0 && (
              <>
                <Alert
                  type="error"
                  showIcon
                  title={t("mission.upgrade_format.skipped", {
                    n: preview.skipped.length,
                  })}
                  description={t("mission.upgrade_format.skipped_desc")}
                />
                <Table
                  size="small"
                  rowKey="id"
                  pagination={{ pageSize: 5, hideOnSinglePage: true }}
                  dataSource={preview.skipped}
                  columns={[
                    {
                      title: t("mission.upgrade_format.col_mission"),
                      dataIndex: "missionName",
                    },
                    {
                      title: t("mission.upgrade_format.col_step"),
                      dataIndex: "order",
                      width: 80,
                      render: (v: number) => v + 1,
                    },
                    {
                      title: t("mission.upgrade_format.col_reason"),
                      dataIndex: "reason",
                    },
                  ]}
                />
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};

export default UpgradeTaskFormat;
