import { FC, useEffect, useMemo, useState } from "react";
import { Select, Table, message } from "antd";
import type { TableColumnsType } from "antd";
import { CloudServerOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import {
  commitTime,
  VEHICLE_VERSIONS_KEY,
  VehicleVersionChange,
  VehicleVersionRow,
  useVehicleVersionHistory,
  useVehicleVersions,
} from "@/api/useVehicleVersions";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import {
  Hint,
  Section,
  SectionTitle,
  SolidButton,
  Tag,
  Toolbar,
  WarnNote,
} from "@/pages/SettingV3/ui/primitives";

/** 多久沒收到心跳就當成離線 (心跳大約每 2 秒一次) */
const ONLINE_MS = 30_000;
const NONE = "__none__";

const time = (ms: number | null) => (ms === null ? "-" : new Date(ms).toLocaleString([], { hour12: false }));

/**
 * 設定 > 系統維護 > 車輛軟體版本: 每台車上 amr-core 的版本 (心跳回報的), 最低版本 (低於它發系統告警,
 * 照常派車), 版本更新紀錄。版本是 git commit 編號, 新舊用 commit 時間比。
 */
const VehicleVersionSection: FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const { data } = useVehicleVersions();
  const { data: history } = useVehicleVersionHistory();
  const [minDraft, setMinDraft] = useState<string>(NONE);

  useEffect(() => {
    setMinDraft(data?.min?.version ?? NONE);
  }, [data?.min?.version]);

  const saveMin = useMutation({
    mutationFn: (version: string | null) =>
      client.post("api/setting/vehicle-min-version", { version }),
    onSuccess: () => {
      messageApi.success(t("vehicle_version.saved"));
      queryClient.invalidateQueries({ queryKey: VEHICLE_VERSIONS_KEY });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const now = Date.now();
  const realCars = (data?.cars ?? []).filter((c) => !c.isSimulated);
  const versionsInUse = useMemo(
    () => new Set(realCars.map((c) => c.version).filter(Boolean)),
    [realCars],
  );
  const belowCount = realCars.filter((c) => c.belowMin).length;

  const columns: TableColumnsType<VehicleVersionRow> = [
    {
      title: t("vehicle_version.col.vehicle"),
      dataIndex: "amrId",
      render: (v: string, r) => (
        <>
          {v} {r.isSimulated && <Tag>{t("vehicle_version.simulated")}</Tag>}
        </>
      ),
    },
    {
      title: t("vehicle_version.col.version"),
      dataIndex: "version",
      render: (v: string | null, r) =>
        v === null ? (
          <span style={{ color: "var(--c-text-secondary)" }}>{t("vehicle_version.not_reported")}</span>
        ) : (
          <span style={{ fontFamily: "Roboto Mono", fontWeight: 600, color: r.belowMin ? "var(--c-danger)" : undefined }}>
            {v}
            {r.belowMin && ` · ${t("vehicle_version.below_min")}`}
          </span>
        ),
    },
    {
      title: t("vehicle_version.col.commit_at"),
      dataIndex: "commitAt",
      render: (v: number | null, r) => (r.version === null ? "-" : commitTime(v) ?? t("vehicle_version.no_commit_time")),
    },
    {
      title: t("vehicle_version.col.since"),
      dataIndex: "since",
      render: (v: number | null) => time(v),
    },
    {
      title: t("vehicle_version.col.last_seen"),
      dataIndex: "lastSeenAt",
      render: (v: number | null) =>
        v === null ? (
          <span style={{ color: "var(--c-text-secondary)" }}>{t("vehicle_version.offline")}</span>
        ) : now - v > ONLINE_MS ? (
          <span style={{ color: "var(--c-text-secondary)" }}>{time(v)}</span>
        ) : (
          t("vehicle_version.online")
        ),
    },
  ];

  const historyColumns: TableColumnsType<VehicleVersionChange> = [
    { title: t("vehicle_version.col.time"), dataIndex: "seenAt", render: (v: number) => time(v) },
    { title: t("vehicle_version.col.vehicle"), dataIndex: "amrId" },
    {
      title: t("vehicle_version.col.change"),
      render: (_: unknown, r) => (
        <span style={{ fontFamily: "Roboto Mono" }}>
          {r.previousVersion ? `${r.previousVersion} → ${r.version}` : `${t("vehicle_version.first_seen")} ${r.version}`}
        </span>
      ),
    },
    {
      title: t("vehicle_version.col.commit_at"),
      dataIndex: "commitAt",
      render: (v: number | null) => commitTime(v) ?? t("vehicle_version.no_commit_time"),
    },
  ];

  const minOptions = [
    { value: NONE, label: t("vehicle_version.no_min") },
    ...(data?.knownVersions ?? []).map((k) => ({
      value: k.version,
      label: `${k.version} · ${commitTime(k.commitAt) ?? t("vehicle_version.no_commit_time")}`,
      // 沒有 commit 時間的 (舊版 amr-core) 比不出新舊, 不能當最低版本
      disabled: k.commitAt === null,
    })),
  ];

  return (
    <Section data-testid="vehicle-version-section">
      {contextHolder}
      <SectionTitle>
        <CloudServerOutlined />
        {t("vehicle_version.title")}
      </SectionTitle>
      <Hint>{t("vehicle_version.hint")}</Hint>

      {belowCount > 0 && <WarnNote>{t("vehicle_version.below_count", { count: belowCount })}</WarnNote>}
      {versionsInUse.size > 1 && (
        <Hint>{t("vehicle_version.mixed", { count: versionsInUse.size })}</Hint>
      )}

      <Toolbar>
        <span>{t("vehicle_version.min_label")}</span>
        <Select
          style={{ minWidth: 320 }}
          value={minDraft}
          options={minOptions}
          onChange={setMinDraft}
          data-testid="vehicle-min-version"
        />
        <SolidButton
          onClick={() => saveMin.mutate(minDraft === NONE ? null : minDraft)}
          disabled={saveMin.isLoading || minDraft === (data?.min?.version ?? NONE)}
        >
          {t("vehicle_version.save")}
        </SolidButton>
      </Toolbar>
      <Hint>{t("vehicle_version.min_hint")}</Hint>

      <Table
        size="small"
        rowKey="amrId"
        pagination={false}
        dataSource={data?.cars ?? []}
        columns={columns}
        scroll={{ x: "max-content" }}
      />

      <SectionTitle style={{ marginTop: 24 }}>{t("vehicle_version.history")}</SectionTitle>
      <Table
        size="small"
        rowKey="id"
        pagination={{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false }}
        dataSource={history ?? []}
        columns={historyColumns}
        scroll={{ x: "max-content" }}
      />
    </Section>
  );
};

export default VehicleVersionSection;
