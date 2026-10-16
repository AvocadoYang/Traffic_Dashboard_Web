/**
 * 執行與結果分頁的狀態. 結果只放在記憶體 (第 3 階段才存 sim_run); 換專案就清掉.
 */
import { atom } from "jotai";
import type { SimResult } from "../engine/types";
import type { SimDoc } from "../model/types";
import type { View } from "./editorAtoms";

export interface RunOutcome {
  projectId: string;
  /** 跑的時候用的那份 doc: 回放畫地圖用它, 也拿來判斷結果過期了沒 */
  doc: SimDoc;
  result: SimResult;
}

export const runOutcomeAtom = atom<RunOutcome | null>(null);

/** 正在跑: 0 ~ 1 的進度; 沒在跑是 null */
export const runProgressAtom = atom<number | null>(null);

export const runErrorAtom = atom<string | null>(null);

/** 回放: 目前的模擬秒數、播放中、速度 */
export const playTimeAtom = atom(0);
export const playingAtom = atom(false);
export const playSpeedAtom = atom(20);

/** 地圖顯示: 回放 / 塞車熱點 */
export const mapModeAtom = atom<"replay" | "heat">("replay");

/** 回放地圖自己的平移縮放 (跟佈局的分開) */
export const replayViewAtom = atom<View | null>(null);

/** 要地圖移到某個地方 (熱點、死結): 每次給新的物件觸發一次 */
export const replayFocusAtom = atom<{ x: number; y: number; ids?: string[] } | null>(null);

/** 換專案、重新載入時把結果清掉 */
export const clearRunAtom = atom(null, (_get, set) => {
  set(runOutcomeAtom, null);
  set(runProgressAtom, null);
  set(runErrorAtom, null);
  set(playTimeAtom, 0);
  set(playingAtom, false);
  set(replayViewAtom, null);
  set(replayFocusAtom, null);
});
