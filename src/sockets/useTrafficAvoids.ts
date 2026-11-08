import { useEffect, useState } from "react";
import { fromEventPattern, map, share } from "rxjs";
import { io } from "./socketConnect";

/**
 * 正在避讓的車 (後端 traffic-avoids, 交管的 AvoidTracker): 死結時被叫去讓道的車。
 * fromId: 開始避讓時所在的點位; asideId: 讓道點; forAmrId: 讓給哪台車 (不知道是空字串);
 * since: 從什麼時候開始避讓 (ms, 已經換成這台電腦的時鐘)
 */
export type TrafficAvoid = {
  amrId: string;
  fromId: string;
  asideId: string;
  forAmrId: string;
  since: number;
};

const isAvoid = (a: unknown): a is TrafficAvoid => {
  if (!a || typeof a !== "object") return false;
  const { amrId, fromId, asideId, since } = a as Record<string, unknown>;
  return (
    typeof amrId === "string" &&
    typeof fromId === "string" &&
    typeof asideId === "string" &&
    typeof since === "number"
  );
};

/** 有變化就送, 沒變化每 2 秒也送一次 (同 traffic-waits); since 用後端帶的 now 換成這台電腦的時鐘 */
export const trafficAvoids$ = fromEventPattern<unknown>(
  (next) => io.on("traffic-avoids", next),
  (next) => io.off("traffic-avoids", next),
).pipe(
  map((msg) => {
    const { now, avoids } = (msg ?? {}) as { now?: unknown; avoids?: unknown };
    const offset = typeof now === "number" ? now - Date.now() : 0;
    return (Array.isArray(avoids) ? avoids.filter(isAvoid) : []).map((a) => ({
      ...a,
      forAmrId: typeof a.forAmrId === "string" ? a.forAmrId : "",
      since: Math.round((a.since - offset) / 1000) * 1000,
    }));
  }),
  share(),
);

/** 這台車正在避讓的話回傳 起始點 / 讓道點, 沒有是 null */
export const useAmrAvoid = (amrId: string) => {
  const [avoid, setAvoid] = useState<TrafficAvoid | null>(null);
  useEffect(() => {
    const sub = trafficAvoids$
      .pipe(map((list) => list.find((a) => a.amrId === amrId) ?? null))
      .subscribe((next) =>
        setAvoid((prev) =>
          prev?.fromId === next?.fromId &&
          prev?.asideId === next?.asideId &&
          prev?.forAmrId === next?.forAmrId
            ? prev
            : next,
        ),
      );
    return () => sub.unsubscribe();
  }, [amrId]);
  return avoid;
};
