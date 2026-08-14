import { FC, useEffect, useRef } from "react";
import useMap from "@/api/useMap";
import { useAmrPointCloud } from "@/sockets/usePointCloud";
import { useIsLogIn } from "@/sockets/useAMRInfo";
import { useMiRStatus } from "@/sockets/useMirStatus";
import { useAtom } from "jotai";
import { currentMapIdAtom } from "@/utils/mapSelection";

const PointCloudLayer: FC<{ amrId: string; color: string }> = ({
  amrId,
  color,
}) => {
  const { data: map } = useMap();
  const points = useAmrPointCloud(amrId);
  const { isOverdue } = useIsLogIn(amrId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const MiR_Status_IO = useMiRStatus(amrId);
  const [mapId, setMapId] = useAtom(currentMapIdAtom);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !map) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { mapResolution, mapOriginX, mapOriginY, mapHeight } = map;

    // Coalesce draws to one per animation frame instead of once per
    // incoming socket message, and batch every point into a single
    // Path2D fill instead of thousands of individual fillRect calls.
    // The coordinate transform is inlined (rather than calling
    // rosCoord2DisplayCoord per point) to avoid allocating a throwaway
    // [x, y] array for every one of the (up to) thousands of points.
    const frame = requestAnimationFrame(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (isOverdue || !points.length) return;

      const path = new Path2D();
      for (let i = 0; i < points.length; i += 2) {
        const displayX = (points[i] - mapOriginX) / mapResolution;
        const displayY = mapHeight - (points[i + 1] - mapOriginY) / mapResolution;
        path.rect(displayX - 1, displayY - 1, 2, 2);
      }
      ctx.fillStyle = color;
      ctx.fill(path);
    });

    return () => cancelAnimationFrame(frame);
  }, [points, map, color, isOverdue]);
  if(MiR_Status_IO && MiR_Status_IO.active_map_id !== mapId) return null
  if (!map) return null;

  return (
    <canvas
      ref={canvasRef}
      width={map.mapWidth}
      height={map.mapHeight}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        pointerEvents: "none",
        zIndex: 148,
      }}
    />
  );
};

export default PointCloudLayer;
