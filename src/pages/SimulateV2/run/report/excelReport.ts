/**
 * Excel 報告 (exceljs, 用到才載入). 單次執行: 摘要 (含塞車熱點地圖)、搬運需求、車輛、站點、
 * 塞車熱點、每小時、任務清單. 車數掃描: 摘要、每個台數、每一次、搬運需求.
 */
import type { Workbook, Worksheet } from "exceljs";
import { TIME_BUCKETS } from "../../engine/types";
import type { SimDoc } from "../../model/types";
import type { RunOutcome, SweepOutcome } from "../../state/runAtoms";
import { STATE_ORDER } from "../colors";
import { fmtClock } from "../format";
import { summarizeSweep } from "../sweep";
import type { MapImage } from "./mapImage";

/** i18next 的 t (只用到這樣) */
export type T = (key: string, opts?: Record<string, unknown>) => string;

export interface ReportMeta {
  projectName: string;
  /** 報告產生的時間 */
  generatedAt: Date;
}

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const round = (v: number | null | undefined, digits = 1) => (v === null || v === undefined || !Number.isFinite(v) ? null : Math.round(v * 10 ** digits) / 10 ** digits);
const pct = (v: number | null | undefined) => (v === null || v === undefined ? null : round(v * 100, 1));
const minutes = (sec: number | null | undefined) => (sec === null || sec === undefined ? null : round(sec / 60, 1));

