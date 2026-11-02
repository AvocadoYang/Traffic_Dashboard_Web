import client from "@/api/axiosClient";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { Alert, Button, Flex, message, Modal, Radio, Select, Table, Typography, Upload } from "antd";
import dayjs from "dayjs";
import { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { GhostButton } from "../../ui/primitives";

type FileFormat = "xlsx" | "json";

export type TransferMapOption = { mapId: string; label: string; active: boolean };

/** 後端 /import-map-data/preview 回的檢查結果 */
type ImportCheck = {
  mapName: string;
  newLocations: { locationId: string; areaType: string }[];
  skippedLocations: { locationId: string; reason: string }[];
  droppedWaitArea: { locationId: string; waitArea: string }[];
  newRoads: { spot1Id: string; spot2Id: string }[];
  skippedRoads: { spot1Id: string; spot2Id: string; reason: string }[];
};

type ImportResult = {
  createdLocations: number;
  createdRoads: number;
  skippedLocations: number;
  skippedRoads: number;
  failed: { id: string; reason: string }[];
};

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

/**
 * 點位列表 / 路徑列表上的「匯出」「從檔案匯入」: 一張地圖的點位和路徑存成 xlsx / json.
 * 匯入只新增: 編號已經有的點位、兩點之間已經有的路徑一律略過, 不會改到現有的東西.
 */
const MapDataTransfer: FC<{
  maps: TransferMapOption[];
  defaultMapId: string | null;
  onDone: () => void;
}> = ({ maps, defaultMapId, onDone }) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const firstMap = defaultMapId ?? maps.find((m) => m.active)?.mapId ?? maps[0]?.mapId ?? null;

  // ------------------------------------------------------------ 匯出
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMapId, setExportMapId] = useState<string | null>(firstMap);
  const [format, setFormat] = useState<FileFormat>("xlsx");

  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await client.post(
        "api/setting/export-map-data",
        { mapId: exportMapId, format },
        { responseType: "blob" },
      );
      return res.data as Blob;
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `map_${dayjs().format("YYYYMMDD_HHmm")}.${format}`;
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
  const [importMapId, setImportMapId] = useState<string | null>(firstMap);
  const [file, setFile] = useState<File | null>(null);
  const [check, setCheck] = useState<ImportCheck | null>(null);

  const resetImport = () => {
    setFile(null);
    setCheck(null);
  };

  const formOf = (picked: File) => {
    const form = new FormData();
    form.append("file", picked);
    form.append("mapId", importMapId || "");
    return form;
  };

  const previewMutation = useMutation({
    mutationFn: async (picked: File) => {
      const res = await client.post("api/setting/import-map-data/preview", formOf(picked));
      return res.data as ImportCheck;
    },
    onSuccess: (data, picked) => {
      setFile(picked);
      setCheck(data);
    },
    onError: async (e: ApiError) => {
      resetImport();
      void messageApi.error(await errorMessage(e, t("utils.error")), 8);
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await client.post("api/setting/import-map-data", formOf(file as File));
      return res.data as ImportResult;
    },
    onSuccess: (r) => {
      if (r.failed.length > 0) {
        Modal.warning({
          title: t("map_transfer.partial_failed", { count: r.failed.length }),
          content: r.failed.map((f) => `${f.id}: ${f.reason}`).join("\n"),
          width: 560,
        });
      } else {
        void messageApi.success(
          t("map_transfer.import_done", { locations: r.createdLocations, roads: r.createdRoads }),
          6,
        );
      }
      setImportOpen(false);
      resetImport();
      onDone();
    },
    onError: async (e: ApiError) => {
      void messageApi.error(await errorMessage(e, t("utils.error")), 8);
    },
  });

  const mapOptions = maps.map((m) => ({ value: m.mapId, label: m.label }));
  const importTarget = maps.find((m) => m.mapId === importMapId);
  const nothingToImport = !check || (check.newLocations.length === 0 && check.newRoads.length === 0);

  const skipRows = check
    ? [
        ...check.skippedLocations.map((s) => ({
          key: `l${s.locationId}`,
          kind: t("map_transfer.kind_location"),
          target: s.locationId,
          reason: s.reason,
        })),
        ...check.skippedRoads.map((s) => ({
          key: `r${s.spot1Id}-${s.spot2Id}`,
          kind: t("map_transfer.kind_road"),
          target: `${s.spot1Id} → ${s.spot2Id}`,
          reason: s.reason,
        })),
      ]
    : [];

  return (
    <>
      {contextHolder}
      <GhostButton
        onClick={() => {
          setExportMapId(firstMap);
          setExportOpen(true);
        }}
      >
        <DownloadOutlined />
        {t("map_transfer.export")}
      </GhostButton>
      <GhostButton
        onClick={() => {
          setImportMapId(firstMap);
          setImportOpen(true);
        }}
      >
        <UploadOutlined />
        {t("map_transfer.import")}
      </GhostButton>

      <Modal
        title={t("map_transfer.export_title")}
        open={exportOpen}
        onCancel={() => setExportOpen(false)}
        onOk={() => exportMutation.mutate()}
        okText={t("map_transfer.download")}
        okButtonProps={{ disabled: !exportMapId }}
        confirmLoading={exportMutation.isLoading}
      >
        <Flex vertical gap={12}>
          <Select
            value={exportMapId}
            onChange={setExportMapId}
            options={mapOptions}
            placeholder={t("map_transfer.pick_map")}
          />
          <Radio.Group
            value={format}
            onChange={(e) => setFormat(e.target.value as FileFormat)}
            options={[
              { value: "xlsx", label: t("map_transfer.format_xlsx") },
              { value: "json", label: t("map_transfer.format_json") },
            ]}
          />
          <Typography.Text type="secondary">{t("map_transfer.export_hint")}</Typography.Text>
        </Flex>
      </Modal>

      <Modal
        title={t("map_transfer.import_title")}
        open={importOpen}
        width={720}
        onCancel={() => {
          setImportOpen(false);
          resetImport();
        }}
        onOk={() => importMutation.mutate()}
        okText={
          check
            ? t("map_transfer.import_confirm", {
                locations: check.newLocations.length,
                roads: check.newRoads.length,
              })
            : t("map_transfer.import")
        }
        okButtonProps={{ disabled: nothingToImport }}
        confirmLoading={importMutation.isLoading}
      >
        <Flex vertical gap={12}>
          <Select
            value={importMapId}
            onChange={(id) => {
              setImportMapId(id);
              resetImport();
            }}
            options={mapOptions}
            placeholder={t("map_transfer.pick_target_map")}
          />
          {importTarget && !importTarget.active && (
            <Alert type="warning" showIcon message={t("map_transfer.not_active")} />
          )}
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
              <Button
                icon={<UploadOutlined />}
                loading={previewMutation.isLoading}
                disabled={!importMapId}
              >
                {t("mission_transfer.pick_file")}
              </Button>
            </Upload>
            <Typography.Text type="secondary">
              {file ? file.name : t("map_transfer.import_hint")}
            </Typography.Text>
          </Flex>

          {check && (
            <>
              <Alert
                type={nothingToImport ? "warning" : "success"}
                showIcon
                message={t("map_transfer.summary", {
                  locations: check.newLocations.length,
                  roads: check.newRoads.length,
                  skipped: skipRows.length,
                })}
              />
              {check.droppedWaitArea.length > 0 && (
                <Alert
                  type="info"
                  showIcon
                  message={t("map_transfer.wait_area_missing", {
                    names: [...new Set(check.droppedWaitArea.map((d) => d.waitArea))].join("、"),
                  })}
                />
              )}
              {skipRows.length > 0 && (
                <Table
                  size="small"
                  rowKey="key"
                  dataSource={skipRows}
                  pagination={false}
                  scroll={{ y: 280 }}
                  columns={[
                    { title: t("map_transfer.col_kind"), dataIndex: "kind", width: 70 },
                    { title: t("map_transfer.col_target"), dataIndex: "target", width: 140 },
                    { title: t("map_transfer.col_skip_reason"), dataIndex: "reason" },
                  ]}
                />
              )}
            </>
          )}
        </Flex>
      </Modal>
    </>
  );
};

export default MapDataTransfer;
