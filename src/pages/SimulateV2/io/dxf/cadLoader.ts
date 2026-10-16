/**
 * 畫面這邊用的: 開 Worker 讀 DXF; 讀過的檔案留在記憶體 (切分頁、回放、報告不用重讀).
 */
import { useEffect, useMemo, useState } from "react";
import { downloadProjectFile } from "../../api/simV2Api";
import type { CadBackground } from "../../model/types";
import type { CadWorkerMessage } from "./cadWorker";
import { CadGeometry, hiddenMaskOf } from "./types";

export { hiddenMaskOf };

export class CadParseError extends Error {
  constructor(
    readonly code: "binary" | "format" | "other",
    message: string,
  ) {
    super(message);
  }
}

export interface CadParse {
  promise: Promise<CadGeometry>;
  cancel: () => void;
}

export type CadStage = "decode" | "parse" | "flatten";

export function parseDxfBuffer(
  buffer: ArrayBuffer,
  base: { x: number; y: number } | null,
  onProgress?: (stage: CadStage, fraction: number) => void,
): CadParse {
  const worker = new Worker(new URL("./cadWorker.ts", import.meta.url), { type: "module" });
  let finish: ((err?: Error) => void) | null = null;
  const promise = new Promise<CadGeometry>((resolve, reject) => {
    finish = (err) => {
      finish = null;
      worker.terminate();
      if (err) reject(err);
    };
    worker.onmessage = (e: MessageEvent<CadWorkerMessage>) => {
      const m = e.data;
      if (m.type === "progress") onProgress?.(m.stage, m.fraction);
      else if (m.type === "done") {
        finish?.();
        resolve(m.geometry);
      } else finish?.(new CadParseError(m.code, m.message));
    };
    worker.onerror = (e) => finish?.(new CadParseError("other", e.message || "worker error"));
    worker.postMessage({ id: 1, buffer, base }, [buffer]);
  });
  return { promise, cancel: () => finish?.(new CadParseError("other", "cancelled")) };
}

/** 同一個檔案、同一個原點就是同一份 */
const keyOf = (projectId: string, cad: CadBackground) => `${projectId}/${cad.fileId}@${cad.baseX},${cad.baseY}`;

const cache = new Map<string, Promise<CadGeometry>>();
/** 最多留幾份 (大的 DXF 一份可能上百 MB) */
const CACHE_SIZE = 3;

function remember(key: string, p: Promise<CadGeometry>) {
  cache.delete(key);
  cache.set(key, p);
  while (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value as string);
}

export function loadCadGeometry(projectId: string, cad: CadBackground): Promise<CadGeometry> {
  const key = keyOf(projectId, cad);
  const hit = cache.get(key);
  if (hit) {
    remember(key, hit);
    return hit;
  }
  const p = downloadProjectFile(projectId, cad.fileId)
    .then((blob) => blob.arrayBuffer())
    .then((buf) => parseDxfBuffer(buf, { x: cad.baseX, y: cad.baseY }).promise);
  remember(key, p);
  p.catch(() => cache.delete(key));
  return p;
}

/** 匯入時已經讀好了, 直接放進來 */
export function rememberCadGeometry(projectId: string, cad: CadBackground, g: CadGeometry) {
  remember(keyOf(projectId, cad), Promise.resolve(g));
}

export type CadState =
  | { status: "none"; geometry: null }
  | { status: "loading"; geometry: null }
  | { status: "ready"; geometry: CadGeometry }
  | { status: "error"; geometry: null; error: string };

export function useCadGeometry(projectId: string | null | undefined, cad: CadBackground | null | undefined): CadState {
  const key = projectId && cad ? keyOf(projectId, cad) : null;
  const [state, setState] = useState<{ key: string | null; value: CadState }>({ key: null, value: { status: "none", geometry: null } });
  useEffect(() => {
    if (!key || !projectId || !cad) return;
    let alive = true;
    setState({ key, value: { status: "loading", geometry: null } });
    loadCadGeometry(projectId, cad).then(
      (geometry) => alive && setState({ key, value: { status: "ready", geometry } }),
      (err: unknown) => alive && setState({ key, value: { status: "error", geometry: null, error: err instanceof Error ? err.message : String(err) } }),
    );
    return () => {
      alive = false;
    };
    // cad 只看會影響內容的欄位 (key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!key) return { status: "none", geometry: null };
  return state.key === key ? state.value : { status: "loading", geometry: null };
}

/** 每個圖層要不要畫 (1 = 隱藏) */
export function useHiddenMask(g: CadGeometry | null, hiddenLayers: string[] | undefined): Uint8Array | null {
  return useMemo(() => (g ? hiddenMaskOf(g, hiddenLayers ?? []) : null), [g, hiddenLayers]);
}
