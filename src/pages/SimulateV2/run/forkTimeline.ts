/**
 * 3D 回放的牙叉: 軌跡只記了每一筆的狀態, 沒記牙叉。這裡把每台車連續的取貨 / 放貨時段找出來,
 * 在那一段時間裡演一次: 前段伸進棧板 (或對位)、中段升 (降)、後段退出。
 */
import { CARRY_LIFT } from "@/components/Fleet3D/forkliftRig";
import { TIME_BUCKETS, Trace } from "../engine/types";
import { isLoaded } from "./colors";

const PICK = TIME_BUCKETS.indexOf("pick");
const DROP = TIME_BUCKETS.indexOf("drop");

/** 一台車連續在取貨 / 放貨的時段 (秒), 照開始時間排好 */
export type ForkWork = { start: number[]; end: number[]; pick: boolean[] };

export function forkWorkOf(trace: Trace): ForkWork[] {
  const n = trace.vehicles.length;
  const out: ForkWork[] = trace.vehicles.map(() => ({ start: [], end: [], pick: [] }));
  for (let k = 0; k < n; k++) {
    const w = out[k];
    let open = -1;
    for (let i = 0; i <= trace.count; i++) {
      const b = i < trace.count ? trace.state[i * n + k] & 0x0f : -1;
      const prev = open >= 0 ? trace.state[open * n + k] & 0x0f : -1;
      if (open >= 0 && b !== prev) {
        w.start.push(open * trace.dt);
        w.end.push(i * trace.dt);
        w.pick.push(prev === PICK);
        open = -1;
      }
      if (open < 0 && (b === PICK || b === DROP)) open = i;
    }
  }
  return out;
}

const smoothstep = (a: number, b: number, x: number) => {
  const f = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return f * f * (3 - 2 * f);
};

/** t 秒時牙叉多高 (公尺)、牙叉上有沒有貨; state 是軌跡裡那時候的狀態 */
export function forkAt(w: ForkWork, t: number, state: number): { lift: number; loaded: boolean } {
  // 最後一個開始時間 <= t 的時段
  let lo = 0;
  let hi = w.start.length - 1;
  let at = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (w.start[mid] <= t) {
      at = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  if (at >= 0 && t < w.end[at]) {
    const up = smoothstep(0.3, 0.7, (t - w.start[at]) / (w.end[at] - w.start[at]));
    return {
      lift: CARRY_LIFT * (w.pick[at] ? up : 1 - up),
      // 取貨: 棧板一開始就在牙叉上 (正要被抬起來); 放貨: 軌跡裡放完才算沒載貨
      loaded: w.pick[at] || isLoaded(state),
    };
  }
  const loaded = isLoaded(state);
  return { lift: loaded ? CARRY_LIFT : 0, loaded };
}
