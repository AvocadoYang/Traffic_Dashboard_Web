import { useEffect, useState } from "react";
import { filter, fromEventPattern, share } from "rxjs";

import { io } from "./socketConnect";

// The backend sends `points` as a raw binary buffer (flat
// [x0, y0, x1, y1, ...] float32 pairs), not a JSON array — socket.io-client
// hands binary attachments back as ArrayBuffer by default in the browser.
type PointCloudMessage = { amrId: string; points: ArrayBuffer };

const isPointCloudMessage = (msg: unknown): msg is PointCloudMessage => {
  if (!msg || typeof msg !== "object") return false;
  const { amrId, points } = msg as Record<string, unknown>;
  return typeof amrId === "string" && points instanceof ArrayBuffer;
};

const pointCloud$ = fromEventPattern<unknown>(
  (next) => {
    io.on("point-cloud", next);
    return;
  },
  (next) => {
    io.off("point-cloud", next);
  },
).pipe(filter(isPointCloudMessage), share());

const EMPTY_POINTS = new Float32Array(0);

export const useAmrPointCloud = (amrId: string) => {
  const [points, setPoints] = useState<Float32Array>(EMPTY_POINTS);

  useEffect(() => {
    const sub = pointCloud$.subscribe((data) => {
      if (data.amrId !== amrId) return;
      setPoints(new Float32Array(data.points));
    });

    return () => {
      sub.unsubscribe();
    };
  }, [amrId]);

  return points;
};
