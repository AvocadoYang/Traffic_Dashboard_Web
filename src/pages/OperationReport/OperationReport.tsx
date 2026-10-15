import { FC, ReactNode, useMemo, useState } from "react";
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Segmented,
  Select,
  Spin,
  Table,
  Tabs,
  Tooltip as AntTooltip,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  BarChartOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import Layout, { Content } from "antd/es/layout/layout";
import dayjs, { Dayjs } from "dayjs";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Header from "@/components/Header";
import client from "@/api/axiosClient";
import useOperationReport, {
  OperationReport as Report,
  ReportAlarm,
  ReportQuery,
  ReportScope,
  ReportVehicle,
  TIME_CLASSES,
  TimeClass,
  reportParams,
  useReportOptions,
} from "@/api/useOperationReport";
import useBatteryReport from "@/api/useBatteryReport";
import {
  CATEGORICAL_PALETTE,
  CHART_GRID,
  CHART_TEXT_SECONDARY,
  SEQUENTIAL_BLUE,
} from "@/pages/MissionDispatchBoard/chartPalette";
import BatteryReportBody from "./BatteryReport";
import {
  ChartBox,
  Panel,
  PanelBody,
  PanelHead,
  PanelHint,
  PanelTitle,
  TIME_COLOR,
  Tile,
  TileLabel,
  TileValue,
  Tiles,
  TwoColumns,
  legendOrder,
  legendText,
} from "./reportParts";
import { mq } from "@/styles/responsive";

const { RangePicker } = DatePicker;

const StyledLayout = styled(Layout)`
  height: var(--app-height);
  overflow: hidden;
`;

const StyledContent = styled(Content)`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-sm);
  background: var(--c-bg-muted);

  ${mq.pad} {
    padding: var(--space-md);
  }
`;

const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);

  .ant-picker {
    flex: 1 1 320px;
    min-width: 0;
  }
  .vehicle-select {
    flex: 1 1 240px;
    min-width: 0;
  }
`;

const FilterButtons = styled.div`
  display: flex;
  gap: var(--space-sm);
  margin-left: auto;
`;

const pad2 = (n: number) => String(n).padStart(2, "0");

/** 秒數 → m:ss 或 h:mm:ss */
export const formatDuration = (sec: number | null): string => {
  if (sec === null || !Number.isFinite(sec)) return "—";
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = s % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(rest)}` : `${m}:${pad2(rest)}`;
};

const formatHours = (sec: number) => `${(sec / 3600).toFixed(1)} h`;

const percent = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 1000) / 10 : 0;

type ReportTab = "overview" | "battery";

const EXPORT_PATH: Record<ReportTab, string> = {
  overview: "api/report/operation/xlsx",
  battery: "api/report/battery/xlsx",
};

const EXPORT_NAME: Record<ReportTab, string> = {
  overview: "operation_report",
  battery: "battery_report",
};

type Preset = "today" | "yesterday" | "last7" | "thisMonth";

const presetRange = (preset: Preset): [Dayjs, Dayjs] => {
  const now = dayjs();
  switch (preset) {
    case "yesterday":
      return [now.subtract(1, "day").startOf("day"), now.startOf("day")];
    case "last7":
      return [now.subtract(6, "day").startOf("day"), now.endOf("day")];
    case "thisMonth":
      return [now.startOf("month"), now.endOf("day")];
    case "today":
    default:
      return [now.startOf("day"), now.endOf("day")];
  }
};

