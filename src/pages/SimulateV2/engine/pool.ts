/**
 * 車數掃描: 開幾個 Worker 一起跑很多次模擬 (每次只要 KPI). 一個 Worker 跑完一次就接下一次.
 */
import type { RunSummary, SimInput } from "./types";
import { SimCancelled } from "./runner";
import type { WorkerMessage } from "./worker";

export interface PoolRun {
  promise: Promise<void>;
  cancel: () => void;
}

/** 開幾個 Worker: CPU 核心數減一 (留一個給畫面), 最多 6 個 */
export const poolSize = () => Math.max(1, Math.min(6, (typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4) - 1));

export function runPool(
  jobs: SimInput[],
  onResult: (index: number, summary: RunSummary) => void,
  onProgress?: (fraction: number) => void,
  size = poolSize(),
): PoolRun {
  const workers: Worker[] = [];
  let finish: ((err?: Error) => void) | null = null;
  const promise = new Promise<void>((resolve, reject) => {
    if (!jobs.length) {
      resolve();
      return;
    }
    let next = 0;
    let finished = 0;
    /** 每個 Worker 正在跑的那一次跑到哪裡 (0 ~ 1) */
    const partial = new Map<number, number>();
    let lastReport = 0;
    const report = () => {
      if (!onProgress) return;
      const now = performance.now();
      if (now - lastReport < 100 && finished < jobs.length) return;
      lastReport = now;
      let sum = finished;
      partial.forEach((f) => (sum += f));
      onProgress(Math.min(1, sum / jobs.length));
    };
    finish = (err) => {
      finish = null;
      workers.forEach((w) => w.terminate());
      if (err) reject(err);
      else resolve();
    };
    const feed = (w: Worker) => {
      if (next >= jobs.length) return;
      const i = next++;
      partial.set(i, 0);
      w.postMessage({ id: i, input: jobs[i], mode: "summary" });
    };
    const n = Math.max(1, Math.min(size, jobs.length));
    for (let k = 0; k < n; k++) {
      const w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
      w.onmessage = (e: MessageEvent<WorkerMessage>) => {
        const m = e.data;
        if (!finish) return;
        if (m.type === "progress") {
          partial.set(m.id, Math.min(1, m.done / m.total));
          report();
        } else if (m.type === "summary") {
          partial.delete(m.id);
          finished++;
          onResult(m.id, m.summary);
          report();
          if (finished === jobs.length) finish?.();
          else feed(w);
        } else if (m.type === "error") finish?.(new Error(m.message));
      };
      w.onerror = (e) => finish?.(new Error(e.message || "worker error"));
      workers.push(w);
      feed(w);
    }
  });
  return { promise, cancel: () => finish?.(new SimCancelled("cancelled")) };
}
