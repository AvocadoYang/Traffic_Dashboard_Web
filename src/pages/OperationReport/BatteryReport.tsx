import { FC, ReactNode, useEffect, useMemo, useState } from "react";
import { Alert, Empty, Select, Table, Tooltip as AntTooltip } from "antd";
import type { TableColumnsType } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import {
  Area,
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
import {
  BatteryMissionRow,
  BatteryReport as Report,
  BatteryVehicle,
  MISSION_CLASSES,
  MissionClass,
} from "@/api/useBatteryReport";
import {
  CATEGORICAL_PALETTE,
  CHART_GRID,
  CHART_TEXT_SECONDARY,
} from "@/pages/MissionDispatchBoard/chartPalette";
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
  legendOrder,
  legendText,
} from "./reportParts";

// 電量線、耗電、充電、距離各一個固定顏色 (充電跟時間分配的「充電」同色)
const BATTERY_COLOR = CATEGORICAL_PALETTE[0];
const CONSUMED_COLOR = CATEGORICAL_PALETTE[6];
const CHARGED_COLOR = TIME_COLOR.charge;
const DISTANCE_COLOR = CATEGORICAL_PALETTE[2];

const AXIS_TICK = { fill: CHART_TEXT_SECONDARY, fontSize: 11 };
const Y_WIDTH = 48;

const ChartCaption = styled.div`
  margin: var(--space-sm) 0 2px;
  font-size: var(--font-sm);
  color: var(--c-text-muted);
`;

const TipBox = styled.div`
  padding: 6px 10px;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 4px;
  font-size: var(--font-sm);
  color: var(--c-text);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);

  div + div {
    margin-top: 2px;
  }
  .muted {
    color: var(--c-text-muted);
  }
`;

const Swatch = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 6px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
`;

const fmt = (v: number | null, digits = 1, unit = "") =>
  v === null || !Number.isFinite(v) ? "—" : `${v.toFixed(digits)}${unit}`;

/** km 軸的刻度: 短的不帶單位 (標題已經寫了 km), 小數位數看大小 */
const formatKm = (v: number) =>
  v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v >= 0.1 ? v.toFixed(2) : v.toFixed(3);

const formatMinutes = (min: number) =>
  min >= 60 ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m` : `${min}m`;

type TimelineRow = {
  t: number;
  battery: number | null;
  /** 充電中畫到 100 的底色 */
  chargingBand: number | null;
  distanceKm: number;
  missionId: string | null;
} & Partial<Record<MissionClass, number | null>>;

/** 一台車的時間軸資料: 電量、充電底色、每一類任務一條帶子、累計距離 */
const timelineRows = (vehicle: BatteryVehicle, missionById: Map<string, BatteryMissionRow>) =>
  vehicle.series.map((p): TimelineRow => {
    const cls = p.missionId ? missionById.get(p.missionId)?.cls : undefined;
    const row: TimelineRow = {
      t: p.t,
      battery: p.battery,
      chargingBand: p.charging ? 100 : null,
      distanceKm: p.distanceKm,
      missionId: p.missionId,
    };
    MISSION_CLASSES.forEach((c) => {
      row[c] = cls === c ? 1 : null;
    });
    return row;
  });

