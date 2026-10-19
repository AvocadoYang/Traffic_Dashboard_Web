/**
 * 列印頁 (列印成 PDF 給客戶): 蓋在整個畫面上的預覽, 按「列印」叫瀏覽器的列印.
 * 列印時只印這一塊 (其他畫面藏起來), 固定用淺色 (白紙).
 * 內容跟著結果頁目前顯示的: 單次執行 (或掃描裡點開的那一次), 或車數掃描.
 */
import { FC, ReactNode, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Spin } from "antd";
import { CloseOutlined, FileExcelOutlined, PrinterOutlined } from "@ant-design/icons";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import styled from "styled-components";
import { TIME_BUCKETS } from "../../engine/types";
import type { SimDoc } from "../../model/types";
import { projectAtom } from "../../state/editorAtoms";
import { RunOutcome, SweepOutcome, reportOpenAtom, runModeAtom, shownOutcomeAtom, sweepOutcomeAtom, sweepPickAtom } from "../../state/runAtoms";
import { STATE_ORDER, stateColors } from "../colors";
import { fmtClock, fmtDuration, fmtMinutes, fmtNumber, fmtPercent } from "../format";
import { summarizeSweep } from "../sweep";
import { MapImage, renderMapImage } from "./mapImage";
import { useExportReport } from "./useExportReport";

const ROOT_ID = "simv2-print-root";
const PAGE_WIDTH = 700;

const PRINT_CSS = `
@media print {
  @page { size: A4 portrait; margin: 12mm; }
  html, body { background: #fff !important; height: auto !important; overflow: visible !important; }
  body > *:not(#${ROOT_ID}) { display: none !important; }
  #${ROOT_ID} { position: static !important; overflow: visible !important; background: #fff !important; padding: 0 !important; }
  #${ROOT_ID} .no-print { display: none !important; }
  #${ROOT_ID} .page { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; }
  #${ROOT_ID} .keep { break-inside: avoid; page-break-inside: avoid; }
}
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2100;
  overflow-y: auto;
  padding: 56px 16px 32px;
  background: rgba(40, 40, 38, 0.55);
`;

const Bar0 = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2101;
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  background: #ffffff;
  border-bottom: 1px solid #e1e0d9;
