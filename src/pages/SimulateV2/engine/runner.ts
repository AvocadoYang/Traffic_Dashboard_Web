/**
 * 畫面這邊用的: 開一個 Worker 跑模擬, 回報進度, 可以中途取消.
 */
import type { SimDoc } from "../model/types";
import type { SimInput, SimResult } from "./types";
import type { WorkerMessage } from "./worker";

export class SimCancelled extends Error {}

export interface SimRun {
  promise: Promise<SimResult>;
  cancel: () => void;
}

/** 專案文件裡模擬用得到的部分 (Worker 之間傳得過去的純資料) */
export const toSimInput = (doc: SimDoc): SimInput => ({
  nodes: doc.nodes,
  paths: doc.paths,
  groups: doc.groups,
  vehicleTypes: doc.vehicleTypes,
  traffic: doc.traffic,
  demand: doc.demand,
  run: doc.run,
});

export function startSimulation(input: SimInput, onProgress?: (fraction: number) => void): SimRun {
  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  let finish: ((err?: Error) => void) | null = null;
  const promise = new Promise<SimResult>((resolve, reject) => {
    finish = (err) => {
      finish = null;
      worker.terminate();
      if (err) reject(err);
    };
    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const m = e.data;
      if (m.type === "progress") onProgress?.(Math.min(1, m.done / m.total));
      else if (m.type === "done") {
        finish?.();
        resolve(m.result);
      } else if (m.type === "error") finish?.(new Error(m.message));
    };
    worker.onerror = (e) => finish?.(new Error(e.message || "worker error"));
    worker.postMessage({ id: 1, input });
  });
  return { promise, cancel: () => finish?.(new SimCancelled("cancelled")) };
}
