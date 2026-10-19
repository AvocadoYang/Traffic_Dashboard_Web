/**
 * 在 Web Worker 裡讀 DXF: 解碼 -> 讀圖元 -> 展開成線、算吸附點. 大檔要幾秒, 畫面不會卡.
 */
import { flattenDxf } from "./flatten";
import { BinaryDxfError, decodeDxf, DxfFormatError, readDxf } from "./reader";
import { CadGeometry, cadTransfer } from "./types";

export interface CadWorkerRequest {
  id: number;
  buffer: ArrayBuffer;
  base: { x: number; y: number } | null;
}

export type CadWorkerMessage =
  | { type: "progress"; id: number; stage: "decode" | "parse" | "flatten"; fraction: number }
  | { type: "done"; id: number; geometry: CadGeometry }
  /** code: binary = 二進位 DXF / format = 不是 DXF / other = 其他錯誤 */
  | { type: "error"; id: number; code: "binary" | "format" | "other"; message: string };

const ctx = self as unknown as {
  postMessage(message: CadWorkerMessage, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent<CadWorkerRequest>) => void) | null;
};

ctx.onmessage = (e) => {
  const { id, buffer, base } = e.data;
  try {
    ctx.postMessage({ type: "progress", id, stage: "decode", fraction: 0 });
    const { text, encoding } = decodeDxf(buffer);
    let last = 0;
    const data = readDxf(text, (f) => {
      if (f - last < 0.05) return;
      last = f;
      ctx.postMessage({ type: "progress", id, stage: "parse", fraction: f });
    });
    ctx.postMessage({ type: "progress", id, stage: "flatten", fraction: 0 });
    const geometry = flattenDxf(data, { base, encoding });
    ctx.postMessage({ type: "done", id, geometry }, cadTransfer(geometry));
  } catch (err) {
    const code = err instanceof BinaryDxfError ? "binary" : err instanceof DxfFormatError ? "format" : "other";
    ctx.postMessage({ type: "error", id, code, message: err instanceof Error ? err.message : String(err) });
  }
};
