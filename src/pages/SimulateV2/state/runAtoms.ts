/**
 * 執行與結果分頁的狀態. 跑完的結果會存成紀錄 (後端 sim_run), 換專案時記憶體裡的清掉,
 * 回到結果頁時再從紀錄讀最新的一筆.
 */
import { atom } from "jotai";
import type { SimResult } from "../engine/types";
import type { SimDoc, SweepSettings } from "../model/types";
import type { SweepPlan, SweepRun } from "../run/sweep";
import type { ReplayRecording } from "../run/replayRecorder";
import type { View } from "./editorAtoms";

/** 單次執行, 或車數掃描裡的某一次 (某個台數、某個種子) */
export type RunSource = { kind: "single" } | { kind: "sweep"; count: number; seed: number };

export interface RunOutcome {
  projectId: string;
  /** 跑的時候用的那份 doc: 回放畫地圖用它 (車數掃描的那一次: 台數和種子已經換過) */
  doc: SimDoc;
  result: SimResult;
  source: RunSource;
  /** 輸入的指紋: 單次執行是 runHash, 車數掃描的那一次是整個掃描的 sweepHash; 跟目前的設定比, 不一樣就是過期 */
  hash: string;
  /** 存成紀錄後才有 */
  runId: string | null;
  /** 紀錄的時間; 剛跑完、還沒存好是 null */
  savedAt: string | null;
  /** 從紀錄打開的: 回放軌跡要重算 (loading), 重算失敗 (failed) */
  trace: "ready" | "loading" | "failed";
  /** 重算出來的數字跟紀錄不一樣 (引擎改過) */
  mismatch: boolean;
  /** 算這個結果的引擎版本 */
  engine: string;
}

export interface SweepOutcome {
  projectId: string;
  /** 掃描開始時的 doc (台數、種子是原本的) */
  doc: SimDoc;
  hash: string;
  plan: SweepPlan;
  settings: SweepSettings;
  /** 跑完的; 跑的時候一筆一筆加進來 */
  runs: SweepRun[];
  total: number;
  done: boolean;
  wallMs: number;
  runId: string | null;
  savedAt: string | null;
  engine: string;
}

/** 左邊的設定: 單次執行 / 車數掃描 */
export const runModeAtom = atom<"single" | "sweep">("single");

/** 單次執行的結果 */
export const runOutcomeAtom = atom<RunOutcome | null>(null);

/** 正在跑: 0 ~ 1 的進度; 沒在跑是 null */
export const runProgressAtom = atom<number | null>(null);

export const runErrorAtom = atom<string | null>(null);

/** 結果沒存進紀錄 (結果還在畫面上, 只是重新整理後就沒了) */
export const saveErrorAtom = atom<string | null>(null);

/** 車數掃描的結果 (跑的時候也在這裡, done 是 false) */
export const sweepOutcomeAtom = atom<SweepOutcome | null>(null);
export const sweepProgressAtom = atom<number | null>(null);
export const sweepErrorAtom = atom<string | null>(null);

/** 在掃描結果裡點了某個台數 / 種子: 重算那一次給回放看 */
export interface SweepPick {
  count: number;
  seed: number;
  outcome: RunOutcome | null;
  error: string | null;
}
export const sweepPickAtom = atom<SweepPick | null>(null);

/** 目前地圖、結果面板顯示的那一次 */
export const shownOutcomeAtom = atom((get) => (get(runModeAtom) === "single" ? get(runOutcomeAtom) : (get(sweepPickAtom)?.outcome ?? null)));

/** 回放: 目前的模擬秒數、播放中、速度 */
export const playTimeAtom = atom(0);
export const playingAtom = atom(false);
export const playSpeedAtom = atom(20);

/** 地圖顯示: 回放 / 塞車熱點 / 3D 回放 */
export const mapModeAtom = atom<"replay" | "heat" | "3d">("replay");

/** 正在把回放錄成影片 (見 replayRecorder); 3D 畫布每畫完一幀要複製給它 */
export const replayRecordingAtom = atom<ReplayRecording | null>(null);

/** 回放地圖自己的平移縮放 (跟佈局的分開) */
export const replayViewAtom = atom<View | null>(null);

/** 要地圖移到某個地方 (熱點、死結): 每次給新的物件觸發一次 */
export const replayFocusAtom = atom<{ x: number; y: number; ids?: string[] } | null>(null);

/** 這次打開專案後, 已經從紀錄自動讀過最新結果了 (專案 id); 換專案時清掉 */
export const autoLoadedAtom = atom<string | null>(null);

/** 展示模式 (全螢幕、只有地圖和即時數字) */
export const presentAtom = atom(false);

/** 報告預覽 (列印) */
export const reportOpenAtom = atom(false);

/** 換專案、重新載入時把結果清掉 */
export const clearRunAtom = atom(null, (_get, set) => {
  set(runOutcomeAtom, null);
  set(runProgressAtom, null);
  set(runErrorAtom, null);
  set(saveErrorAtom, null);
  set(sweepOutcomeAtom, null);
  set(sweepProgressAtom, null);
  set(sweepErrorAtom, null);
  set(sweepPickAtom, null);
  set(playTimeAtom, 0);
  set(playingAtom, false);
  set(replayViewAtom, null);
  set(replayFocusAtom, null);
  set(presentAtom, false);
  set(reportOpenAtom, false);
  set(autoLoadedAtom, null);
});
