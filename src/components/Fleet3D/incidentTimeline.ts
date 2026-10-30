import type { IncidentReplay } from "@/api/useEStopHistory";

/** 急停回放的時間軸: 某一台車在某個時間 (ms, 相對急停, 之前是負的) 在哪、有沒有載貨 */

type Vehicle = IncidentReplay["vehicles"][number];

/** 最後一筆之後超過這麼久沒資料就當作不在了 (離線) */
export const GONE_MS = 2000;

const shortDeg = (from: number, to: number) => ((((to - from) % 360) + 540) % 360) - 180;

/** 這台車在 t 的位置 (前後兩筆之間插值, 角度走近的那一邊); 還沒出現或已經離線回傳 null */
export const incidentPoseAt = (v: Vehicle, t: number) => {
  const s = v.samples;
  if (!s.length || t < s[0][0] || t > s[s.length - 1][0] + GONE_MS) return null;
  let lo = 0;
  let hi = s.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (s[mid][0] <= t) lo = mid;
    else hi = mid - 1;
  }
  const a = s[lo];
  const b = s[lo + 1];
  if (!b) return { x: a[1], y: a[2], yaw: a[3] };
  const f = (t - a[0]) / Math.max(1, b[0] - a[0]);
  return { x: a[1] + (b[1] - a[1]) * f, y: a[2] + (b[2] - a[2]) * f, yaw: a[3] + shortDeg(a[3], b[3]) * f };
};

/** 這台車在 t 有沒有載貨 (cargo 只記變的時候) */
export const incidentLoadedAt = (v: Vehicle, t: number) => {
  let on = false;
  for (const [at, value] of v.cargo) {
    if (at > t) break;
    on = value === 1;
  }
  return on;
};
