/**
 * 在 Web Worker 裡跑模擬, 畫面不會卡. 算完把結果 (含回放軌跡) 傳回去.
 */
import { runSimulation } from "./sim";
import type { SimInput, SimResult } from "./types";

export interface WorkerRequest {
  id: number;
  input: SimInput;
}

export type WorkerMessage =
  | { type: "progress"; id: number; done: number; total: number }
  | { type: "done"; id: number; result: SimResult }
  | { type: "error"; id: number; message: string };

// 這個檔案只在 worker 裡執行; 不引用 WebWorker 的型別, 免得跟畫面的 DOM 型別打架
const ctx = self as unknown as {
  postMessage(message: WorkerMessage, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null;
};

ctx.onmessage = (e) => {
  const { id, input } = e.data;
  try {
    const result = runSimulation(input, {
      progressEverySec: 900,
      onProgress: (done, total) => ctx.postMessage({ type: "progress", id, done, total }),
    });
    const transfer = result.trace ? [result.trace.pose.buffer, result.trace.state.buffer] : [];
    ctx.postMessage({ type: "done", id, result }, transfer);
  } catch (err) {
    ctx.postMessage({ type: "error", id, message: err instanceof Error ? err.message : String(err) });
  }
};
