/**
 * 在 Web Worker 裡跑模擬, 畫面不會卡. 算完把結果 (含回放軌跡) 傳回去;
 * 車數掃描 (summary) 只傳回 KPI, 不記軌跡.
 */
import { runSimulation } from "./sim";
import { summaryOf } from "./types";
import type { RunSummary, SimInput, SimResult } from "./types";

export interface WorkerRequest {
  id: number;
  input: SimInput;
  /** full: 完整結果和回放軌跡 (預設) / summary: 只要 KPI */
  mode?: "full" | "summary";
}

export type WorkerMessage =
  | { type: "progress"; id: number; done: number; total: number }
  | { type: "done"; id: number; result: SimResult }
  | { type: "summary"; id: number; summary: RunSummary }
  | { type: "error"; id: number; message: string };

// 這個檔案只在 worker 裡執行; 不引用 WebWorker 的型別, 免得跟畫面的 DOM 型別打架
const ctx = self as unknown as {
  postMessage(message: WorkerMessage, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null;
};

ctx.onmessage = (e) => {
  const { id, input, mode } = e.data;
  try {
    const summary = mode === "summary";
    const result = runSimulation(input, {
      trace: !summary,
      progressEverySec: 900,
      onProgress: (done, total) => ctx.postMessage({ type: "progress", id, done, total }),
    });
    if (summary) {
      ctx.postMessage({ type: "summary", id, summary: summaryOf(result) });
      return;
    }
    const transfer = result.trace ? [result.trace.pose.buffer, result.trace.state.buffer] : [];
    ctx.postMessage({ type: "done", id, result }, transfer);
  } catch (err) {
    ctx.postMessage({ type: "error", id, message: err instanceof Error ? err.message : String(err) });
  }
};
