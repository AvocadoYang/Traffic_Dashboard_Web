import { fromEventPattern, map, share } from "rxjs";
import { io } from "./socketConnect";

/**
 * 誰在等誰 (後端 traffic-waits, 交管的 WaitTracker): 申請路權被拒、還在等的車。
 * blockers: 擋路的車; locationId: 要去但拿不到的點位; reason: 被拒的原因;
 * since: 從什麼時候開始等 (ms, 已經換成這台電腦的時鐘)
 */
export type TrafficWait = { amrId: string; blockers: string[]; locationId: string; reason: string; since: number };

const isWait = (w: unknown): w is TrafficWait => {
  if (!w || typeof w !== "object") return false;
  const { amrId, blockers, locationId, since } = w as Record<string, unknown>;
  return typeof amrId === "string" && Array.isArray(blockers) && typeof locationId === "string" && typeof since === "number";
};

/**
 * 有變化就送, 沒變化每 2 秒也送一次 (剛連上的畫面也拿得到)。訊息帶著後端的現在時間 (now),
 * 用它把 since 換成這台電腦的時鐘 (中控室電腦的時間可能跟後端差好幾分鐘); 取到秒, 網路延遲不會讓它一直變
 */
export const trafficWaits$ = fromEventPattern<unknown>(
  (next) => io.on("traffic-waits", next),
  (next) => io.off("traffic-waits", next),
).pipe(
  map((msg) => {
    const { now, waits } = (msg ?? {}) as { now?: unknown; waits?: unknown };
    const offset = typeof now === "number" ? now - Date.now() : 0;
    return (Array.isArray(waits) ? waits.filter(isWait) : []).map((w) => ({
      ...w,
      reason: typeof w.reason === "string" ? w.reason : "",
      since: Math.round((w.since - offset) / 1000) * 1000,
    }));
  }),
  share(),
);
