import { FC, useMemo, useState } from "react";
import { Alert, Empty, Select, Table, Tag, Tooltip as AntTooltip } from "antd";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CONNECTION_KINDS,
  ConnectionCodeRow,
  ConnectionEvent,
  ConnectionKindRow,
  ConnectionReport as Report,
  ConnectionTargetRow,
} from "@/api/useConnectionReport";
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
  Tile,
  TileLabel,
  TileValue,
  Tiles,
  TwoColumns,
  legendText,
} from "./reportParts";
import { mq } from "@/styles/responsive";

const KIND_COLOR: Record<string, string> = {
  VEHICLE: CATEGORICAL_PALETTE[0],
  RABBITMQ: CATEGORICAL_PALETTE[1],
  MQTT: CATEGORICAL_PALETTE[2],
  ECS: CATEGORICAL_PALETTE[3],
  ADVANTECH: CATEGORICAL_PALETTE[6],
  REDIS: CATEGORICAL_PALETTE[7],
};

const AXIS_TICK = { fill: CHART_TEXT_SECONDARY, fontSize: 11 };

const FiveTiles = styled(Tiles)`
  ${mq.web} {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
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
`;

const Filter = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
`;

type Units = { s: string; m: string; h: string; d: string };

/** 毫秒 -> 「2 小時 5 分」這種短字串 */
const formatDuration = (ms: number, u: Units) => {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec} ${u.s}`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} ${u.m} ${sec % 60} ${u.s}`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} ${u.h} ${min % 60} ${u.m}`;
  return `${Math.floor(hour / 24)} ${u.d} ${hour % 24} ${u.h}`;
};