const OperationReport: FC = () => {
  const { t, i18n } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => presetRange("today"));
  const [scope, setScope] = useState<ReportScope>("all");
  const [amrIds, setAmrIds] = useState<string[]>([]);
  // 按下「查詢」才換條件, 不然每改一個欄位就重查一次
  const [query, setQuery] = useState<ReportQuery>(() => ({
    from: presetRange("today")[0].valueOf(),
    to: presetRange("today")[1].valueOf(),
    scope: "all",
    amrIds: [],
  }));

  // 總覽 / 電量紀錄; 切到哪一頁才查哪一頁
  const [tab, setTab] = useState<ReportTab>("overview");

  const options = useReportOptions();
  const overview = useOperationReport(tab === "overview" ? query : null);
  const battery = useBatteryReport(tab === "battery" ? query : null);
  const { data, isFetching, error, refetch } = tab === "overview" ? overview : battery;

  const vehicleOptions = useMemo(
    () =>
      (options.data?.vehicles ?? [])
        .filter((v) =>
          scope === "all" ? true : scope === "simulated" ? v.isSimulated : !v.isSimulated,
        )
        .map((v) => ({
          value: v.amrId,
          label: v.isSimulated ? `${v.amrId} (${t("report.simulated_tag")})` : v.amrId,
        })),
    [options.data, scope, t],
  );

  const apply = () => {
    const next = { from: range[0].valueOf(), to: range[1].valueOf(), scope, amrIds };
    if (JSON.stringify(next) === JSON.stringify(query)) void refetch();
    else setQuery(next);
  };

  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await client.get(EXPORT_PATH[tab], {
        params: reportParams(query, i18n.language === "en" ? "en" : "tw"),
        responseType: "blob",
      });
      return res.data as Blob;
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${EXPORT_NAME[tab]}_${dayjs(query.from).format("YYYYMMDDHHmm")}_${dayjs(
        query.to,
      ).format("YYYYMMDDHHmm")}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      void messageApi.success(t("report.export_done"));
    },
    onError: () => void messageApi.error(t("report.export_failed")),
  });

  const errorText = (error as { response?: { data?: { message?: string } } } | null)
    ?.response?.data?.message;

  return (
    <StyledLayout>
      <Header />
      <StyledContent>
        {contextHolder}

        <Panel>
          <PanelHead>
            <PanelTitle>
              <BarChartOutlined />
              {t("page_report")}
            </PanelTitle>
            <PanelHint>{t("report.hint")}</PanelHint>
          </PanelHead>
          <PanelBody>
            <Filters>
              <RangePicker
                value={range}
                showTime={{ format: "HH:mm" }}
                format="YYYY-MM-DD HH:mm"
                allowClear={false}
                presets={(["today", "yesterday", "last7", "thisMonth"] as Preset[]).map((p) => ({
                  label: t(`report.preset.${p}`),
                  value: presetRange(p),
                }))}
                onChange={(v) => {
                  if (v && v[0] && v[1]) setRange([v[0], v[1]]);
                }}
              />
              <Segmented<ReportScope>
                value={scope}
                onChange={(v) => {
                  setScope(v);
                  setAmrIds([]);
                }}
                options={[
                  { label: t("report.scope.all"), value: "all" },
                  { label: t("report.scope.real"), value: "real" },
                  { label: t("report.scope.simulated"), value: "simulated" },
                ]}
              />
              <Select
                className="vehicle-select"
                mode="multiple"
                allowClear
                value={amrIds}
                onChange={setAmrIds}
                options={vehicleOptions}
                placeholder={t("report.all_vehicles")}
                maxTagCount="responsive"
              />
              <FilterButtons>
                <Button type="primary" icon={<ReloadOutlined />} onClick={apply} loading={isFetching}>
                  {t("report.query")}
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => exportMutation.mutate()}
                  loading={exportMutation.isLoading}
                  disabled={!data}
                >
                  {t("report.export")}
                </Button>
              </FilterButtons>
            </Filters>
          </PanelBody>
        </Panel>

        <Tabs
          className="report-tabs"
          activeKey={tab}
          onChange={(k) => setTab(k as ReportTab)}
          items={[
            { key: "overview", label: t("report.tab.overview") },
            { key: "battery", label: t("report.tab.battery") },
          ]}
        />

        {error ? (
          <Alert type="error" showIcon message={errorText || t("report.load_failed")} />
        ) : null}

        {!data ? (
          <Spin spinning={isFetching}>
            <Empty description={t("report.no_data")} />
          </Spin>
        ) : (
          <Spin spinning={isFetching}>
            {tab === "overview" ? (
              <ReportBody report={overview.data as Report} />
            ) : (
              <BatteryReportBody report={battery.data!} />
            )}
          </Spin>
        )}
      </StyledContent>
    </StyledLayout>
  );
};

