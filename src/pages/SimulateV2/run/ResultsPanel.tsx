import { FC, ReactNode, useMemo, useRef } from "react";
import { Alert, Button, Dropdown, Empty, Table, Tabs, Tooltip } from "antd";
import { DownOutlined, FileExcelOutlined, PrinterOutlined } from "@ant-design/icons";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { useElementSize } from "../editor/hooks";
import type { Hotspot, StationStats } from "../engine/types";
import { docAtom, projectAtom } from "../state/editorAtoms";
import { RunOutcome, mapModeAtom, playTimeAtom, playingAtom, replayFocusAtom, reportOpenAtom } from "../state/runAtoms";
import { startRun, startSweep } from "./controller";
import { useExportReport } from "./report/useExportReport";
import { runHash, sweepHash } from "./sweep";
import { heatColor } from "./colors";
import { fmtClock, fmtDuration, fmtMinutes, fmtNumber, fmtPercent } from "./format";
import { HourlyChart, VehicleTimeChart } from "./ResultCharts";
import TaskTable from "./TaskTable";

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  padding: 12px;
  overflow-y: auto;
  background: var(--c-bg);
  border-left: 1px solid var(--c-border);
  font-size: 13px;
  color: var(--c-text);
`;

const Tiles = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
`;

const TileBox = styled.div`
  padding: 8px 10px;
  background: var(--c-bg-subtle);
  border: 1px solid var(--c-border);
  border-radius: 8px;

  .label {
    font-size: 12px;
    color: var(--c-text-secondary);
  }
  .value {
    margin-top: 2px;
    font-size: 20px;
    font-weight: 600;
    line-height: 1.3;
    color: var(--c-text);
  }
  .sub {
    margin-top: 2px;
    font-size: 11px;
    color: var(--c-text-muted);
  }
`;

const Tile: FC<{ label: ReactNode; value: ReactNode; sub?: ReactNode; testId?: string }> = ({ label, value, sub, testId }) => (
  <TileBox data-testid={testId}>
    <div className="label">{label}</div>
    <div className="value">{value}</div>
    {sub && <div className="sub">{sub}</div>}
  </TileBox>
);

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;

  .sub {
    font-size: 12px;
    color: var(--c-text-muted);
  }
