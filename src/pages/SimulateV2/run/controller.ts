/**
 * 開始 / 停止一次模擬. 放在模組裡 (不放在元件裡), 跑到一半切到別的分頁也不會停.
 */
import type { useStore } from "jotai";
import { SimCancelled, SimRun, startSimulation, toSimInput } from "../engine/runner";
import { docAtom, projectAtom } from "../state/editorAtoms";
import { playTimeAtom, playingAtom, runErrorAtom, runOutcomeAtom, runProgressAtom } from "../state/runAtoms";

type Store = ReturnType<typeof useStore>;

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
      store.set(runOutcomeAtom, { projectId: project.id, doc, result });
      store.set(playingAtom, false);
      // 死結的話直接停在出事前一點, 不然從暖機結束開始
      store.set(playTimeAtom, result.deadlock ? Math.max(0, result.deadlock.t - 20) : result.warmupSec);
      store.set(runProgressAtom, null);
    })
    .catch((err: unknown) => {
      if (current !== run) return;
      current = null;
      store.set(runProgressAtom, null);
      if (!(err instanceof SimCancelled)) store.set(runErrorAtom, err instanceof Error ? err.message : String(err));
    });
}

export function cancelRun(store: Store) {
  const run = current;
  current = null;
  run?.cancel();
  store.set(runProgressAtom, null);
}