const ReportBody: FC<{ report: Report }> = ({ report }) => {
  const { t } = useTranslation();
  const s = report.summary;

  type TileKey =
    | "transport_done"
    | "per_hour"
    | "avg_wait"
    | "p90_wait"
    | "avg_run"
    | "canceled"
    | "give_way"
    | "charge"
    | "distance";
  const tiles: { key: TileKey; value: ReactNode; hint?: string }[] = [
    { key: "transport_done", value: s.transportDone, hint: t("report.tile_hint.transport_done") },
    { key: "per_hour", value: s.perHour.toFixed(1) },
    { key: "avg_wait", value: formatDuration(s.avgWaitSec), hint: t("report.tile_hint.avg_wait") },
    { key: "p90_wait", value: formatDuration(s.p90WaitSec), hint: t("report.tile_hint.p90_wait") },
    { key: "avg_run", value: formatDuration(s.avgRunSec), hint: t("report.tile_hint.avg_run") },
    { key: "canceled", value: s.transportCanceled },
    { key: "give_way", value: s.giveWayCount, hint: t("report.tile_hint.give_way") },
    { key: "charge", value: s.chargeCount },
    { key: "distance", value: `${s.distanceKm.toFixed(1)} km` },
  ];

  return (
    <>
      {!report.onlineRecorded && (
        <Alert type="warning" showIcon message={t("report.no_online_records")} />
      )}

      <Tiles>
        {tiles.map((tile) => (
          <Tile key={tile.key}>
            <TileLabel>
              {t(`report.tile.${tile.key}`)}{" "}
              {tile.hint && (
                <AntTooltip title={tile.hint}>
                  <InfoCircleOutlined />
                </AntTooltip>
              )}
            </TileLabel>
            <TileValue>{tile.value}</TileValue>
          </Tile>
        ))}
      </Tiles>

      <Panel>
        <PanelHead>
          <PanelTitle>
            {report.bucket === "hour" ? t("report.per_hour_title") : t("report.per_day_title")}
          </PanelTitle>
          <PanelHint>{t("report.per_bucket_hint")}</PanelHint>
        </PanelHead>
        <PanelBody>
          <BucketChart report={report} />
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHead>
          <PanelTitle>{t("report.time_split_title")}</PanelTitle>
          <PanelHint>{t("report.time_split_hint")}</PanelHint>
        </PanelHead>
        <PanelBody>
          <TimeSplitChart vehicles={report.vehicles} />
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHead>
          <PanelTitle>{t("report.vehicle_table_title")}</PanelTitle>
        </PanelHead>
        <PanelBody>
          <VehicleTable vehicles={report.vehicles} />
        </PanelBody>
      </Panel>

      <TwoColumns>
        <Panel>
          <PanelHead>
            <PanelTitle>{t("report.alarm_title")}</PanelTitle>
            <PanelHint>{t("report.alarm_hint")}</PanelHint>
          </PanelHead>
          <PanelBody>
            <AlarmTable alarms={report.alarms} />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHead>
            <PanelTitle>{t("report.other_title")}</PanelTitle>
          </PanelHead>
          <PanelBody>
            <Table
              size="small"
              rowKey={(r) => String(r.reason)}
              pagination={false}
              dataSource={report.summary.cancelReasons}
              locale={{ emptyText: t("report.no_cancel") }}
              columns={[
                {
                  title: t("report.col.cancel_reason"),
                  dataIndex: "label",
                  render: (v: string, r) => v || String(r.reason ?? "—"),
                },
                { title: t("report.col.count"), dataIndex: "count", width: 90, align: "right" },
              ]}
            />
            <div style={{ height: 16 }} />
            <Table
              size="small"
              rowKey="name"
              pagination={false}
              dataSource={report.missionNames}
              locale={{ emptyText: t("report.no_transport") }}
              columns={[
                { title: t("report.col.mission_name"), dataIndex: "name" },
                { title: t("report.col.count"), dataIndex: "count", width: 90, align: "right" },
              ]}
            />
          </PanelBody>
        </Panel>
      </TwoColumns>
    </>
  );
};

