/**
 * 結果紀錄 (後端 sim_run) 的內容格式: 存的時候怎麼包、讀回來怎麼拆.
 *
 * - params: 跑的時候的整份專案內容 (doc), 加上引擎版本和指紋 (hash). 回放要看時用它重算.
 * - summary: 紀錄列表顯示的幾個數字.
 * - result: 單次執行是整份結果 (不含回放軌跡); 車數掃描是每一次的 KPI.
 */
import { ENGINE_VERSION, RunSummary, SimResult } from "../engine/types";
import { parseDoc } from "../model/migrate";
import type { SimDoc, SweepSettings } from "../model/types";
import type { RunDetail, RunKind } from "../api/simV2Api";
import type { RunOutcome, SweepOutcome } from "../state/runAtoms";
import { SweepPlan, SweepRun, summarizeSweep } from "./sweep";

export interface SingleBrief {
  kind: "single";
  hash: string;
  vehicles: number;
  throughput: number;
  demand: number;
  achievement: number | null;
  waitP95: number | null;
  utilization: number;
  deadlock: boolean;
  durationH: number;
  seed: number;
}

export interface SweepBrief {
  kind: "sweep";
  hash: string;
  typeName: string;
  min: number;
  max: number;
  seeds: number;
  minPass: number | null;
  recommended: number | null;
  availability: number;
  complete: boolean;
}

export type RunBrief = SingleBrief | SweepBrief;

interface SingleParams {
  engine: string;
  hash: string;
  doc: SimDoc;
}

interface SweepParams {
  engine: string;
  hash: string;
  doc: SimDoc;
  plan: SweepPlan;
  settings: SweepSettings;
}

interface SweepBody {
  runs: SweepRun[];
  wallMs: number;
}

export interface RunPayload {
  kind: RunKind;
  params: unknown;
  summary: RunBrief;
  result: unknown;
}

export function singlePayload(o: RunOutcome): RunPayload {
  const k = o.result.kpi;
  const summary: SingleBrief = {
    kind: "single",
    hash: o.hash,
    vehicles: o.result.vehicles.length,
    throughput: k.throughputPerHour,
    demand: k.demandPerHour,
    achievement: k.achievement,
    waitP95: k.waitP95,
    utilization: k.utilization,
    deadlock: !!o.result.deadlock,
    durationH: o.doc.run.durationH,
    seed: o.doc.run.seed,
  };
  const params: SingleParams = { engine: o.engine, hash: o.hash, doc: o.doc };
  // 回放軌跡不存 (要看的時候重算)
  return { kind: "single", params, summary, result: { ...o.result, trace: null } };
}

export function sweepPayload(s: SweepOutcome): RunPayload {
  const sum = summarizeSweep(s.runs, s.plan, s.settings);
  const summary: SweepBrief = {
    kind: "sweep",
    hash: s.hash,
    typeName: s.plan.typeName,
    min: s.settings.min,
    max: s.settings.max,
    seeds: s.settings.seeds,
    minPass: sum.minPass,
    recommended: sum.recommended,
    availability: s.settings.availability,
    complete: sum.complete,
  };
  const params: SweepParams = { engine: ENGINE_VERSION, hash: s.hash, doc: s.doc, plan: s.plan, settings: s.settings };
  const result: SweepBody = { runs: s.runs, wallMs: s.wallMs };
  return { kind: "sweep", params, summary, result };
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export class BadRunError extends Error {}

/** 讀回來的單次執行; 回放軌跡要另外重算 */
export function parseSingleRun(d: RunDetail, projectId: string): RunOutcome {
  const p = isObj(d.params) ? d.params : {};
  const r = isObj(d.result) ? d.result : null;
  if (!r || !isObj(r.kpi) || !Array.isArray(r.vehicles)) throw new BadRunError("result");
  const doc = parseDoc(p.doc);
  return {
    projectId,
    doc,
    result: { ...(r as unknown as SimResult), trace: null },
    source: { kind: "single" },
    hash: typeof p.hash === "string" ? p.hash : "",
    runId: d.id,
    savedAt: d.created_at,
    trace: "loading",
    mismatch: false,
    engine: typeof p.engine === "string" ? p.engine : "",
  };
}

export function parseSweepRun(d: RunDetail, projectId: string): SweepOutcome {
  const p = isObj(d.params) ? d.params : {};
  const r = isObj(d.result) ? d.result : {};
  const plan = p.plan as SweepPlan | undefined;
  const settings = p.settings as SweepSettings | undefined;
  if (!plan || !Array.isArray(plan.counts) || !Array.isArray(plan.seeds) || !settings) throw new BadRunError("params");
  const runs = (Array.isArray(r.runs) ? r.runs : []).filter(
    (x): x is SweepRun => isObj(x) && typeof x.count === "number" && typeof x.seed === "number" && isObj(x.summary) && isObj((x.summary as unknown as RunSummary).kpi),
  );
  return {
    projectId,
    doc: parseDoc(p.doc),
    hash: typeof p.hash === "string" ? p.hash : "",
    plan,
    settings,
    runs,
    total: plan.counts.length * plan.seeds.length,
    done: true,
    wallMs: typeof r.wallMs === "number" ? r.wallMs : 0,
    runId: d.id,
    savedAt: d.created_at,
    engine: typeof p.engine === "string" ? p.engine : "",
  };
}

/** 列表上的摘要 (舊格式或壞掉的回 null) */
export function briefOf(summary: unknown): RunBrief | null {
  if (!isObj(summary)) return null;
  if (summary.kind === "single" || summary.kind === "sweep") return summary as unknown as RunBrief;
  return null;
}
