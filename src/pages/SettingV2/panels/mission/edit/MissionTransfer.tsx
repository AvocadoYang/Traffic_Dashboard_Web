import client from "@/api/axiosClient";
import { MTType } from "@/api/useMissionTitleDetail";
import { isFork } from "@/utils/globalFunction";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Flex,
  Input,
  message,
  Modal,
  Radio,
  Select,
  Table,
  TableColumnsType,
  Tag,
  Typography,
  Upload,
} from "antd";
import dayjs from "dayjs";
import { useAtomValue } from "jotai";
import { FC, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { GhostButton } from "../../../ui/primitives";

type FileFormat = "xlsx" | "json";
type ImportAction = "create" | "overwrite" | "skip";

/** 後端 /import-mission/preview 回的檢查結果 */
type ImportCheckMission = {
  index: number;
  name: string;
  robotType: string;
  folder: string | null;
  stepCount: number;
  nameTaken: boolean;
  suggestedName: string;
  robotTypeId: string | null;
  blocked: string | null;
  warnings: string[];
};

type ImportCheck = {
  missions: ImportCheckMission[];
  newFolders: string[];
  newTags: string[];
  robotTypes: { id: string; name: string; value: string }[];
};

type PlanRow = { action: ImportAction; name: string; robotTypeId: string | null };

type ApiError = {
  message?: string;
  response?: { data?: { message?: string } | Blob };
};

// 匯出要的是檔案 (blob), 失敗時錯誤訊息也會被包成 blob
const errorMessage = async (e: ApiError, fallback: string) => {
  const data = e?.response?.data;
  if (data instanceof Blob) {
    try {
      return (JSON.parse(await data.text()) as { message?: string }).message || fallback;
    } catch {
      return fallback;
    }
  }
  return data?.message || fallback;
};

const defaultPlan = (m: ImportCheckMission): PlanRow => ({
  action: m.blocked ? "skip" : "create",
  // 同名的預設另存新名稱
  name: m.suggestedName,
  robotTypeId: m.robotTypeId,
});

/**
 * 任務列表上的「匯出任務」「從檔案匯入」: 把任務存成 xlsx / json 帶到別的案場.
 * missions 是列表目前顯示的任務 (照搜尋和資料夾篩過的), 匯出時預設全選.
 */
const MissionTransfer: FC<{ missions: MTType }> = ({ missions }) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const currentMapId = useAtomValue(currentMapIdAtom);

  // 只支援牙叉任務
  const exportable = useMemo(
    () => (missions || []).filter((m) => isFork(m.Robot_types?.value || "")),
    [missions],
  );

  // ------------------------------------------------------------ 匯出
  const [exportOpen, setExportOpen] = useState(false);
  const [exportIds, setExportIds] = useState<string[]>([]);
  const [format, setFormat] = useState<FileFormat>("xlsx");

  const openExport = () => {
    // 預設勾選目前列表上看得到的 (照搜尋和資料夾篩過的)
    setExportIds(exportable.map((m) => m.id));
    setExportOpen(true);
  };

  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await client.post(
        "api/setting/export-mission",
        { ids: exportIds, format },
        { responseType: "blob" },
      );
      return res.data as Blob;
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `missions_${dayjs().format("YYYYMMDD_HHmm")}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setExportOpen(false);
    },
    onError: async (e: ApiError) => {
      void messageApi.error(await errorMessage(e, t("utils.error")), 6);
    },
  });

  // ------------------------------------------------------------ 匯入
  const [importOpen, setImportOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [check, setCheck] = useState<ImportCheck | null>(null);
  const [plan, setPlan] = useState<PlanRow[]>([]);

  const resetImport = () => {
    setFile(null);
    setCheck(null);
    setPlan([]);
  };

  const previewMutation = useMutation({
    mutationFn: async (picked: File) => {
      const form = new FormData();
      form.append("file", picked);
      const res = await client.post("api/setting/import-mission/preview", form);
      return res.data as ImportCheck;
    },
    onSuccess: (data, picked) => {
      setFile(picked);
      setCheck(data);
      setPlan(data.missions.map(defaultPlan));
    },
    onError: async (e: ApiError) => {
      resetImport();
      void messageApi.error(await errorMessage(e, t("utils.error")), 8);
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("file", file as File);
      form.append("currentMapId", currentMapId || "");
      form.append(
        "plan",
        JSON.stringify(plan.map((row, index) => ({ index, ...row }))),
      );
      const res = await client.post("api/setting/import-mission", form);
      return res.data as { created: number; overwritten: number };
    },
    onSuccess: async ({ created, overwritten }) => {
      void messageApi.success(
        t("mission_transfer.import_done", { created, overwritten }),
        6,
      );
      setImportOpen(false);
      resetImport();
      await queryClient.refetchQueries({ queryKey: ["all-mission-title-detail"] });
      await queryClient.refetchQueries({ queryKey: ["all-relate-task"] });
      await queryClient.refetchQueries({ queryKey: ["mission-folder"] });
    },
    onError: async (e: ApiError) => {
      void messageApi.error(await errorMessage(e, t("utils.error")), 8);
    },
  });

  const editPlan = (index: number, change: Partial<PlanRow>) =>
    setPlan((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...change } : row)),
    );

  const changeAction = (m: ImportCheckMission, action: ImportAction) =>
    editPlan(m.index, {
      action,
      // 覆蓋是蓋掉同名的那一個; 另存新名稱先帶建議的名稱
      name: action === "overwrite" ? m.name : m.suggestedName,
    });

  const importCount = plan.filter((row) => row.action !== "skip").length;
  const needRobotType = plan.some(
    (row) => row.action !== "skip" && !row.robotTypeId,
  );

  const importColumns: TableColumnsType<ImportCheckMission> = [
    {
      title: t("mission.add_mission.name"),
      dataIndex: "name",
      render: (name: string, m) => (
        <Flex vertical gap={2}>
          <span>{name}</span>
          {m.nameTaken && <Tag color="orange">{t("mission_transfer.name_taken")}</Tag>}
        </Flex>
      ),
    },
    {
      title: t("mission_transfer.step_count"),
      dataIndex: "stepCount",
      width: 70,
    },
    {
      title: t("mission_transfer.action"),
      width: 150,
      render: (_, m) =>
        m.blocked ? (
          <Tag color="red">{m.blocked}</Tag>
        ) : (
          <Select<ImportAction>
            style={{ width: 140 }}
            value={plan[m.index]?.action}
            onChange={(action) => changeAction(m, action)}
            options={[
              {
                value: "create",
                label: m.nameTaken
                  ? t("mission_transfer.action_rename")
                  : t("mission_transfer.action_create"),
              },
              ...(m.nameTaken
                ? [{ value: "overwrite" as const, label: t("mission_transfer.action_overwrite") }]
                : []),
              { value: "skip", label: t("mission_transfer.action_skip") },
            ]}
          />
        ),
    },
    {
      title: t("mission_transfer.import_as"),
      render: (_, m) => {
        const row = plan[m.index];
        if (!row || row.action === "skip") return "-";
        if (row.action === "overwrite") return row.name;
        return (
          <Input
            value={row.name}
            onChange={(e) => editPlan(m.index, { name: e.target.value })}
          />
        );
      },
    },
    {
      title: t("mission.add_mission.car"),
      width: 180,
      render: (_, m) => {
        const row = plan[m.index];
        if (!row || row.action === "skip") return "-";
        // 檔案裡的車種代號這個案場有就直接用, 沒有才要選
        if (m.robotTypeId) {
          return check?.robotTypes.find((r) => r.id === m.robotTypeId)?.name;
        }
        return (
          <Select
            style={{ width: 170 }}
            status={row.robotTypeId ? undefined : "error"}
            placeholder={t("mission_transfer.pick_robot_type", { type: m.robotType || "-" })}
            value={row.robotTypeId}
            onChange={(robotTypeId: string) => editPlan(m.index, { robotTypeId })}
            options={check?.robotTypes.map((r) => ({ value: r.id, label: r.name }))}
          />
        );
      },
    },
    {
      title: t("mission_transfer.warnings"),
      width: 90,
      render: (_, m) =>
        m.warnings.length > 0 ? (
          <Tag color="gold">{m.warnings.length}</Tag>
        ) : (
          "-"
        ),
    },
  ];

  return (
    <>
      {contextHolder}
      <GhostButton onClick={openExport}>
        <DownloadOutlined />
        {t("mission_transfer.export")}
      </GhostButton>
      <GhostButton onClick={() => setImportOpen(true)}>
        <UploadOutlined />
        {t("mission_transfer.import")}
      </GhostButton>

      <Modal
        title={t("mission_transfer.export_title")}
        open={exportOpen}
        width={720}
        onCancel={() => setExportOpen(false)}
        onOk={() => exportMutation.mutate()}
        okText={t("mission_transfer.download", { count: exportIds.length })}
        okButtonProps={{ disabled: exportIds.length === 0 }}
        confirmLoading={exportMutation.isLoading}
      >
        <Flex vertical gap={12}>
          <Radio.Group
            value={format}
            onChange={(e) => setFormat(e.target.value as FileFormat)}
            options={[
              { value: "xlsx", label: t("mission_transfer.format_xlsx") },
              { value: "json", label: t("mission_transfer.format_json") },
            ]}
          />
          <Typography.Text type="secondary">
            {t("mission_transfer.export_hint")}
          </Typography.Text>
          <Table
            size="small"
            rowKey="id"
            dataSource={exportable}
            pagination={false}
            scroll={{ y: 360 }}
            rowSelection={{
              selectedRowKeys: exportIds,
              onChange: (keys) => setExportIds(keys as string[]),
            }}
            columns={[
              { title: t("mission.add_mission.name"), dataIndex: "name" },
              {
                title: t("mission.add_mission.folder"),
                width: 180,
                render: (_, m) => m.mission_folder?.name || "-",
              },
            ]}
          />
        </Flex>
      </Modal>

      <Modal
        title={t("mission_transfer.import_title")}
        open={importOpen}
        width={1040}
        onCancel={() => {
          setImportOpen(false);
          resetImport();
        }}
        onOk={() => importMutation.mutate()}
        okText={t("mission_transfer.import_confirm", { count: importCount })}
        okButtonProps={{
          disabled: !check || importCount === 0 || needRobotType,
        }}
        confirmLoading={importMutation.isLoading}
      >
        <Flex vertical gap={12}>
          <Flex gap={12} align="center">
            <Upload
              accept=".xlsx,.json"
              maxCount={1}
              showUploadList={false}
              beforeUpload={(picked) => {
                previewMutation.mutate(picked);
                // 不讓 antd 自己上傳
                return false;
              }}
            >
              <Button icon={<UploadOutlined />} loading={previewMutation.isLoading}>
                {t("mission_transfer.pick_file")}
              </Button>
            </Upload>
            <Typography.Text type="secondary">
              {file ? file.name : t("mission_transfer.import_hint")}
            </Typography.Text>
          </Flex>

          {check && (
            <>
              {(check.newFolders.length > 0 || check.newTags.length > 0) && (
                <Alert
                  type="info"
                  showIcon
                  message={[
                    check.newFolders.length > 0 &&
                      t("mission_transfer.new_folders", {
                        names: check.newFolders.join("、"),
                      }),
                    check.newTags.length > 0 &&
                      t("mission_transfer.new_tags", {
                        names: check.newTags.join("、"),
                      }),
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              )}
              {check.missions.some((m) => m.warnings.length > 0) && (
                <Alert
                  type="warning"
                  showIcon
                  message={t("mission_transfer.warning_hint")}
                />
              )}
              <Table
                size="small"
                rowKey="index"
                dataSource={check.missions}
                columns={importColumns}
                pagination={false}
                scroll={{ y: 420 }}
                expandable={{
                  rowExpandable: (m) => m.warnings.length > 0,
                  expandedRowRender: (m) => (
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {m.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  ),
                }}
              />
            </>
          )}
        </Flex>
      </Modal>
    </>
  );
};

export default MissionTransfer;
