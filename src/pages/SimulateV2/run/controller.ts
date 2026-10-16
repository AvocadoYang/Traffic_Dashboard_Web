/**
 * 開始 / 停止模擬 (單次、車數掃描), 存成紀錄、從紀錄打開. 放在模組裡 (不放在元件裡),
 * 跑到一半切到別的分頁也不會停.
 */
import type { QueryClient } from "@tanstack/react-query";
import type { useStore } from "jotai";
import { RunMeta, createRun, deleteRun, getRun, listRuns, runsKey } from "../api/simV2Api";
import { runPool, PoolRun } from "../engine/pool";
import { SimCancelled, SimRun, startSimulation, toSimInput } from "../engine/runner";
import { ENGINE_VERSION, SimResult } from "../engine/types";
import { docAtom, projectAtom } from "../state/editorAtoms";
import {
  RunOutcome,
  SweepOutcome,
  autoLoadedAtom,
  playTimeAtom,
  playingAtom,
  replayFocusAtom,
  runErrorAtom,
  runModeAtom,
  runOutcomeAtom,
  runProgressAtom,
  saveErrorAtom,
  sweepErrorAtom,
  sweepOutcomeAtom,
  sweepPickAtom,
  sweepProgressAtom,
} from "../state/runAtoms";
import { parseSingleRun, parseSweepRun, singlePayload, sweepPayload } from "./history";
import { planSweep, runHash, sweepDoc, sweepHash, sweepJobs } from "./sweep";

type Store = ReturnType<typeof useStore>;

let queryClient: QueryClient | null = null;
/** 存紀錄後要更新紀錄列表 (react-query); 結果頁掛上去時給 */
export const bindQueryClient = (qc: QueryClient) => {
  queryClient = qc;
};
const refreshHistory = (projectId: string) => queryClient?.invalidateQueries({ queryKey: runsKey(projectId) });

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** 回放從哪裡開始: 死結的話停在出事前一點, 不然從暖機結束開始 */
const startTimeOf = (r: SimResult) => (r.deadlock ? Math.max(0, r.deadlock.t - 20) : r.warmupSec);

// ================================================================ 單次執行

let current: SimRun | null = null;

export function startRun(store: Store) {
  const doc = store.get(docAtom);
  const project = store.get(projectAtom);
  if (!project) return;
  current?.cancel();
  store.set(runErrorAtom, null);
  store.set(runProgressAtom, 0);
  const run = startSimulation(toSimInput(doc), (f) => {
    if (current === run) store.set(runProgressAtom, f);
  });
  current = run;
  run.promise
    .then((result) => {
      if (current !== run) return;
      current = null;
      const outcome: RunOutcome = {
        projectId: project.id,
        doc,
        result,
        source: { kind: "single" },
        hash: runHash(doc),
        runId: null,
        savedAt: null,
        trace: "ready",
        mismatch: false,
        engine: ENGINE_VERSION,
      };
      store.set(runOutcomeAtom, outcome);
      store.set(playingAtom, false);
      store.set(playTimeAtom, startTimeOf(result));
      store.set(runProgressAtom, null);
      void saveSingle(store, outcome, project.rev);
    })
    .catch((err: unknown) => {
      if (current !== run) return;
      current = null;
      store.set(runProgressAtom, null);
      if (!(err instanceof SimCancelled)) store.set(runErrorAtom, errorText(err));
    });
}

export function cancelRun(store: Store) {
  const run = current;
  current = null;
  run?.cancel();
  store.set(runProgressAtom, null);
}

/** 存成紀錄; 失敗只提示 (結果還在畫面上) */
async function saveSingle(store: Store, outcome: RunOutcome, projectRev: number) {
  try {
    const p = singlePayload(outcome);
    const meta = await createRun(outcome.projectId, { ...p, projectRev });
    // 還是同一個結果才補上紀錄 id
    if (store.get(runOutcomeAtom) === outcome) store.set(runOutcomeAtom, { ...outcome, runId: meta.id, savedAt: meta.created_at });
    store.set(saveErrorAtom, null);
    void refreshHistory(outcome.projectId);
  } catch (err) {
    store.set(saveErrorAtom, errorText(err));
  }
}

// ================================================================ 車數掃描

let sweeping: PoolRun | null = null;