const ConnectionReportBody: FC<{ report: Report }> = ({ report }) => {
  const { t } = useTranslation();
  const [kindFilter, setKindFilter] = useState<string[]>([]);
  const kindNames: Record<string, string> = {
    VEHICLE: t("report.connection.kind.VEHICLE"),
    RABBITMQ: t("report.connection.kind.RABBITMQ"),
    MQTT: t("report.connection.kind.MQTT"),
    ECS: t("report.connection.kind.ECS"),
    ADVANTECH: t("report.connection.kind.ADVANTECH"),
    REDIS: t("report.connection.kind.REDIS"),
  };
  const kindName = (k: string) => kindNames[k] ?? k;
  const units: Units = {
    s: t("report.connection.unit_sec"),
    m: t("report.connection.unit_min"),
    h: t("report.connection.unit_hour"),
    d: t("report.connection.unit_day"),
  };
  const dur = (ms: number) => formatDuration(ms, units);
  const s = report.summary;

  const tiles = [
    { key: "count", label: t("report.connection.tile.count"), value: s.count },
    { key: "down_time", label: t("report.connection.tile.down_time"), value: dur(s.downMs) },
    { key: "ongoing", label: t("report.connection.tile.ongoing"), value: s.ongoing },
    { key: "longest", label: t("report.connection.tile.longest"), value: dur(s.longestMs) },
    { key: "targets", label: t("report.connection.tile.targets"), value: s.targets },
  ];

  const kindsPresent = useMemo(
    () => CONNECTION_KINDS.filter((k) => report.kinds.some((r) => r.kind === k)),
    [report.kinds],
  );

  const chartData = useMemo(
    () =>
      report.buckets.map((b) => ({
        ...b,
        label: dayjs(b.at).format(report.bucketMs < 24 * 3600_000 ? "MM-DD HH:mm" : "MM-DD"),
      })),
    [report.buckets, report.bucketMs],
  );

  const events = useMemo(
    () => report.events.filter((e) => kindFilter.length === 0 || kindFilter.includes(e.kind)),
    [report.events, kindFilter],
  );

  const kindTag = (k: string) => <Tag color={KIND_COLOR[k]}>{kindName(k)}</Tag>;

  const kindColumns: TableColumnsType<ConnectionKindRow> = [
    { title: t("report.connection.col.kind"), dataIndex: "kind", render: kindTag },
    { title: t("report.connection.col.count"), dataIndex: "count", align: "right" },
    {
      title: t("report.connection.col.down"),
      dataIndex: "downMs",
      align: "right",
      render: dur,
    },
  ];

  const codeColumns: TableColumnsType<ConnectionCodeRow> = [
    { title: t("report.connection.col.kind"), dataIndex: "kind", render: kindTag },
    { title: t("report.connection.col.code"), dataIndex: "code" },
    { title: t("report.connection.col.count"), dataIndex: "count", align: "right" },
    { title: t("report.connection.col.down"), dataIndex: "downMs", align: "right", render: dur },
  ];

  const targetColumns: TableColumnsType<ConnectionTargetRow> = [
    { title: t("report.connection.col.kind"), dataIndex: "kind", render: kindTag },
    {
      title: t("report.connection.col.target"),
      dataIndex: "target",
      render: (v: string, r) => (
        <>
          {v} {r.ongoing && <Tag color="error">{t("report.connection.still_down")}</Tag>}
        </>
      ),
    },
    {
      title: t("report.connection.col.count"),
      dataIndex: "count",
      align: "right",
      sorter: (a, b) => a.count - b.count,
    },
    {
      title: t("report.connection.col.down"),
      dataIndex: "downMs",
      align: "right",
      defaultSortOrder: "descend",
      sorter: (a, b) => a.downMs - b.downMs,
      render: dur,
    },
    {
      title: t("report.connection.col.longest"),
      dataIndex: "longestMs",
      align: "right",
      sorter: (a, b) => a.longestMs - b.longestMs,
      render: dur,
    },
    { title: t("report.connection.col.last_code"), dataIndex: "lastCode" },
  ];

  const eventColumns: TableColumnsType<ConnectionEvent> = [
    { title: t("report.connection.col.kind"), dataIndex: "kind", render: kindTag, width: 110 },
    { title: t("report.connection.col.target"), dataIndex: "target" },
    {
      title: t("report.connection.col.start"),
      dataIndex: "startedAt",
      defaultSortOrder: "descend",
      sorter: (a, b) => a.startedAt - b.startedAt,
      render: (v: number) => dayjs(v).format("MM-DD HH:mm:ss"),
    },
    {
      title: t("report.connection.col.end"),
      dataIndex: "endedAt",
      render: (v: number | null, r) =>
        v === null ? (
          <Tag color="error">{t("report.connection.still_down")}</Tag>
        ) : (
          <>
            {dayjs(v).format("MM-DD HH:mm:ss")}
            {r.endedByRestart && (
              <AntTooltip title={t("report.connection.restart_hint")}>
                {" "}
                <Tag>{t("report.connection.restart_tag")}</Tag>
              </AntTooltip>
            )}
          </>
        ),
    },
    {
      title: t("report.connection.col.duration"),
      dataIndex: "totalMs",
      align: "right",
      sorter: (a, b) => a.totalMs - b.totalMs,
      render: dur,
    },
    {
      title: t("report.connection.col.reason"),
      dataIndex: "reason",
      render: (v: string | null, r) => (
        <AntTooltip title={v && v.length > 80 ? v : undefined}>
          <span>
            <code>{r.code}</code>
            {v ? ` ${v.length > 80 ? `${v.slice(0, 80)}…` : v}` : ""}
          </span>
        </AntTooltip>
      ),
    },
  ];

  return (
    <>
      {!report.recorded && (
        <Alert type="warning" showIcon message={t("report.connection.not_recorded")} />
      )}

      <FiveTiles>
        {tiles.map((tile) => (
          <Tile key={tile.key}>
            <TileLabel>{tile.label}</TileLabel>
            <TileValue>{tile.value}</TileValue>
          </Tile>
        ))}
      </FiveTiles>

      <Panel>
        <PanelHead>
          <PanelTitle>
            {report.bucketMs < 24 * 3600_000
              ? t("report.connection.chart_hour")
              : t("report.connection.chart_day")}
          </PanelTitle>
          <PanelHint>{t("report.connection.chart_hint")}</PanelHint>
        </PanelHead>
        <PanelBody>
          {s.count === 0 ? (
            <Empty description={t("report.connection.none")} />
          ) : (
            <ChartBox $height={260}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="label" tick={AXIS_TICK} minTickGap={24} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK} width={36} />
                  <Tooltip
                    cursor={{ fill: "rgba(128,128,128,0.12)" }}
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <TipBox>
                          <div>{label}</div>
                          {payload
                            .filter((p) => Number(p.value) > 0)
                            .map((p) => (
                              <div key={String(p.dataKey)}>
                                {kindName(String(p.dataKey))}: {p.value}
                              </div>
                            ))}
                        </TipBox>
                      ) : null
                    }
                  />
                  <Legend
                    formatter={(v) => legendText(kindName(String(v)))}
                    iconType="square"
                    iconSize={8}
                  />
                  {kindsPresent.map((k) => (
                    <Bar key={k} dataKey={k} stackId="c" fill={KIND_COLOR[k]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          )}
        </PanelBody>
      </Panel>

      <TwoColumns>
        <Panel>
          <PanelHead>
            <PanelTitle>{t("report.connection.kind_title")}</PanelTitle>
          </PanelHead>
          <PanelBody>
            <Table
              size="small"
              rowKey="kind"
              pagination={false}
              dataSource={report.kinds}
              columns={kindColumns}
              locale={{ emptyText: t("report.connection.none") }}
            />
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHead>
            <PanelTitle>{t("report.connection.code_title")}</PanelTitle>
          </PanelHead>
          <PanelBody>
            <Table
              size="small"
              rowKey={(r) => `${r.kind}-${r.code}`}
              pagination={false}
              dataSource={report.codes}
              columns={codeColumns}
              locale={{ emptyText: t("report.connection.none") }}
            />
          </PanelBody>
        </Panel>
      </TwoColumns>

      <Panel>
        <PanelHead>
          <PanelTitle>{t("report.connection.target_title")}</PanelTitle>
          <PanelHint>{t("report.connection.target_hint")}</PanelHint>
        </PanelHead>
        <PanelBody>
          <Table
            size="small"
            rowKey={(r) => `${r.kind}-${r.target}`}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            dataSource={report.targets}
            columns={targetColumns}
            scroll={{ x: "max-content" }}
            locale={{ emptyText: t("report.connection.none") }}
          />
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHead>
          <PanelTitle>{t("report.connection.event_title")}</PanelTitle>
          <PanelHint>{t("report.connection.event_hint")}</PanelHint>
        </PanelHead>
        <PanelBody>
          <Filter>
            <Select
              mode="multiple"
              allowClear
              style={{ minWidth: 240 }}
              value={kindFilter}
              onChange={setKindFilter}
              placeholder={t("report.connection.all_kinds")}
              options={CONNECTION_KINDS.map((k) => ({ value: k, label: kindName(k) }))}
            />
          </Filter>
          <Table
            size="small"
            rowKey="id"
            pagination={{ pageSize: 20, hideOnSinglePage: true }}
            dataSource={events}
            columns={eventColumns}
            scroll={{ x: "max-content" }}
            locale={{ emptyText: t("report.connection.none") }}
          />
        </PanelBody>
      </Panel>
    </>
  );
};

export default ConnectionReportBody;
