import { useSyncExternalStore } from "react";

/**
 * 後端連不連得上。
 *
 * 單一一次 API 失敗不代表後端掛了 (可能只是那支 API 出錯), 所以流程是:
 *   axios 遇到連不上 / 502 / 503 / 504、或 socket 斷線 -> reportPossibleOutage()
 *   -> 探測後端; 連續兩次探測失敗才算掛掉 -> 顯示「後端無法連線」頁
 *   -> 掛掉期間每 3 秒探測一次, 通了就自動恢復。
 * 探測打 /api/ (nginx 會轉給後端): 回 502 / 503 / 504 或連不上才算掛, 其他狀態碼 (404、401…) 都算活著,
 * 不需要後端提供額外的 API, nginx 也不用改。
 */

const PROBE_TIMEOUT_MS = 3000;
const RETRY_MS = 3000;
const FAILS_TO_DECLARE_DOWN = 2;

type State = { down: boolean; lastCheck: number | null; since: number | null };

let state: State = { down: false, lastCheck: null, since: null };
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

let baseUrl = window.location.origin.replace("5173", "4000");
/** axiosClient 建好之後把它的 baseURL 交過來, 兩邊永遠指同一台 */
export const setBackendBaseUrl = (url: string) => {
  baseUrl = url;
};

const probe = async (): Promise<boolean> => {
  try {
    // 要打一個會被轉給後端的路徑: 案場是 nginx 提供畫面, 打 "/" 只會拿到 nginx 自己的 index.html,
    // 後端掛了也是 200。後端活著時這個路徑會回 404 / 401 等狀態碼 (都算活著);
    // 後端掛了 nginx 會回 502 / 503 / 504, 連 nginx 都連不上則是 fetch 丟錯誤。
    const res = await fetch(`${baseUrl}/api/`, {
      cache: "no-store",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return ![502, 503, 504].includes(res.status);
  } catch {
    // 開發環境畫面和後端不同網址, 後端沒開 CORS 時上面的 fetch 會丟錯誤, 但後端其實活著:
    // 再用 no-cors 確認一次 (有回應就 resolve)。案場是同網址, 這裡一樣會失敗 -> 才是真的連不上。
    try {
      await fetch(`${baseUrl}/api/`, {
        mode: "no-cors",
        cache: "no-store",
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
      return true;
    } catch {
      return false;
    }
  }
};

let running = false;
let onRecover: (() => void) | null = null;
/** 後端恢復時要做的事 (重連 socket、重抓資料) */
export const setOnBackendRecover = (fn: () => void) => {
  onRecover = fn;
};

const check = async () => {
  if (running) return;
  running = true;
  try {
    let fails = 0;
    // 還沒判定掛掉時, 連續失敗到門檻才算; 已經掛掉時, 一次成功就恢復
    for (;;) {
      const ok = await probe();
      set({ lastCheck: Date.now() });
      if (ok) {
        if (state.down) {
          set({ down: false, since: null });
          onRecover?.();
        }
        return;
      }
      fails += 1;
      if (fails >= FAILS_TO_DECLARE_DOWN && !state.down) {
        set({ down: true, since: Date.now() });
      }
      await new Promise((r) => setTimeout(r, RETRY_MS));
    }
  } finally {
    running = false;
  }
};

/** axios / socket 發現可能連不上時呼叫; 重複呼叫沒關係 (同時只會有一個探測在跑) */
export const reportPossibleOutage = () => {
  void check();
};

/** 這個錯誤是不是「後端連不上」(沒收到任何回應, 或閘道回的 502 / 503 / 504) */
export const isOutageError = (err: unknown): boolean => {
  const e = err as { response?: { status?: number }; code?: string; request?: unknown };
  if (e?.response) return [502, 503, 504].includes(e.response.status ?? 0);
  // 沒有 response: 逾時 / 連線被拒 / 斷線; 被主動取消的不算
  return Boolean(e?.request) && e?.code !== "ERR_CANCELED";
};

export const retryBackendNow = () => reportPossibleOutage();

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useBackendStatus = () => useSyncExternalStore(subscribe, () => state);