export function startSweep(store: Store) {
  const doc = store.get(docAtom);
  const project = store.get(projectAtom);
  const plan = planSweep(doc);
  if (!project || !plan) return;
  sweeping?.cancel();
  const jobs = sweepJobs(doc, plan);
  const started = performance.now();
  const outcome: SweepOutcome = {
    projectId: project.id,
    doc,
    hash: sweepHash(doc),
    plan,
    settings: doc.sweep,
    runs: [],
    total: jobs.length,
    done: false,
    wallMs: 0,
    runId: null,
    savedAt: null,
    engine: ENGINE_VERSION,
  };
  store.set(sweepErrorAtom, null);
  store.set(sweepPickAtom, null);
  store.set(sweepOutcomeAtom, outcome);
  store.set(sweepProgressAtom, 0);
  // 結果一筆一筆來, 畫面最多每 150 毫秒更新一次
  const runs: SweepOutcome["runs"] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => {
    flushTimer = null;
    const cur = store.get(sweepOutcomeAtom);
    if (cur && cur.hash === outcome.hash && !cur.done && sweeping === pool) store.set(sweepOutcomeAtom, { ...cur, runs: [...runs] });
  };
  const pool = runPool(
    jobs.map((j) => j.input),
    (i, summary) => {
      runs.push({ count: jobs[i].count, seed: jobs[i].seed, summary });
      if (!flushTimer) flushTimer = setTimeout(flush, 150);
    },
    (f) => {
      if (sweeping === pool) store.set(sweepProgressAtom, f);
    },
  );
  sweeping = pool;
  pool.promise
    .then(() => {
      if (sweeping !== pool) return;
      sweeping = null;
      if (flushTimer) clearTimeout(flushTimer);
      // 照台數、種子排好 (跑完的順序不一定)
      runs.sort((a, b) => a.count - b.count || a.seed - b.seed);
      const done: SweepOutcome = { ...outcome, runs: [...runs], done: true, wallMs: Math.round(performance.now() - started) };
      store.set(sweepOutcomeAtom, done);
      store.set(sweepProgressAtom, null);
      void saveSweep(store, done, project.rev);
    })
    .catch((err: unknown) => {
      if (sweeping !== pool) return;
      sweeping = null;
      if (flushTimer) clearTimeout(flushTimer);
      store.set(sweepProgressAtom, null);
      // 取消或失敗: 跑完的那些還留著看, 但不算完成也不存
      store.set(sweepOutcomeAtom, { ...outcome, runs: [...runs], done: false });
      if (!(err instanceof SimCancelled)) store.set(sweepErrorAtom, errorText(err));
    });
}

export function cancelSweep(store: Store) {
  const pool = sweeping;
  sweeping = null;
  pool?.cancel();
  store.set(sweepProgressAtom, null);
}

async function saveSweep(store: Store, outcome: SweepOutcome, projectRev: number) {
  try {
    const p = sweepPayload(outcome);
    const meta = await createRun(outcome.projectId, { ...p, projectRev });
    if (store.get(sweepOutcomeAtom) === outcome) store.set(sweepOutcomeAtom, { ...outcome, runId: meta.id, savedAt: meta.created_at });
    store.set(saveErrorAtom, null);
    void refreshHistory(outcome.projectId);
  } catch (err) {
    store.set(saveErrorAtom, errorText(err));
  }
}

let picking: SimRun | null = null;

/** 看掃描裡某個台數、某個種子的那一次: 重算 (同樣的輸入和種子, 數字跟掃描一樣) 拿回放 */
export function openSweepPick(store: Store, count: number, seed: number) {
  const sweep = store.get(sweepOutcomeAtom);
  if (!sweep) return;
  picking?.cancel();
  const doc = sweepDoc(sweep.doc, sweep.plan.typeId, count, seed);
  store.set(sweepPickAtom, { count, seed, outcome: null, error: null });
  store.set(playingAtom, false);
  const run = startSimulation(toSimInput(doc));
  picking = run;
  run.promise
    .then((result) => {
      if (picking !== run) return;
      picking = null;
      store.set(sweepPickAtom, {
        count,
        seed,
        error: null,
        outcome: {
          projectId: sweep.projectId,
          doc,
          result,
          source: { kind: "sweep", count, seed },
          hash: sweep.hash,
          runId: null,
          savedAt: null,
          trace: "ready",
          mismatch: false,
          engine: ENGINE_VERSION,
        },
      });
      store.set(playTimeAtom, startTimeOf(result));
    })
    .catch((err: unknown) => {
      if (picking !== run) return;
      picking = null;
      if (!(err instanceof SimCancelled)) store.set(sweepPickAtom, { count, seed, outcome: null, error: errorText(err) });
    });
}