function header(ws: Worksheet, cols: { title: string; width?: number }[]) {
  const row = ws.addRow(cols.map((c) => c.title));
  row.font = { bold: true };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0EFEA" } };
  cols.forEach((c, i) => (ws.getColumn(i + 1).width = c.width ?? 14));
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

/** 摘要頁: 兩欄 (項目, 內容), 一段一段 */
function section(ws: Worksheet, title: string, rows: [string, string | number | null][]) {
  ws.addRow([]);
  const h = ws.addRow([title]);
  h.font = { bold: true, size: 12 };
  for (const [k, v] of rows) {
    const r = ws.addRow([k, v ?? "–"]);
    r.getCell(1).font = { color: { argb: "FF5F5E5A" } };
  }
}

function nameMap(doc: SimDoc) {
  const m = new Map<string, string>();
  doc.nodes.forEach((n) => m.set(n.id, n.name));
  doc.groups.forEach((g) => m.set(g.id, g.name));
  return m;
}

function inputRows(t: T, doc: SimDoc, vehiclesLine: string): [string, string | number | null][] {
  const perHour = doc.demand.reduce((s, d) => s + (d.perHour > 0 ? d.perHour : 0), 0);
  const stations = doc.nodes.filter((n) => n.kind === "station").length;
  const standby = doc.nodes.filter((n) => n.kind === "standby").length;
  return [
    [t("sim_v2.report.duration"), t("sim_v2.report.duration_value", { hours: doc.run.durationH, warmup: doc.run.warmupMin })],
    [t("sim_v2.run.start"), doc.run.startClock],
    [t("sim_v2.run.seed"), doc.run.seed],
    [t("sim_v2.report.vehicles"), vehiclesLine],
    [t("sim_v2.report.demand"), t("sim_v2.report.demand_value", { perHour: round(perHour), rows: doc.demand.length })],
    [t("sim_v2.report.layout"), t("sim_v2.report.layout_value", { nodes: doc.nodes.length, paths: doc.paths.length, stations, standby })],
    [t("sim_v2.report.traffic"), t("sim_v2.report.traffic_value", { gap: doc.traffic.safetyGap, deg: doc.traffic.turnThresholdDeg })],
  ];
}

function vehicleLine(t: T, doc: SimDoc) {
  return doc.vehicleTypes
    .filter((v) => v.count > 0)
    .map((v) => t("sim_v2.report.vehicle_type", { name: v.name, count: v.count, empty: v.speedEmpty, loaded: v.speedLoaded }))
    .join("; ");
}

function demandSheet(wb: Workbook, t: T, doc: SimDoc, rows?: { created: number; done: number; lineStops: number; lineStopSec: number }[]) {
  const ws = wb.addWorksheet(t("sim_v2.tab.demand"));
  const names = nameMap(doc);
  header(ws, [
    { title: "#", width: 6 },
    { title: t("sim_v2.demand.from"), width: 18 },
    { title: t("sim_v2.demand.to"), width: 18 },
    { title: t("sim_v2.demand.perHour") },
    { title: t("sim_v2.demand.mode") },
    { title: t("sim_v2.demand.window"), width: 16 },
    { title: t("sim_v2.demand.priority") },
    ...(rows
      ? [{ title: t("sim_v2.report.row_created") }, { title: t("sim_v2.report.row_done") }, { title: t("sim_v2.result.line_stops") }, { title: t("sim_v2.report.line_stop_min") }]
      : []),
  ]);
  doc.demand.forEach((d, i) => {
    const r = rows?.[i];
    ws.addRow([
      i + 1,
      names.get(d.from) ?? "",
      names.get(d.to) ?? "",
      d.perHour,
      t(`sim_v2.demand.mode_${d.mode}`),
      d.start && d.end ? `${d.start}–${d.end}` : t("sim_v2.demand.all_day"),
      d.priority,
      ...(rows ? [r?.created ?? 0, r?.done ?? 0, r?.lineStops ?? 0, minutes(r?.lineStopSec ?? 0)] : []),
    ]);
  });
}

/** 任務清單 (結果頁的「匯出 Excel」也用這個) */
export function addTasksSheet(wb: Workbook, t: T, outcome: RunOutcome) {
  const { result, doc } = outcome;
  const names = nameMap(doc);
  const clock = (s: number) => (s >= 0 ? fmtClock(result.startClock, s) : "");
  const ws = wb.addWorksheet(t("sim_v2.result.tab_tasks"));
  header(ws, [
    { title: t("sim_v2.task.id"), width: 8 },
    { title: t("sim_v2.task.row"), width: 8 },
    { title: t("sim_v2.task.created") },
    { title: t("sim_v2.task.assigned") },
    { title: t("sim_v2.task.pick_start") },
    { title: t("sim_v2.task.pick_done") },
    { title: t("sim_v2.task.drop_start") },
    { title: t("sim_v2.task.drop_done") },
    { title: t("sim_v2.task.wait_sec") },
    { title: t("sim_v2.task.total_sec") },
    { title: t("sim_v2.task.from") },
    { title: t("sim_v2.task.to") },
    { title: t("sim_v2.task.vehicle") },
  ]);
  for (const l of result.loads) {
    ws.addRow([
      l.id,
      l.row + 1,
      clock(l.created),
      clock(l.assigned),
      clock(l.pickStart),
      clock(l.pickDone),
      clock(l.dropStart),
      clock(l.dropDone),
      l.pickStart >= 0 ? Math.round(l.pickStart - l.created) : null,
      l.dropDone >= 0 ? Math.round(l.dropDone - l.created) : null,
      l.from ? names.get(l.from) ?? l.from : "",
      l.to ? names.get(l.to) ?? l.to : "",
      l.vehicle ?? "",
    ]);
  }
}

function addImage(wb: Workbook, ws: Worksheet, img: MapImage | null, col: number, row: number, widthPx = 760) {
  if (!img) return;
  const id = wb.addImage({ base64: img.dataUrl, extension: "png" });
  ws.addImage(id, { tl: { col, row }, ext: { width: widthPx, height: Math.round((widthPx * img.height) / img.width) } });
}

async function newWorkbook() {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "fleet-core";
  wb.created = new Date();
  return wb;
}

const toBlob = async (wb: Workbook) => new Blob([await wb.xlsx.writeBuffer()], { type: XLSX_MIME });

export async function singleReport(t: T, meta: ReportMeta, outcome: RunOutcome, map: MapImage | null): Promise<Blob> {
  const wb = await newWorkbook();
  const { result, doc } = outcome;
  const k = result.kpi;
  const ws = wb.addWorksheet(t("sim_v2.report.sheet_summary"));
  ws.getColumn(1).width = 22;
  ws.getColumn(2).width = 48;
  const title = ws.addRow([t("sim_v2.report.title")]);
  title.font = { bold: true, size: 16 };
  ws.addRow([t("sim_v2.report.project"), meta.projectName]);
  ws.addRow([t("sim_v2.report.generated"), meta.generatedAt.toLocaleString()]);
  if (outcome.source.kind === "sweep") ws.addRow([t("sim_v2.report.from_sweep"), t("sim_v2.result.title_sweep", { count: outcome.source.count, seed: outcome.source.seed })]);
  ws.addRow([t("sim_v2.report.engine"), outcome.engine]);
  section(ws, t("sim_v2.report.inputs"), inputRows(t, doc, vehicleLine(t, doc)));
  const kpis: [string, string | number | null][] = [
    [t("sim_v2.report.window"), `${fmtClock(result.startClock, result.warmupSec, false)} – ${fmtClock(result.startClock, result.endSec, false)}`],
    [t("sim_v2.kpi.throughput"), t("sim_v2.report.per_hour", { value: round(k.throughputPerHour) })],
    [t("sim_v2.report.created_vs_planned"), t("sim_v2.kpi.throughput_sub", { created: round(k.createdPerHour), planned: round(k.demandPerHour) })],
    [t("sim_v2.kpi.achievement"), k.achievement === null ? null : `${pct(k.achievement)}%`],
    [t("sim_v2.report.wait"), t("sim_v2.report.wait_value", { avg: minutes(k.waitAvg) ?? "–", p95: minutes(k.waitP95) ?? "–", max: minutes(k.waitMax) ?? "–" })],
    [t("sim_v2.report.task_time"), t("sim_v2.report.task_value", { avg: minutes(k.taskAvg) ?? "–", p95: minutes(k.taskP95) ?? "–" })],
    [t("sim_v2.kpi.utilization"), `${pct(k.utilization)}%`],
    [t("sim_v2.kpi.line_stop"), t("sim_v2.report.line_stop_value", { count: k.lineStopCount, min: minutes(k.lineStopSec) })],
    [t("sim_v2.kpi.at_end"), t("sim_v2.report.at_end_value", { backlog: k.backlog, transit: k.inTransit })],
  ];
  if (k.lostPerHour >= 0.05) kpis.splice(3, 0, [t("sim_v2.report.lost"), t("sim_v2.report.per_hour", { value: round(k.lostPerHour) })]);
  if (result.deadlock) kpis.push([t("sim_v2.report.deadlock"), t("sim_v2.result.deadlock_title", { time: fmtClock(result.startClock, result.deadlock.t) })]);
  section(ws, t("sim_v2.report.results"), kpis);
  ws.addRow([]);
  const mapTitle = ws.addRow([t("sim_v2.report.map_heat")]);
  mapTitle.font = { bold: true, size: 12 };
  addImage(wb, ws, map, 0, ws.rowCount);

  demandSheet(wb, t, doc, result.rows);

  const span = Math.max(1, result.endSec - result.warmupSec);
  const vs = wb.addWorksheet(t("sim_v2.result.tab_vehicles"));
  header(vs, [
    { title: t("sim_v2.result.vehicle") },
    { title: t("sim_v2.report.vehicle_type_col") },
    ...STATE_ORDER.map((s) => ({ title: `${t(`sim_v2.state.${s}`)} (${t("sim_v2.unit.min_short")})` })),
    { title: `${t("sim_v2.result.busy")} %` },
    { title: t("sim_v2.result.tasks") },
    { title: `${t("sim_v2.result.distance")} (m)` },
  ]);
  for (const v of result.vehicles) {
    vs.addRow([
      v.name,
      v.typeName,
      ...STATE_ORDER.map((s) => minutes(v.time[TIME_BUCKETS.indexOf(s)])),
      pct(v.time.slice(1).reduce((a, b) => a + b, 0) / span),
      v.tasks,
      Math.round(v.distance),
    ]);
  }

  const ss = wb.addWorksheet(t("sim_v2.result.tab_stations"));
  header(ss, [
    { title: t("sim_v2.result.station") },
    { title: t("sim_v2.report.picks") },
    { title: t("sim_v2.report.drops") },
    { title: `${t("sim_v2.result.occupancy")} %` },
    { title: t("sim_v2.report.avg_queue") },
    { title: t("sim_v2.report.max_queue") },
    { title: t("sim_v2.result.line_stops") },
    { title: t("sim_v2.report.line_stop_min") },
  ]);
  for (const s of [...result.stations].sort((a, b) => b.occupancy - a.occupancy)) {
    if (!(s.picks + s.drops > 0 || s.maxQueue > 0 || s.lineStops > 0)) continue;
    ss.addRow([s.name, s.picks, s.drops, pct(s.occupancy), round(s.avgQueue, 2), s.maxQueue, s.lineStops, minutes(s.lineStopSec)]);
  }

  const hs = wb.addWorksheet(t("sim_v2.report.sheet_hotspots"));
  header(hs, [{ title: "#", width: 6 }, { title: t("sim_v2.report.hot_kind") }, { title: t("sim_v2.report.hot_where"), width: 30 }, { title: t("sim_v2.report.wait_min") }]);
  const kindOf = new Map(doc.nodes.map((n) => [n.id, n.kind]));
  result.hotspots.forEach((h, i) => {
    const kind = h.kind !== "node" ? h.kind : kindOf.get(h.ids[0]) === "station" ? "station" : kindOf.get(h.ids[0]) === "standby" ? "standby" : "node";
    hs.addRow([i + 1, t(`sim_v2.result.hot_${kind}`), h.label, minutes(h.sec)]);
  });

  const hr = wb.addWorksheet(t("sim_v2.result.tab_hourly"));
  header(hr, [{ title: t("sim_v2.result.hour") }, { title: t("sim_v2.result.hourly_created") }, { title: t("sim_v2.result.hourly_done") }]);
  result.hourly.forEach((h, i) => hr.addRow([fmtClock(result.startClock, i * 3600, false), h.created, h.done]));

  addTasksSheet(wb, t, outcome);
  return toBlob(wb);
}

export async function sweepReport(t: T, meta: ReportMeta, sweep: SweepOutcome, map: MapImage | null): Promise<Blob> {
  const wb = await newWorkbook();
  const { doc, plan, settings } = sweep;
  const sum = summarizeSweep(sweep.runs, plan, settings);
  const ws = wb.addWorksheet(t("sim_v2.report.sheet_summary"));
  ws.getColumn(1).width = 22;
  ws.getColumn(2).width = 60;
  const title = ws.addRow([t("sim_v2.report.title_sweep")]);
  title.font = { bold: true, size: 16 };
  ws.addRow([t("sim_v2.report.project"), meta.projectName]);
  ws.addRow([t("sim_v2.report.generated"), meta.generatedAt.toLocaleString()]);
  ws.addRow([t("sim_v2.report.engine"), sweep.engine]);
  const others = doc.vehicleTypes.filter((v) => v.id !== plan.typeId && v.count > 0);
  const fleet = [
    t("sim_v2.report.sweep_fleet", { name: plan.typeName, min: settings.min, max: settings.max }),
    ...others.map((v) => t("sim_v2.report.vehicle_type", { name: v.name, count: v.count, empty: v.speedEmpty, loaded: v.speedLoaded })),
  ].join("; ");
  section(ws, t("sim_v2.report.inputs"), [
    ...inputRows(t, doc, fleet).filter(([k]) => k !== t("sim_v2.run.seed")),
    [t("sim_v2.sweep.seeds"), plan.seeds.join(", ")],
  ]);
  section(ws, t("sim_v2.sweep.targets"), [
    [t("sim_v2.sweep.min_achievement"), `${pct(settings.minAchievement)}%`],
    [t("sim_v2.sweep.max_wait"), `${settings.maxWaitP95Min} ${t("sim_v2.unit.min")}`],
    [t("sim_v2.sweep.max_utilization"), `${pct(settings.maxUtilization)}%`],
    [t("sim_v2.report.no_deadlock"), "✓"],
    [t("sim_v2.sweep.availability"), `${pct(settings.availability)}%`],
  ]);
  const rec: [string, string | number | null][] =
    sum.minPass !== null && sum.recommended !== null
      ? [
          [t("sim_v2.report.min_pass"), t("sim_v2.sweep.n_vehicles", { count: sum.minPass })],
          [t("sim_v2.sweep.recommended"), t("sim_v2.report.recommended_value", { count: sum.recommended, name: plan.typeName, min: sum.minPass, availability: `${pct(settings.availability)}%` })],
        ]
      : [[t("sim_v2.sweep.recommended"), sum.complete ? t("sim_v2.sweep.none") : t("sim_v2.report.incomplete")]];
  if (sum.failAbove.length) rec.push([t("sim_v2.report.note"), t("sim_v2.sweep.explain_fail_above", { list: sum.failAbove.join("、") })]);
  section(ws, t("sim_v2.report.recommendation"), rec);
  ws.addRow([]);
  const mapTitle = ws.addRow([t("sim_v2.report.map_layout")]);
  mapTitle.font = { bold: true, size: 12 };
  addImage(wb, ws, map, 0, ws.rowCount);

  const cs = wb.addWorksheet(t("sim_v2.report.sheet_counts"));
  header(cs, [
    { title: t("sim_v2.sweep.col_count"), width: 8 },
    { title: t("sim_v2.report.tp_avg") },
    { title: t("sim_v2.report.tp_min") },
    { title: t("sim_v2.report.tp_max") },
    { title: `${t("sim_v2.sweep.col_achievement")} %` },
    { title: t("sim_v2.report.p95_avg") },
    { title: t("sim_v2.report.p95_max") },
    { title: `${t("sim_v2.sweep.col_utilization")} %` },
    { title: t("sim_v2.report.line_stop_min") },
    { title: t("sim_v2.report.deadlocks") },
    { title: t("sim_v2.sweep.col_result"), width: 24 },
  ]);
  for (const r of sum.rows) {
    cs.addRow([
      r.count,
      round(r.throughput.avg),
      round(r.throughput.min),
      round(r.throughput.max),
      pct(r.achievement.avg),
      minutes(r.waitP95.avg),
      minutes(r.waitP95.max),
      pct(r.utilization.avg),
      round(r.lineStopMin.avg),
      r.deadlocks,
      r.pass === null ? t("sim_v2.report.incomplete") : r.pass ? t("sim_v2.sweep.pass") : r.fails.map((f) => t(`sim_v2.sweep.fail_${f}`)).join(", "),
    ]);
  }

  const rs = wb.addWorksheet(t("sim_v2.report.sheet_runs"));
  header(rs, [
    { title: t("sim_v2.sweep.col_count"), width: 8 },
    { title: t("sim_v2.run.seed"), width: 10 },
    { title: t("sim_v2.report.tp") },
    { title: `${t("sim_v2.sweep.col_achievement")} %` },
    { title: t("sim_v2.report.p95") },
    { title: `${t("sim_v2.sweep.col_utilization")} %` },
    { title: t("sim_v2.report.line_stop_min") },
    { title: t("sim_v2.report.deadlock"), width: 16 },
  ]);
  for (const r of [...sweep.runs].sort((a, b) => a.count - b.count || a.seed - b.seed)) {
    const k = r.summary.kpi;
    rs.addRow([
      r.count,
      r.seed,
      round(k.throughputPerHour),
      pct(k.achievement),
      minutes(k.waitP95),
      pct(k.utilization),
      minutes(k.lineStopSec),
      r.summary.deadlock ? fmtClock(doc.run.startClock, r.summary.deadlock.t) : "",
    ]);
  }

  demandSheet(wb, t, doc);
  return toBlob(wb);
}