const BucketChart: FC<{ report: Report }> = ({ report }) => {
  const { t } = useTranslation();
  const rows = report.buckets.map((b) => ({
    label: dayjs(b.start).format(report.bucket === "hour" ? "MM-DD HH:00" : "MM-DD"),
    done: b.transportDone,
    waitMin: b.avgWaitSec === null ? null : Math.round((b.avgWaitSec / 60) * 10) / 10,
    runMin: b.avgRunSec === null ? null : Math.round((b.avgRunSec / 60) * 10) / 10,
  }));
  if (!rows.length) return <Empty description={t("report.no_data")} />;

  return (
    <ChartBox $height={300}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART_GRID} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: CHART_TEXT_SECONDARY, fontSize: 11 }} minTickGap={16} />
          <YAxis
            yAxisId="count"
            allowDecimals={false}
            tick={{ fill: CHART_TEXT_SECONDARY, fontSize: 11 }}
            width={40}
          />
          <YAxis
            yAxisId="min"
            orientation="right"
            tick={{ fill: CHART_TEXT_SECONDARY, fontSize: 11 }}
            width={40}
            unit="m"
          />
          <Tooltip />
          <Legend formatter={legendText} itemSorter={legendOrder(["done", "waitMin", "runMin"])} />
          <Bar
            yAxisId="count"
            dataKey="done"
            name={t("report.series.done")}
            fill={SEQUENTIAL_BLUE}
            radius={[2, 2, 0, 0]}
          />
          <Line
            yAxisId="min"
            dataKey="waitMin"
            name={t("report.series.wait_min")}
            stroke={CATEGORICAL_PALETTE[1]}
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="min"
            dataKey="runMin"
            name={t("report.series.run_min")}
            stroke={CATEGORICAL_PALETTE[2]}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartBox>
  );
};