`;

const Page = styled.div`
  width: ${PAGE_WIDTH + 96}px;
  max-width: 100%;
  margin: 0 auto;
  padding: 40px 48px;
  background: #ffffff;
  color: #1f1f1d;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25);
  font-size: 12px;
  line-height: 1.6;

  h1 {
    margin: 0 0 4px;
    font-size: 22px;
  }
  h2 {
    margin: 22px 0 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #e1e0d9;
    font-size: 15px;
  }
  .meta {
    color: #5f5e5a;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    padding: 4px 6px;
    border-bottom: 1px solid #ecebe6;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #f4f3ef;
    font-weight: 600;
  }
  td.num,
  th.num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  dl {
    display: grid;
    grid-template-columns: 120px minmax(0, 1fr);
    gap: 2px 12px;
    margin: 0;
  }
  dt {
    color: #5f5e5a;
  }
  dd {
    margin: 0;
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
  .tile {
    padding: 8px 10px;
    border: 1px solid #e1e0d9;
    border-radius: 6px;
  }
  .tile .label {
    color: #5f5e5a;
  }
  .tile .value {
    font-size: 18px;
    font-weight: 700;
  }
  .tile .sub {
    color: #7a7974;
    font-size: 11px;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 12px;
    color: #5f5e5a;
  }
  .legend i {
    display: inline-block;
    width: 10px;
    height: 10px;
    margin-right: 4px;
    border-radius: 2px;
    vertical-align: -1px;
  }
  .note {
    color: #7a7974;
    font-size: 11px;
  }
  .hero {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 12px 16px;
    border: 1px solid #e1e0d9;
    border-radius: 8px;
  }
  .hero .big {
    font-size: 36px;
    font-weight: 700;
  }
  img.map {
    width: 100%;
    border: 1px solid #e1e0d9;
  }
`;

const ink = "#1f1f1d";
const muted = "#7a7974";
const grid = "#e1e0d9";

function nameMap(doc: SimDoc) {
  const m = new Map<string, string>();
  doc.nodes.forEach((n) => m.set(n.id, n.name));
  doc.groups.forEach((g) => m.set(g.id, g.name));
  return m;
}

const Inputs: FC<{ doc: SimDoc; fleet?: ReactNode }> = ({ doc, fleet }) => {
  const { t } = useTranslation();
  const perHour = doc.demand.reduce((s, d) => s + (d.perHour > 0 ? d.perHour : 0), 0);
  return (
    <dl className="keep">
      <dt>{t("sim_v2.report.duration")}</dt>
      <dd>{t("sim_v2.report.duration_value", { hours: doc.run.durationH, warmup: doc.run.warmupMin })}</dd>
      <dt>{t("sim_v2.run.start")}</dt>
      <dd>{doc.run.startClock}</dd>
      <dt>{t("sim_v2.report.vehicles")}</dt>
      <dd>
        {fleet ??
          doc.vehicleTypes
            .filter((v) => v.count > 0)
            .map((v) => t("sim_v2.report.vehicle_type", { name: v.name, count: v.count, empty: v.speedEmpty, loaded: v.speedLoaded }))
            .join("; ")}
      </dd>
      <dt>{t("sim_v2.report.demand")}</dt>
      <dd>{t("sim_v2.report.demand_value", { perHour: fmtNumber(perHour), rows: doc.demand.length })}</dd>
      <dt>{t("sim_v2.report.layout")}</dt>
      <dd>
        {t("sim_v2.report.layout_value", {
          nodes: doc.nodes.length,
          paths: doc.paths.length,
          stations: doc.nodes.filter((n) => n.kind === "station").length,
          standby: doc.nodes.filter((n) => n.kind === "standby").length,
        })}
      </dd>
    </dl>
  );
};

const DemandTable: FC<{ doc: SimDoc; rows?: RunOutcome["result"]["rows"] }> = ({ doc, rows }) => {
  const { t } = useTranslation();
  const names = nameMap(doc);
  return (
    <table className="keep">
      <thead>
        <tr>
          <th>#</th>
          <th>{t("sim_v2.demand.from")}</th>
          <th>{t("sim_v2.demand.to")}</th>
          <th className="num">{t("sim_v2.demand.perHour")}</th>
          <th>{t("sim_v2.demand.window")}</th>
          {rows && <th className="num">{t("sim_v2.report.row_done")}</th>}
          {rows && <th className="num">{t("sim_v2.result.line_stops")}</th>}
        </tr>
      </thead>
      <tbody>
        {doc.demand.map((d, i) => (
          <tr key={d.id}>
            <td>{i + 1}</td>
            <td>{names.get(d.from) ?? ""}</td>
            <td>{names.get(d.to) ?? ""}</td>
            <td className="num">{d.perHour}</td>
            <td>{d.start && d.end ? `${d.start}–${d.end}` : t("sim_v2.demand.all_day")}</td>
            {rows && <td className="num">{rows[i]?.done ?? 0}</td>}
            {rows && <td className="num">{rows[i]?.lineStops ? t("sim_v2.result.line_stops_value", { count: rows[i].lineStops, min: fmtMinutes(rows[i].lineStopSec) }) : "–"}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const MapFigure: FC<{ map: MapImage | null | undefined; caption: string }> = ({ map, caption }) =>
  map === undefined ? (
    <Spin />
  ) : map ? (
    <figure className="keep" style={{ margin: 0 }}>
      <img className="map" src={map.dataUrl} alt="" />
      <figcaption className="note">{caption}</figcaption>
    </figure>
  ) : null;

const SingleReport: FC<{ outcome: RunOutcome; map: MapImage | null | undefined }> = ({ outcome, map }) => {
  const { t } = useTranslation();
  const { result, doc } = outcome;
  const k = result.kpi;
  const colors = stateColors(false);
  const span = Math.max(1, result.endSec - result.warmupSec);
  const vehicles = result.vehicles.map((v) => {
    const row: Record<string, string | number> = { name: v.name };
    for (const s of STATE_ORDER) row[s] = Math.round((v.time[TIME_BUCKETS.indexOf(s)] / 60) * 10) / 10;
    return row;
  });
  const hourly = result.hourly.map((h, i) => ({ hour: fmtClock(result.startClock, i * 3600, false), created: h.created, done: h.done }));
  const stations = [...result.stations].filter((s) => s.picks + s.drops > 0).sort((a, b) => b.occupancy - a.occupancy).slice(0, 12);
  const kindOf = new Map(doc.nodes.map((n) => [n.id, n.kind]));
  return (
    <>
      <h2>{t("sim_v2.report.inputs")}</h2>
      <Inputs doc={doc} />
      <h2>{t("sim_v2.report.results")}</h2>
      <div className="meta" style={{ marginBottom: 8 }}>
        {t("sim_v2.report.window")}: {fmtClock(result.startClock, result.warmupSec, false)} – {fmtClock(result.startClock, result.endSec, false)}
      </div>
      <div className="tiles keep">
        <div className="tile">
          <div className="label">{t("sim_v2.kpi.throughput")}</div>
          <div className="value">{t("sim_v2.kpi.per_hour", { value: fmtNumber(k.throughputPerHour) })}</div>
          <div className="sub">{t("sim_v2.kpi.throughput_sub", { created: fmtNumber(k.createdPerHour), planned: fmtNumber(k.demandPerHour) })}</div>
        </div>
        <div className="tile">
          <div className="label">{t("sim_v2.kpi.achievement")}</div>
          <div className="value">{fmtPercent(k.achievement, 1)}</div>
          {k.lostPerHour >= 0.05 && <div className="sub">{t("sim_v2.kpi.throughput_lost", { lost: fmtNumber(k.lostPerHour) })}</div>}
        </div>
        <div className="tile">
          <div className="label">{t("sim_v2.kpi.wait")}</div>
          <div className="value">{fmtDuration(k.waitAvg)}</div>
          <div className="sub">{t("sim_v2.kpi.wait_sub", { p95: fmtDuration(k.waitP95), max: fmtDuration(k.waitMax) })}</div>
        </div>
        <div className="tile">
          <div className="label">{t("sim_v2.kpi.utilization")}</div>
          <div className="value">{fmtPercent(k.utilization)}</div>
          <div className="sub">{t("sim_v2.kpi.utilization_sub", { count: result.vehicles.length })}</div>
        </div>
        <div className="tile">
          <div className="label">{t("sim_v2.kpi.line_stop")}</div>
          <div className="value">{t("sim_v2.kpi.times", { count: k.lineStopCount })}</div>
          <div className="sub">{t("sim_v2.kpi.line_stop_sub", { min: fmtMinutes(k.lineStopSec) })}</div>
        </div>
        <div className="tile">
          <div className="label">{t("sim_v2.kpi.at_end")}</div>
          <div className="value">{t("sim_v2.kpi.backlog", { count: k.backlog })}</div>
          <div className="sub">{t("sim_v2.kpi.in_transit", { count: k.inTransit })}</div>
        </div>
      </div>
      {result.deadlock && (
        <p style={{ color: "#c0392b" }}>
          {t("sim_v2.result.deadlock_title", { time: fmtClock(result.startClock, result.deadlock.t) })} — {t("sim_v2.result.deadlock_body", { vehicles: result.deadlock.vehicles.join("、") })}
        </p>
      )}
      <h2>{t("sim_v2.report.map_heat")}</h2>
      <MapFigure map={map} caption={t("sim_v2.report.map_heat_note")} />
      <h2>{t("sim_v2.result.tab_vehicles")}</h2>
      <div className="keep">
        <div className="legend">
          {STATE_ORDER.map((s) => (
            <span key={s}>
              <i style={{ background: colors[s] }} />
              {t(`sim_v2.state.${s}`)}
            </span>
          ))}
        </div>
        <BarChart width={PAGE_WIDTH} height={30 + vehicles.length * 22} data={vehicles} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 4 }} barCategoryGap={4}>
          <CartesianGrid horizontal={false} stroke={grid} />
          <XAxis type="number" tick={{ fontSize: 10, fill: muted }} stroke={grid} unit={t("sim_v2.unit.min_short")} />
          <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: ink }} stroke={grid} />
          {STATE_ORDER.map((s) => (
            <Bar key={s} dataKey={s} stackId="t" fill={colors[s]} stroke="#ffffff" strokeWidth={1} isAnimationActive={false} />
          ))}
        </BarChart>
        <div className="note">
          {t("sim_v2.report.vehicle_note", {
            busy: fmtPercent(result.vehicles.reduce((s, v) => s + v.time.slice(1).reduce((a, b) => a + b, 0), 0) / span / Math.max(1, result.vehicles.length)),
          })}
        </div>
      </div>
      <h2>{t("sim_v2.result.tab_hourly")}</h2>
      <div className="keep">
        <div className="legend">
          <span>
            <i style={{ background: colors.empty }} />
            {t("sim_v2.result.hourly_created")}
          </span>
          <span>
            <i style={{ background: colors.loaded }} />
            {t("sim_v2.result.hourly_done")}
          </span>
        </div>
        <LineChart width={PAGE_WIDTH} height={200} data={hourly} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
          <CartesianGrid vertical={false} stroke={grid} />
          <XAxis dataKey="hour" tick={{ fontSize: 10, fill: muted }} stroke={grid} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: muted }} stroke={grid} />
          <Line dataKey="created" stroke={colors.empty} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
          <Line dataKey="done" stroke={colors.loaded} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        </LineChart>
      </div>
      <h2>{t("sim_v2.tab.demand")}</h2>
      <DemandTable doc={doc} rows={result.rows} />
      {stations.length > 0 && (
        <>
          <h2>{t("sim_v2.result.tab_stations")}</h2>
          <table className="keep">
            <thead>
              <tr>
                <th>{t("sim_v2.result.station")}</th>
                <th className="num">{t("sim_v2.result.picks_drops")}</th>
                <th className="num">{t("sim_v2.result.occupancy")}</th>
                <th className="num">{t("sim_v2.result.queue")}</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((s) => (
                <tr key={s.nodeId}>
                  <td>{s.name}</td>
                  <td className="num">
                    {s.picks} / {s.drops}
                  </td>
                  <td className="num">{fmtPercent(s.occupancy)}</td>
                  <td className="num">
                    {s.avgQueue.toFixed(1)} / {s.maxQueue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {result.hotspots.length > 0 && (
        <>
          <h2>{t("sim_v2.result.tab_hotspots")}</h2>
          <table className="keep">
            <thead>
              <tr>
                <th>#</th>
                <th>{t("sim_v2.report.hot_kind")}</th>
                <th>{t("sim_v2.report.hot_where")}</th>
                <th className="num">{t("sim_v2.report.wait_min")}</th>
              </tr>
            </thead>
            <tbody>
              {result.hotspots.map((h, i) => {
                const kind = h.kind !== "node" ? h.kind : kindOf.get(h.ids[0]) === "station" ? "station" : kindOf.get(h.ids[0]) === "standby" ? "standby" : "node";
                return (
                  <tr key={`${h.kind}-${h.ids.join(",")}`}>
                    <td>{i + 1}</td>
                    <td>{t(`sim_v2.result.hot_${kind}`)}</td>
                    <td>{h.label}</td>
                    <td className="num">{fmtMinutes(h.sec)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </>
  );
};

const SweepReport: FC<{ sweep: SweepOutcome; map: MapImage | null | undefined }> = ({ sweep, map }) => {
  const { t } = useTranslation();
  const sum = summarizeSweep(sweep.runs, sweep.plan, sweep.settings);
  const s = sweep.settings;
  const color = stateColors(false).empty;
  const demand = sweep.runs[0]?.summary.kpi.demandPerHour ?? 0;
  const tp = sum.rows.map((r) => ({ count: r.count, avg: r.throughput.avg, band: [r.throughput.min, r.throughput.max] }));
  const wait = sum.rows.map((r) => ({ count: r.count, avg: r.waitP95.avg / 60, band: [r.waitP95.min / 60, r.waitP95.max / 60] }));
  const others = sweep.doc.vehicleTypes.filter((v) => v.id !== sweep.plan.typeId && v.count > 0);
  const fleet = [
    t("sim_v2.report.sweep_fleet", { name: sweep.plan.typeName, min: s.min, max: s.max }),
    ...others.map((v) => t("sim_v2.report.vehicle_type", { name: v.name, count: v.count, empty: v.speedEmpty, loaded: v.speedLoaded })),
  ].join("; ");
  const chart = (data: typeof tp, ref: { y: number; label: string } | null, unit: string) => (
    <ComposedChart width={PAGE_WIDTH / 2 - 8} height={190} data={data} margin={{ top: 14, right: 16, bottom: 4, left: -14 }}>
      <CartesianGrid vertical={false} stroke={grid} />
      <XAxis dataKey="count" tick={{ fontSize: 10, fill: muted }} stroke={grid} unit={t("sim_v2.sweep.unit_vehicle")} />
      <YAxis tick={{ fontSize: 10, fill: muted }} stroke={grid} tickFormatter={(v: number) => fmtNumber(v)} unit={unit} />
      <Area dataKey="band" stroke="none" fill={color} fillOpacity={0.16} isAnimationActive={false} />
      {ref && <ReferenceLine y={ref.y} stroke={ink} strokeOpacity={0.55} strokeDasharray="6 4" label={{ value: ref.label, position: "insideTopRight", fill: ink, fontSize: 10 }} />}
      {sum.minPass !== null && <ReferenceLine x={sum.minPass} stroke={ink} strokeOpacity={0.4} />}
      <Line dataKey="avg" stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} isAnimationActive={false} />
    </ComposedChart>
  );
  return (
    <>
      <h2>{t("sim_v2.report.inputs")}</h2>
      <Inputs doc={sweep.doc} fleet={fleet} />
      <h2>{t("sim_v2.report.recommendation")}</h2>
      <div className="hero keep">
        <div>
          <div className="meta">{t("sim_v2.sweep.recommended")}</div>
          <div className="big">{sum.recommended !== null ? t("sim_v2.sweep.n_vehicles", { count: sum.recommended }) : "–"}</div>
        </div>
        <div>
          {sum.minPass !== null && sum.recommended !== null ? (
            <>
              <div>{t("sim_v2.sweep.explain_pass", { count: sum.minPass })}</div>
              <div>
                {t("sim_v2.sweep.explain_availability", { availability: fmtPercent(s.availability), count: sum.minPass, ratio: fmtNumber(sum.minPass / s.availability, 2), result: sum.recommended })}
              </div>
              {sum.failAbove.length > 0 && <div>{t("sim_v2.sweep.explain_fail_above", { list: sum.failAbove.join("、") })}</div>}
            </>
          ) : (
            <div>{sum.complete ? t("sim_v2.sweep.none") : t("sim_v2.report.incomplete")}</div>
          )}
          <div className="meta">
            {t("sim_v2.sweep.targets_line", { achievement: fmtPercent(s.minAchievement), wait: fmtNumber(s.maxWaitP95Min, 1), utilization: fmtPercent(s.maxUtilization) })}
          </div>
        </div>
      </div>
      <h2>{t("sim_v2.report.sweep_charts")}</h2>
      <div className="keep" style={{ display: "flex", gap: 16 }}>
        <div>
          <b>{t("sim_v2.sweep.chart_throughput")}</b>
          {chart(tp, demand > 0 ? { y: demand, label: t("sim_v2.sweep.ref_demand", { value: fmtNumber(demand) }) } : null, "")}
        </div>
        <div>
          <b>
            {t("sim_v2.sweep.chart_wait")} ({t("sim_v2.unit.min")})
          </b>
          {chart(wait, { y: s.maxWaitP95Min, label: t("sim_v2.sweep.ref_wait", { value: fmtNumber(s.maxWaitP95Min) }) }, "")}
        </div>
      </div>
      <div className="note">{t("sim_v2.sweep.chart_note")}</div>
      <h2>{t("sim_v2.sweep.table_title")}</h2>
      <table className="keep">
        <thead>
          <tr>
            <th>{t("sim_v2.sweep.col_count")}</th>
            <th className="num">{t("sim_v2.sweep.col_throughput")}</th>
            <th className="num">{t("sim_v2.sweep.col_achievement")}</th>
            <th className="num">{t("sim_v2.sweep.col_wait")}</th>
            <th className="num">{t("sim_v2.sweep.col_utilization")}</th>
            <th>{t("sim_v2.sweep.col_result")}</th>
          </tr>
        </thead>
        <tbody>
          {sum.rows.map((r) => (
            <tr key={r.count} style={r.count === sum.minPass ? { fontWeight: 700 } : undefined}>
              <td>{t("sim_v2.sweep.n_vehicles", { count: r.count })}</td>
              <td className="num">
                {fmtNumber(r.throughput.avg)} ({fmtNumber(r.throughput.min)}~{fmtNumber(r.throughput.max)})
              </td>
              <td className="num">{fmtPercent(r.achievement.avg, 1)}</td>
              <td className="num">{fmtDuration(r.waitP95.avg)}</td>
              <td className="num">{fmtPercent(r.utilization.avg)}</td>
              <td>{r.pass === null ? "–" : r.pass ? `✓ ${t("sim_v2.sweep.pass")}` : `✗ ${r.fails.map((f) => t(`sim_v2.sweep.fail_${f}`)).join("、")}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>{t("sim_v2.report.map_layout")}</h2>
      <MapFigure map={map} caption={t("sim_v2.report.map_layout_note")} />
      <h2>{t("sim_v2.tab.demand")}</h2>
      <DemandTable doc={sweep.doc} />
    </>
  );
};