const BatteryReportBody: FC<{ report: Report }> = ({ report }) => {
  const { t } = useTranslation();
  const [amrId, setAmrId] = useState<string | null>(null);

  // 換了查詢條件, 選的車不在結果裡就改選第一台
  useEffect(() => {
    if (!report.vehicles.some((v) => v.amrId === amrId)) {
      setAmrId(report.vehicles[0]?.amrId ?? null);
    }
  }, [report, amrId]);

  const vehicle = report.vehicles.find((v) => v.amrId === amrId) ?? null;
  const s = report.summary;

  type TileKey =
    | "consumed"
    | "charged"
    | "distance"
    | "missions"
    | "pct_per_km"
    | "drain_per_hour"
    | "charge_per_hour"
    | "charging_time"
    | "charge_sessions";
  type HintKey = Exclude<TileKey, "missions" | "charging_time" | "charge_sessions">;
  const tiles: { key: TileKey; value: ReactNode; hint?: HintKey }[] = [
    { key: "consumed", value: `${s.consumed.toFixed(1)}%`, hint: "consumed" },
    { key: "charged", value: `${s.charged.toFixed(1)}%`, hint: "charged" },
    { key: "distance", value: `${s.distanceKm.toFixed(2)} km`, hint: "distance" },
    { key: "missions", value: s.missions },
    { key: "pct_per_km", value: fmt(s.pctPerKm, 1, "%"), hint: "pct_per_km" },
    { key: "drain_per_hour", value: fmt(s.drainPerHour, 1, "%"), hint: "drain_per_hour" },
    { key: "charge_per_hour", value: fmt(s.chargePerHour, 1, "%"), hint: "charge_per_hour" },
    { key: "charging_time", value: formatMinutes(s.chargingMin) },
    { key: "charge_sessions", value: s.chargeSessions },
  ];

  return (
    <>
      {!report.recorded && (
        <Alert type="warning" showIcon message={t("report.battery.not_recorded")} />
      )}

      <Tiles>
        {tiles.map((tile) => (
          <Tile key={tile.key}>
            <TileLabel>
              {t(`report.battery.tile.${tile.key}`)}{" "}
              {tile.hint && (
                <AntTooltip title={t(`report.battery.tile_hint.${tile.hint}`)}>
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
          <PanelTitle>{t("report.battery.timeline_title")}</PanelTitle>
          <PanelHint>
            {report.stepMin > 1
              ? t("report.battery.step_hint", { min: report.stepMin })
              : t("report.battery.timeline_hint")}
          </PanelHint>
          <Select
            style={{ minWidth: 200 }}
            value={amrId ?? undefined}
            onChange={setAmrId}
            options={report.vehicles.map((v) => ({ value: v.amrId, label: v.amrId }))}
            placeholder={t("report.battery.pick_vehicle")}
          />
        </PanelHead>
        <PanelBody>
          {vehicle ? (
            <Timeline vehicle={vehicle} from={report.from} to={report.to} />
          ) : (
            <Empty description={t("report.battery.no_records")} />
          )}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHead>
          <PanelTitle>
            {report.bucket === "hour"
              ? t("report.battery.per_hour_title")
              : t("report.battery.per_day_title")}
            {vehicle ? ` · ${vehicle.amrId}` : ""}
          </PanelTitle>
          <PanelHint>{t("report.battery.per_bucket_hint")}</PanelHint>
        </PanelHead>
        <PanelBody>
          {vehicle ? (
            <BucketCharts vehicle={vehicle} bucket={report.bucket} />
          ) : (
            <Empty description={t("report.battery.no_records")} />
          )}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHead>
          <PanelTitle>{t("report.battery.vehicle_table_title")}</PanelTitle>
          <PanelHint>{t("report.battery.vehicle_table_hint")}</PanelHint>
        </PanelHead>
        <PanelBody>
          <VehicleTable vehicles={report.vehicles} selected={amrId} onSelect={setAmrId} />
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHead>
          <PanelTitle>
            {t("report.battery.mission_table_title")}
            {vehicle ? ` · ${vehicle.amrId}` : ""}
          </PanelTitle>
          <PanelHint>{t("report.battery.mission_table_hint")}</PanelHint>
        </PanelHead>
        <PanelBody>
          <MissionTable missions={vehicle?.missionList ?? []} />
        </PanelBody>
      </Panel>
    </>
  );
};

const Timeline: FC<{ vehicle: BatteryVehicle; from: number; to: number }> = ({
  vehicle,
  from,
  to,
}) => {
  const { t } = useTranslation();
  const missionById = useMemo(
    () => new Map(vehicle.missionList.map((m) => [m.id, m])),
    [vehicle],
  );
  const rows = useMemo(() => timelineRows(vehicle, missionById), [vehicle, missionById]);
  const usedClasses = MISSION_CLASSES.filter((c) => rows.some((r) => r[c]));
  const multiDay = to - from > 24 * 3600_000;
  const tickFormat = (v: number) => dayjs(v).format(multiDay ? "MM-DD HH:mm" : "HH:mm");

  const tooltip = (
    <Tooltip
      content={({ active, payload }) => {
        const row = (payload?.[0]?.payload ?? null) as TimelineRow | null;
        if (!active || !row) return null;
        const mission = row.missionId ? missionById.get(row.missionId) : undefined;
        return (
          <TipBox>
            <div className="muted">{dayjs(row.t).format("YYYY-MM-DD HH:mm")}</div>
            <div>
              <Swatch $color={BATTERY_COLOR} />
              {t("report.battery.series.battery")}: {fmt(row.battery, 1, "%")}
              {row.chargingBand !== null && ` (${t("report.battery.series.charging")})`}
            </div>
            <div>
              <Swatch $color={mission ? TIME_COLOR[mission.cls] : "transparent"} />
              {t("report.battery.series.mission")}:{" "}
              {mission
                ? `${mission.name} (${t(`report.time.${mission.cls}`)})`
                : t("report.battery.no_mission")}
            </div>
            <div>
              <Swatch $color={DISTANCE_COLOR} />
              {t("report.battery.series.distance")}: {row.distanceKm.toFixed(2)} km
            </div>
          </TipBox>
        );
      }}
    />
  );

  const xAxis = (show: boolean) => (
    <XAxis
      dataKey="t"
      type="number"
      scale="time"
      domain={[from, to]}
      tickFormatter={tickFormat}
      tick={show ? AXIS_TICK : false}
      height={show ? 24 : 4}
      minTickGap={24}
    />
  );
  const margin = { top: 8, right: 16, left: 0, bottom: 0 };

  return (
    <>
      <ChartCaption>{t("report.battery.battery_caption")}</ChartCaption>
      <ChartBox $height={240}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} syncId="battery-timeline" syncMethod="value" margin={margin}>
            <CartesianGrid stroke={CHART_GRID} vertical={false} />
            {xAxis(false)}
            <YAxis domain={[0, 100]} unit="%" tick={AXIS_TICK} width={Y_WIDTH} />
            {tooltip}
            <Legend
              formatter={legendText}
              itemSorter={legendOrder(["battery", "chargingBand"])}
            />
            <Area
              dataKey="chargingBand"
              name={t("report.battery.series.charging")}
              type="stepAfter"
              stroke="none"
              fill={CHARGED_COLOR}
              fillOpacity={0.25}
              isAnimationActive={false}
              activeDot={false}
            />
            <Line
              dataKey="battery"
              name={t("report.battery.series.battery")}
              stroke={BATTERY_COLOR}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartBox>

      <ChartCaption>{t("report.battery.mission_caption")}</ChartCaption>
      <ChartBox $height={usedClasses.length ? 90 : 60}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} syncId="battery-timeline" syncMethod="value" margin={margin}>
            {xAxis(false)}
            <YAxis domain={[0, 1]} tick={false} width={Y_WIDTH} axisLine={false} />
            {tooltip}
            {usedClasses.length > 0 && (
              <Legend formatter={legendText} itemSorter={legendOrder(usedClasses)} />
            )}
            {usedClasses.map((c) => (
              <Area
                key={c}
                dataKey={c}
                name={t(`report.time.${c}`)}
                type="stepAfter"
                stroke="none"
                fill={TIME_COLOR[c]}
                fillOpacity={0.85}
                isAnimationActive={false}
                activeDot={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </ChartBox>

      <ChartCaption>{t("report.battery.distance_caption")}</ChartCaption>
      <ChartBox $height={150}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} syncId="battery-timeline" syncMethod="value" margin={margin}>
            <CartesianGrid stroke={CHART_GRID} vertical={false} />
            {xAxis(true)}
            <YAxis tick={AXIS_TICK} width={Y_WIDTH} tickFormatter={formatKm} />
            {tooltip}
            <Line
              dataKey="distanceKm"
              name={t("report.battery.series.distance")}
              stroke={DISTANCE_COLOR}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartBox>
    </>
  );
};

const BucketCharts: FC<{ vehicle: BatteryVehicle; bucket: "hour" | "day" }> = ({
  vehicle,
  bucket,
}) => {
  const { t } = useTranslation();
  const rows = vehicle.buckets.map((b) => ({
    label: dayjs(b.start).format(bucket === "hour" ? "MM-DD HH:00" : "MM-DD"),
    consumed: b.consumed,
    charged: b.charged,
    distanceKm: b.distanceKm,
    missions: b.missions,
  }));
  if (!rows.length) return <Empty description={t("report.battery.no_records")} />;

  return (
    <>
      <ChartCaption>{t("report.battery.change_caption")}</ChartCaption>
      <ChartBox $height={240}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} syncId="battery-buckets" margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barGap={2}>
            <CartesianGrid stroke={CHART_GRID} vertical={false} />
            <XAxis dataKey="label" tick={false} height={4} />
            <YAxis tick={AXIS_TICK} width={Y_WIDTH} unit="%" />
            <Tooltip
              formatter={(value: number, name: string) => [`${value}%`, name]}
              labelStyle={{ color: CHART_TEXT_SECONDARY }}
            />
            <Legend formatter={legendText} itemSorter={legendOrder(["consumed", "charged"])} />
            <Bar
              dataKey="consumed"
              name={t("report.battery.series.consumed")}
              fill={CONSUMED_COLOR}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="charged"
              name={t("report.battery.series.charged")}
              fill={CHARGED_COLOR}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartBox>

      <ChartCaption>{t("report.battery.distance_bucket_caption")}</ChartCaption>
      <ChartBox $height={150}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} syncId="battery-buckets" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART_GRID} vertical={false} />
            <XAxis dataKey="label" tick={AXIS_TICK} minTickGap={16} />
            <YAxis tick={AXIS_TICK} width={Y_WIDTH} tickFormatter={formatKm} />
            <Tooltip
              formatter={(value: number, _name: string, item) => [
                `${value} km · ${t("report.battery.missions_count", {
                  count: (item?.payload as { missions: number })?.missions ?? 0,
                })}`,
                t("report.battery.series.distance"),
              ]}
              labelStyle={{ color: CHART_TEXT_SECONDARY }}
            />
            <Bar
              dataKey="distanceKm"
              name={t("report.battery.series.distance")}
              fill={DISTANCE_COLOR}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartBox>
    </>
  );
};

const VehicleTable: FC<{
  vehicles: BatteryVehicle[];
  selected: string | null;
  onSelect: (amrId: string) => void;
}> = ({ vehicles, selected, onSelect }) => {
  const { t } = useTranslation();
  const num = (key: keyof BatteryVehicle, digits = 1, unit = "") => ({
    dataIndex: key,
    align: "right" as const,
    render: (v: number | null) => fmt(v, digits, unit),
    sorter: (a: BatteryVehicle, b: BatteryVehicle) =>
      Number(a[key] ?? -Infinity) - Number(b[key] ?? -Infinity),
  });

  const columns: TableColumnsType<BatteryVehicle> = [
    { title: t("report.col.vehicle"), dataIndex: "amrId", fixed: "left", width: 170 },
    { title: t("report.battery.col.consumed"), ...num("consumed", 1, "%") },
    { title: t("report.battery.col.charged"), ...num("charged", 1, "%") },
    { title: t("report.battery.col.distance"), ...num("distanceKm", 2) },
    { title: t("report.battery.col.missions"), ...num("missions", 0) },
    { title: t("report.battery.col.pct_per_km"), ...num("pctPerKm", 1, "%") },
    { title: t("report.battery.col.drain_per_hour"), ...num("drainPerHour", 1, "%") },
    { title: t("report.battery.col.charge_per_hour"), ...num("chargePerHour", 1, "%") },
    {
      title: t("report.battery.col.charging_time"),
      dataIndex: "chargingMin",
      align: "right",
      render: (v: number) => formatMinutes(v),
      sorter: (a, b) => a.chargingMin - b.chargingMin,
    },
    { title: t("report.battery.col.charge_sessions"), ...num("chargeSessions", 0) },
    {
      title: t("report.battery.col.battery_range"),
      key: "range",
      align: "right",
      render: (_: unknown, v) =>
        `${fmt(v.startBattery, 0)} → ${fmt(v.endBattery, 0)} (${fmt(v.minBattery, 0)}~${fmt(
          v.maxBattery,
          0,
        )})`,
    },
  ];

  return (
    <Table<BatteryVehicle>
      size="small"
      rowKey="amrId"
      dataSource={vehicles}
      columns={columns}
      pagination={false}
      scroll={{ x: "max-content" }}
      locale={{ emptyText: t("report.battery.no_records") }}
      rowClassName={(v) => (v.amrId === selected ? "ant-table-row-selected" : "")}
      onRow={(v) => ({ onClick: () => onSelect(v.amrId), style: { cursor: "pointer" } })}
    />
  );
};

const MissionTable: FC<{ missions: BatteryMissionRow[] }> = ({ missions }) => {
  const { t } = useTranslation();
  const columns: TableColumnsType<BatteryMissionRow> = [
    {
      title: t("report.battery.col.start"),
      dataIndex: "from",
      width: 150,
      render: (v: number) => dayjs(v).format("MM-DD HH:mm:ss"),
      sorter: (a, b) => a.from - b.from,
      defaultSortOrder: "ascend",
    },
    {
      title: t("report.battery.col.duration"),
      key: "duration",
      align: "right",
      render: (_: unknown, m) => formatMinutes(Math.round((m.to - m.from) / 60_000)),
      sorter: (a, b) => a.to - a.from - (b.to - b.from),
    },
    { title: t("report.col.mission_name"), dataIndex: "name" },
    {
      title: t("report.battery.col.kind"),
      dataIndex: "cls",
      render: (c: MissionClass) => (
        <span>
          <Swatch $color={TIME_COLOR[c]} />
          {t(`report.time.${c}`)}
        </span>
      ),
      filters: MISSION_CLASSES.map((c) => ({ text: t(`report.time.${c}`), value: c })),
      onFilter: (value, m) => m.cls === value,
    },
    {
      title: t("report.battery.col.distance"),
      dataIndex: "distanceKm",
      align: "right",
      render: (v: number) => v.toFixed(3),
      sorter: (a, b) => a.distanceKm - b.distanceKm,
    },
    {
      title: t("report.battery.col.battery_change"),
      key: "battery",
      align: "right",
      render: (_: unknown, m) => `${fmt(m.batteryStart, 0)} → ${fmt(m.batteryEnd, 0)}`,
    },
    {
      title: t("report.battery.col.used"),
      dataIndex: "used",
      align: "right",
      render: (v: number | null) => fmt(v, 1, "%"),
      sorter: (a, b) => (a.used ?? 0) - (b.used ?? 0),
    },
  ];
  return (
    <Table<BatteryMissionRow>
      size="small"
      rowKey="id"
      dataSource={missions}
      columns={columns}
      pagination={{ pageSize: 20, size: "small" }}
      scroll={{ x: "max-content" }}
      locale={{ emptyText: t("report.battery.no_missions") }}
    />
  );
};

export default BatteryReportBody;