const TimeSplitChart: FC<{ vehicles: ReportVehicle[] }> = ({ vehicles }) => {
  const { t } = useTranslation();
  if (!vehicles.length) return <Empty description={t("report.no_vehicle")} />;

  const rows = vehicles.map((v) => {
    const total = TIME_CLASSES.reduce((sum, c) => sum + v.timeSec[c], 0);
    const row: Record<string, string | number> = { amrId: v.amrId };
    TIME_CLASSES.forEach((c) => {
      row[c] = percent(v.timeSec[c], total);
      row[`${c}_sec`] = v.timeSec[c];
    });
    return row;
  });

  return (
    <ChartBox $height={Math.max(160, 40 + rows.length * 30)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid stroke={CHART_GRID} horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            unit="%"
            tick={{ fill: CHART_TEXT_SECONDARY, fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="amrId"
            width={150}
            tick={{ fill: CHART_TEXT_SECONDARY, fontSize: 11 }}
          />
          <Tooltip
            formatter={(value, name, item) => {
              const cls = TIME_CLASSES.find((c) => t(`report.time.${c}`) === name);
              const sec = cls ? Number((item?.payload as Record<string, number>)?.[`${cls}_sec`] ?? 0) : 0;
              return [`${value}% (${formatHours(sec)})`, name];
            }}
          />
          <Legend formatter={legendText} itemSorter={legendOrder(TIME_CLASSES)} />
          {TIME_CLASSES.map((c) => (
            <Bar key={c} dataKey={c} stackId="time" name={t(`report.time.${c}`)} fill={TIME_COLOR[c]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartBox>
  );
};

const VehicleTable: FC<{ vehicles: ReportVehicle[] }> = ({ vehicles }) => {
  const { t } = useTranslation();
  const total = (v: ReportVehicle) => TIME_CLASSES.reduce((sum, c) => sum + v.timeSec[c], 0);
  const share = (c: TimeClass) => (v: ReportVehicle) => percent(v.timeSec[c], total(v));

  const columns: TableColumnsType<ReportVehicle> = [
    { title: t("report.col.vehicle"), dataIndex: "amrId", fixed: "left", width: 170 },
    {
      title: t("report.col.transport_done"),
      dataIndex: "transportDone",
      align: "right",
      sorter: (a, b) => a.transportDone - b.transportDone,
    },
    {
      title: t("report.col.canceled"),
      dataIndex: "transportCanceled",
      align: "right",
      sorter: (a, b) => a.transportCanceled - b.transportCanceled,
    },
    {
      title: t("report.col.avg_run"),
      dataIndex: "avgRunSec",
      align: "right",
      render: (v: number | null) => formatDuration(v),
      sorter: (a, b) => (a.avgRunSec ?? 0) - (b.avgRunSec ?? 0),
    },
    {
      title: t("report.col.distance"),
      dataIndex: "distanceKm",
      align: "right",
      render: (v: number) => v.toFixed(2),
      sorter: (a, b) => a.distanceKm - b.distanceKm,
    },
    {
      title: t("report.col.give_way"),
      dataIndex: "giveWayCount",
      align: "right",
      sorter: (a, b) => a.giveWayCount - b.giveWayCount,
    },
    {
      title: t("report.col.charge"),
      dataIndex: "chargeCount",
      align: "right",
      sorter: (a, b) => a.chargeCount - b.chargeCount,
    },
    ...(["transport", "charge", "idle", "offline"] as TimeClass[]).map((c) => ({
      title: `${t(`report.time.${c}`)} %`,
      key: c,
      align: "right" as const,
      render: (_: unknown, v: ReportVehicle) => share(c)(v),
      sorter: (a: ReportVehicle, b: ReportVehicle) => share(c)(a) - share(c)(b),
    })),
  ];

  return (
    <Table<ReportVehicle>
      size="small"
      rowKey="amrId"
      dataSource={vehicles}
      columns={columns}
      pagination={false}
      scroll={{ x: "max-content" }}
      locale={{ emptyText: t("report.no_vehicle") }}
    />
  );
};

const AlarmTable: FC<{ alarms: ReportAlarm[] }> = ({ alarms }) => {
  const { t } = useTranslation();
  const columns: TableColumnsType<ReportAlarm> = [
    {
      title: t("report.col.kind"),
      dataIndex: "kind",
      width: 90,
      render: (v: ReportAlarm["kind"]) => t(`report.alarm_kind.${v}`),
      filters: (["alarm", "warning", "system"] as const).map((k) => ({
        text: t(`report.alarm_kind.${k}`),
        value: k,
      })),
      onFilter: (value, r) => r.kind === value,
    },
    { title: t("report.col.code"), dataIndex: "code", width: 70 },
    { title: t("report.col.label"), dataIndex: "label", render: (v: string) => v || "—" },
    {
      title: t("report.col.count"),
      dataIndex: "count",
      width: 70,
      align: "right",
      sorter: (a, b) => a.count - b.count,
      defaultSortOrder: "descend",
    },
    {
      title: t("report.col.total_time"),
      dataIndex: "totalSec",
      width: 100,
      align: "right",
      render: (v: number | null) => (v === null ? "—" : formatDuration(v)),
    },
    {
      title: t("report.col.vehicles"),
      dataIndex: "vehicles",
      render: (v: string[]) => v.join(", "),
    },
  ];
  return (
    <Table<ReportAlarm>
      size="small"
      rowKey={(r) => `${r.kind}:${r.code}`}
      dataSource={alarms}
      columns={columns}
      pagination={{ pageSize: 10, size: "small" }}
      scroll={{ x: "max-content" }}
      locale={{ emptyText: t("report.no_alarm") }}
    />
  );
};

export default OperationReport;