const ReportPreview: FC = () => {
  const { t } = useTranslation();
  const setOpen = useSetAtom(reportOpenAtom);
  const project = useAtomValue(projectAtom);
  const mode = useAtomValue(runModeAtom);
  const pick = useAtomValue(sweepPickAtom);
  const shown = useAtomValue(shownOutcomeAtom);
  const sweep = useAtomValue(sweepOutcomeAtom);
  const exportReport = useExportReport();
  const target = useMemo(
    () => (mode === "sweep" && !pick ? (sweep ? ({ kind: "sweep", sweep } as const) : null) : shown ? ({ kind: "single", outcome: shown } as const) : null),
    [mode, pick, sweep, shown],
  );
  const [map, setMap] = useState<MapImage | null | undefined>(undefined);
  const generatedAt = useMemo(() => new Date(), []);
  // 地圖圖片 (淺色)
  useEffect(() => {
    if (!target || !project) return;
    let alive = true;
    setMap(undefined);
    const p =
      target.kind === "sweep" ? renderMapImage(project.id, target.sweep.doc, null, 1400, 900) : renderMapImage(project.id, target.outcome.doc, target.outcome.result, 1400, 900);
    p.then((m) => alive && setMap(m)).catch(() => alive && setMap(null));
    return () => {
      alive = false;
    };
  }, [target, project]);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = PRINT_CSS;
    document.head.appendChild(style);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      style.remove();
      window.removeEventListener("keydown", onKey);
    };
  }, [setOpen]);

  return createPortal(
    <Overlay id={ROOT_ID} data-testid="simv2-report-preview">
      <Bar0 className="no-print">
        <Button type="primary" icon={<PrinterOutlined />} disabled={map === undefined} onClick={() => window.print()} data-testid="simv2-report-print">
          {t("sim_v2.report.print_now")}
        </Button>
        {target && (
          <Button
            icon={<FileExcelOutlined />}
            loading={exportReport.busy}
            onClick={() => void (target.kind === "sweep" ? exportReport.sweep(target.sweep) : exportReport.single(target.outcome))}
          >
            {t("sim_v2.report.excel")}
          </Button>
        )}
        <Button icon={<CloseOutlined />} onClick={() => setOpen(false)} data-testid="simv2-report-close">
          {t("sim_v2.report.close")}
        </Button>
      </Bar0>
      <Page className="page">
        <h1>{target?.kind === "sweep" ? t("sim_v2.report.title_sweep") : t("sim_v2.report.title")}</h1>
        <div className="meta">
          {t("sim_v2.report.project")}: {project?.name} · {t("sim_v2.report.generated")}: {generatedAt.toLocaleString()}
          {target?.kind === "single" && target.outcome.source.kind === "sweep" && (
            <> · {t("sim_v2.result.title_sweep", { count: target.outcome.source.count, seed: target.outcome.source.seed })}</>
          )}
        </div>
        {!target && <p>{t("sim_v2.run.no_result")}</p>}
        {target?.kind === "single" && <SingleReport outcome={target.outcome} map={map} />}
        {target?.kind === "sweep" && <SweepReport sweep={target.sweep} map={map} />}
        <p className="note" style={{ marginTop: 24 }}>
          {t("sim_v2.report.disclaimer")}
        </p>
      </Page>
    </Overlay>,
    document.body,
  );
};

export default ReportPreview;