export function closeSweepPick(store: Store) {
  picking?.cancel();
  picking = null;
  store.set(sweepPickAtom, null);
  store.set(playingAtom, false);
}

// ================================================================ 紀錄

let rebuilding: SimRun | null = null;

/** 從紀錄打開單次執行: 數字照紀錄, 回放軌跡在背景重算 */
function showSavedSingle(store: Store, outcome: RunOutcome) {
  store.set(runOutcomeAtom, outcome);
  store.set(runErrorAtom, null);
  store.set(playingAtom, false);
  store.set(playTimeAtom, startTimeOf(outcome.result));
  store.set(replayFocusAtom, null);
  rebuilding?.cancel();
  const run = startSimulation(toSimInput(outcome.doc));
  rebuilding = run;
  run.promise
    .then((r) => {
      if (rebuilding !== run) return;
      rebuilding = null;
      const cur = store.get(runOutcomeAtom);
      if (!cur || cur.runId !== outcome.runId) return;
      const k0 = outcome.result.kpi;
      const k1 = r.kpi;
      const mismatch = k0.completed !== k1.completed || k0.created !== k1.created || Math.abs(k0.utilization - k1.utilization) > 1e-6;
      store.set(runOutcomeAtom, { ...cur, result: { ...cur.result, trace: r.trace }, trace: "ready", mismatch });
    })
    .catch((err: unknown) => {
      if (rebuilding !== run || err instanceof SimCancelled) return;
      rebuilding = null;
      const cur = store.get(runOutcomeAtom);
      if (cur && cur.runId === outcome.runId) store.set(runOutcomeAtom, { ...cur, trace: "failed" });
    });
}

export async function openSavedRun(store: Store, projectId: string, meta: Pick<RunMeta, "id" | "kind">) {
  const detail = await getRun(projectId, meta.id);
  if (store.get(projectAtom)?.id !== projectId) return;
  if (meta.kind === "sweep") {
    const sweep = parseSweepRun(detail, projectId);
    if (sweeping) cancelSweep(store);
    store.set(sweepOutcomeAtom, sweep);
    store.set(sweepErrorAtom, null);
    closeSweepPick(store);
    store.set(runModeAtom, "sweep");
  } else {
    if (current) cancelRun(store);
    showSavedSingle(store, parseSingleRun(detail, projectId));
    store.set(runModeAtom, "single");
  }
}

/**
 * 打開專案後第一次到結果頁: 記憶體裡沒有結果的話, 讀最新的單次執行和最新的車數掃描,
 * 左邊停在比較新的那一種.
 */
export async function autoLoadLatest(store: Store, projectId: string) {
  if (store.get(autoLoadedAtom) === projectId) return;
  store.set(autoLoadedAtom, projectId);
  let list: RunMeta[];
  try {
    list = await listRuns(projectId);
  } catch {
    return;
  }
  if (store.get(projectAtom)?.id !== projectId) return;
  const single = list.find((r) => r.kind === "single");
  const sweep = list.find((r) => r.kind === "sweep");
  try {
    if (sweep && !store.get(sweepOutcomeAtom)) {
      const detail = await getRun(projectId, sweep.id);
      if (store.get(projectAtom)?.id === projectId && !store.get(sweepOutcomeAtom)) store.set(sweepOutcomeAtom, parseSweepRun(detail, projectId));
    }
    if (single && !store.get(runOutcomeAtom) && !current) {
      const detail = await getRun(projectId, single.id);
      if (store.get(projectAtom)?.id === projectId && !store.get(runOutcomeAtom)) showSavedSingle(store, parseSingleRun(detail, projectId));
    }
    // 最新的一筆是掃描就停在掃描
    if (list[0]?.kind === "sweep" && store.get(projectAtom)?.id === projectId) store.set(runModeAtom, "sweep");
  } catch {
    // 讀不到就算了, 使用者可以自己點紀錄
  }
}

export async function deleteSavedRun(store: Store, projectId: string, runId: string) {
  await deleteRun(projectId, runId);
  const single = store.get(runOutcomeAtom);
  if (single?.runId === runId) store.set(runOutcomeAtom, { ...single, runId: null, savedAt: null });
  const sweep = store.get(sweepOutcomeAtom);
  if (sweep?.runId === runId) store.set(sweepOutcomeAtom, { ...sweep, runId: null, savedAt: null });
  void refreshHistory(projectId);
}
