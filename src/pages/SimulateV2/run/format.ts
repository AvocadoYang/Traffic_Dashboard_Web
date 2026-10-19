/** 結果頁的時間、數字格式 */

const pad = (n: number) => String(n).padStart(2, "0");

/** 秒數 -> m:ss (超過一小時 h:mm:ss) */
export function fmtDuration(sec: number | null | undefined): string {
  if (sec === null || sec === undefined || !Number.isFinite(sec)) return "–";
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

/** 模擬秒數 -> 時鐘時間 (照模擬開始的時間), 例如 08:00 開始的 3725 秒是 09:02:05 */
export function fmtClock(startClock: string, sec: number, withSeconds = true): string {
  const [h0, m0] = startClock.split(":").map(Number);
  const total = Math.floor((h0 * 3600 + m0 * 60 + Math.max(0, sec)) % 86400);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return withSeconds ? `${pad(h)}:${pad(m)}:${pad(total % 60)}` : `${pad(h)}:${pad(m)}`;
}

export const fmtPercent = (x: number | null | undefined, digits = 0) =>
  x === null || x === undefined || !Number.isFinite(x) ? "–" : `${(x * 100).toFixed(digits)}%`;

export const fmtNumber = (x: number, digits = 1) => (Number.isFinite(x) ? (Math.round(x * 10 ** digits) / 10 ** digits).toString() : "–");

export const fmtMinutes = (sec: number) => (sec / 60 >= 10 ? Math.round(sec / 60).toString() : (sec / 60).toFixed(1));