`;

const HotRow = styled.button`
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) 64px;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 4px;
  background: none;
  border: none;
  border-bottom: 1px solid var(--c-border);
  color: var(--c-text);
  text-align: left;
  cursor: pointer;

  &:hover {
    background: var(--c-bg-muted);
  }
  .rank {
    color: var(--c-text-muted);
    font-variant-numeric: tabular-nums;
  }
  .what small {
    margin-right: 6px;
    color: var(--c-text-muted);
  }
  .bar {
    height: 4px;
    margin-top: 4px;
    border-radius: 2px;
  }
  .sec {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
`;

const ResultsPanel: FC<{ outcome: RunOutcome }> = ({ outcome }) => {
  const { t } = useTranslation();
  const store = useStore();
  const doc = useAtomValue(docAtom);
  const project = useAtomValue(projectAtom);
  const setFocus = useSetAtom(replayFocusAtom);
  const setMode = useSetAtom(mapModeAtom);
  const setTime = useSetAtom(playTimeAtom);
  const setPlaying = useSetAtom(playingAtom);
  const setReportOpen = useSetAtom(reportOpenAtom);
  const exportReport = useExportReport();
  const wrapRef = useRef<HTMLDivElement>(null);
  const { width } = useElementSize(wrapRef);
  const { result } = outcome;
  const k = result.kpi;
  const fromSweep = outcome.source.kind === "sweep";
  const currentHash = useMemo(() => (fromSweep ? sweepHash(doc) : runHash(doc)), [doc, fromSweep]);
  const stale = currentHash !== outcome.hash;
  const nodePos = new Map(outcome.doc.nodes.map((n) => [n.id, n]));
  // 面板左右各有 12px 的內距, 再留一點給捲軸
  const chartWidth = Math.max(240, width - 24 - 12);
  const reroutes = result.notes.filter((n) => n.code === "reroute").length;
  const noStandby = result.notes.filter((n) => n.code === "no_standby_free");
  const maxHot = Math.max(1, ...result.hotspots.map((h) => h.sec));

  const showDeadlock = () => {
    const d = result.deadlock;
    if (!d) return;
    setMode("replay");
    setPlaying(false);
    setTime(Math.max(0, d.t - 20));
    const c = d.points.reduce((a, p) => ({ x: a.x + p.x / d.points.length, y: a.y + p.y / d.points.length }), { x: 0, y: 0 });
    setFocus({ ...c });
  };

  // 點位的熱點: 站點、待命點、路口分開叫
  const hotKind = (h: Hotspot) => {
    if (h.kind !== "node") return h.kind;
    const kind = nodePos.get(h.ids[0])?.kind;
    return kind === "station" ? "station" : kind === "standby" ? "standby" : "node";
  };

  const stations = result.stations
    .filter((s) => s.picks + s.drops > 0 || s.maxQueue > 0 || s.lineStops > 0)
    .sort((a, b) => b.occupancy - a.occupancy);

  return (
    <Panel ref={wrapRef} data-testid="simv2-results">
      <Head>
        <div>
          <b>{fromSweep && outcome.source.kind === "sweep" ? t("sim_v2.result.title_sweep", { count: outcome.source.count, seed: outcome.source.seed }) : t("sim_v2.result.title_single")}</b>
          <div className="sub">
            {outcome.savedAt
              ? t("sim_v2.history.saved_at", { time: new Date(outcome.savedAt).toLocaleString() })
              : fromSweep
                ? t("sim_v2.result.from_sweep")
                : t("sim_v2.result.not_saved")}
          </div>
        </div>
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              { key: "xlsx", icon: <FileExcelOutlined />, label: t("sim_v2.report.excel") },
              { key: "print", icon: <PrinterOutlined />, label: t("sim_v2.report.print") },
            ],
            onClick: ({ key }) => (key === "xlsx" ? void exportReport.single(outcome) : setReportOpen(true)),
          }}
        >
          <Button size="small" loading={exportReport.busy} data-testid="simv2-report-menu">
            {t("sim_v2.report.button")} <DownOutlined />
          </Button>
        </Dropdown>
      </Head>
      {stale && (
        <Alert
          type="warning"
          showIcon
          title={fromSweep ? t("sim_v2.sweep.stale") : t("sim_v2.result.stale")}
          action={
            <Button size="small" onClick={() => (fromSweep ? startSweep(store) : startRun(store))}>
              {fromSweep ? t("sim_v2.sweep.rerun") : t("sim_v2.result.rerun")}
            </Button>
          }
          data-testid="simv2-result-stale"
        />
      )}
      {outcome.mismatch && <Alert type="info" showIcon title={t("sim_v2.history.mismatch")} />}
      {outcome.trace === "failed" && <Alert type="warning" showIcon title={t("sim_v2.history.trace_failed")} />}
      {result.deadlock && (
        <Alert
          type="error"
          showIcon
          title={t("sim_v2.result.deadlock_title", { time: fmtClock(result.startClock, result.deadlock.t) })}
          description={t("sim_v2.result.deadlock_body", { vehicles: result.deadlock.vehicles.join("、") })}
          action={
            <Button size="small" danger onClick={showDeadlock}>
              {t("sim_v2.result.show_on_map")}
            </Button>
          }
          data-testid="simv2-deadlock"
        />
      )}
      <Tiles>
        <Tile
          testId="simv2-kpi-throughput"
          label={t("sim_v2.kpi.throughput")}
          value={t("sim_v2.kpi.per_hour", { value: fmtNumber(k.throughputPerHour) })}
          sub={
            <>
              {t("sim_v2.kpi.throughput_sub", { created: fmtNumber(k.createdPerHour), planned: fmtNumber(k.demandPerHour) })}
              {k.lostPerHour >= 0.05 && <div>{t("sim_v2.kpi.throughput_lost", { lost: fmtNumber(k.lostPerHour) })}</div>}
            </>
          }
        />
        <Tile
          testId="simv2-kpi-achievement"
          label={t("sim_v2.kpi.achievement")}
          value={fmtPercent(k.achievement, 1)}
          sub={t(k.lostPerHour >= 0.05 ? "sim_v2.kpi.achievement_sub_lost" : "sim_v2.kpi.achievement_sub")}
        />
        <Tile
          testId="simv2-kpi-wait"
          label={t("sim_v2.kpi.wait")}
          value={fmtDuration(k.waitAvg)}
          sub={t("sim_v2.kpi.wait_sub", { p95: fmtDuration(k.waitP95), max: fmtDuration(k.waitMax) })}
        />
        <Tile
          testId="simv2-kpi-utilization"
          label={t("sim_v2.kpi.utilization")}
          value={fmtPercent(k.utilization)}
          sub={t("sim_v2.kpi.utilization_sub", { count: result.vehicles.length })}
        />
        <Tile
          testId="simv2-kpi-linestop"
          label={t("sim_v2.kpi.line_stop")}
          value={t("sim_v2.kpi.times", { count: k.lineStopCount })}
          sub={t("sim_v2.kpi.line_stop_sub", { min: fmtMinutes(k.lineStopSec) })}
        />
        <Tile
          testId="simv2-kpi-end"
          label={t("sim_v2.kpi.at_end")}
          value={t("sim_v2.kpi.backlog", { count: k.backlog })}
          sub={t("sim_v2.kpi.in_transit", { count: k.inTransit })}
        />
      </Tiles>
      <div style={{ fontSize: 12, color: "var(--c-text-muted)" }}>
        {t("sim_v2.result.window_note", {
          from: fmtClock(result.startClock, result.warmupSec, false),
          to: fmtClock(result.startClock, result.endSec, false),
          ms: result.wallMs,
        })}
      </div>
      {(reroutes > 0 || noStandby.length > 0) && (
        <Alert
          type="info"
          showIcon
          title={
            <>
              {reroutes > 0 && <div>{t("sim_v2.result.note_reroute", { count: reroutes })}</div>}
              {noStandby.length > 0 && <div>{t("sim_v2.result.note_no_standby", { count: noStandby.length })}</div>}
            </>
          }
        />
      )}

      <Tabs
        size="small"
        items={[
          { key: "vehicles", label: t("sim_v2.result.tab_vehicles"), children: <VehicleTimeChart result={result} width={chartWidth} /> },
          {
            key: "stations",
            label: t("sim_v2.result.tab_stations"),
            children: stations.length ? (
              <Table<StationStats>
                size="small"
                rowKey="nodeId"
                dataSource={stations}
                pagination={stations.length > 15 ? { pageSize: 15, size: "small", showSizeChanger: false } : false}
                scroll={{ x: 340 }}
                onRow={(s) => ({
                  onClick: () => {
                    const n = nodePos.get(s.nodeId);
                    if (n) setFocus({ x: n.x, y: n.y, ids: [s.nodeId] });
                  },
                  style: { cursor: "pointer" },
                })}
                columns={[
                  { title: t("sim_v2.result.station"), dataIndex: "name", width: 80 },
                  { title: t("sim_v2.result.picks_drops"), key: "pd", width: 70, align: "right", render: (_, s) => `${s.picks} / ${s.drops}` },
                  { title: t("sim_v2.result.occupancy"), key: "occ", width: 60, align: "right", render: (_, s) => fmtPercent(s.occupancy) },
                  {
                    title: (
                      <Tooltip title={t("sim_v2.result.queue_help")}>
                        <span>{t("sim_v2.result.queue")}</span>
                      </Tooltip>
                    ),
                    key: "q",
                    width: 70,
                    align: "right",
                    render: (_, s) => `${s.avgQueue.toFixed(1)} / ${s.maxQueue}`,
                  },
                  ...(stations.some((s) => s.lineStops > 0)
                    ? [
                        {
                          title: t("sim_v2.result.line_stops"),
                          key: "ls",
                          width: 80,
                          align: "right" as const,
                          render: (_: unknown, s: StationStats) =>
                            s.lineStops ? t("sim_v2.result.line_stops_value", { count: s.lineStops, min: fmtMinutes(s.lineStopSec) }) : "–",
                        },
                      ]
                    : []),
                ]}
              />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("sim_v2.result.no_station_use")} />
            ),
          },
          {
            key: "hotspots",
            label: t("sim_v2.result.tab_hotspots"),
            children: result.hotspots.length ? (
              <div data-testid="simv2-hotspots">
                <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginBottom: 4 }}>{t("sim_v2.result.hotspot_help")}</div>
                {result.hotspots.map((h: Hotspot, i) => (
                  <HotRow
                    key={`${h.kind}-${h.ids.join(",")}`}
                    onClick={() => {
                      setMode("heat");
                      setFocus({ x: h.x, y: h.y, ids: h.ids });
                    }}
                  >
                    <span className="rank">{i + 1}</span>
                    <span className="what">
                      <small>{t(`sim_v2.result.hot_${hotKind(h)}`)}</small>
                      {h.label}
                      <div className="bar" style={{ width: `${(h.sec / maxHot) * 100}%`, background: heatColor(h.sec / maxHot, false) }} />
                    </span>
                    <span className="sec">{t("sim_v2.result.minutes", { value: fmtMinutes(h.sec) })}</span>
                  </HotRow>
                ))}
              </div>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("sim_v2.result.no_hotspots")} />
            ),
          },
          { key: "hourly", label: t("sim_v2.result.tab_hourly"), children: <HourlyChart result={result} width={chartWidth} /> },
          { key: "tasks", label: t("sim_v2.result.tab_tasks"), children: <TaskTable outcome={outcome} projectName={project?.name ?? "simulation"} /> },
        ]}
      />
    </Panel>
  );
};

export default ResultsPanel;
