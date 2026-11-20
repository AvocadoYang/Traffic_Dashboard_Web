import { useEffect, useMemo, RefObject } from "react";
import { useAtom, useAtomValue } from "jotai";
import { fromEvent, throttleTime, map, tap } from "rxjs";
import { rvizCoord, closestPointOnSegment } from "@/utils/utils";
import useMap from "@/api/useMap";
import { roadHoverInfo } from "@/utils/gloable";
import { isShowRoadTooltip } from "@/utils/siderGloble";

// 偵測半徑(公尺)：游標所在的 ROS 座標範圍內的路徑都會浮出提示
const DETECT_RADIUS = 2;

// 控制「路徑提示」開啟時，游標移動附近路徑浮出 tooltip
const useRoadHoverTooltip = (
  mapRef: RefObject<HTMLDivElement>,
  mapImageRef: RefObject<HTMLImageElement>,
  scale: number,
) => {
  const showRoadTooltip = useAtomValue(isShowRoadTooltip);
  const [, setHoverInfo] = useAtom(roadHoverInfo);
  const { data } = useMap();

  // 只在 data 變動時計算一次，避免每次 mousemove 都重新取用整份路徑清單。
  const roads = useMemo(() => data?.roads ?? [], [data]);

  useEffect(() => {
    if (
      !mapRef.current ||
      !mapImageRef.current ||
      !showRoadTooltip ||
      !data ||
      roads.length === 0
    ) {
      setHoverInfo(null);
      return;
    }

    const mapEl = mapRef.current;

    const mouseMoveEvent$ = fromEvent<MouseEvent>(mapEl, "mousemove").pipe(
      throttleTime(30, undefined, { leading: true, trailing: true }),
      map(({ clientX, clientY }) => ({ clientX, clientY })),
      tap(({ clientX, clientY }) => {
        if (!mapImageRef.current) return;
        const rect = mapImageRef.current.getBoundingClientRect();
        if (
          clientX < rect.left ||
          clientX > rect.right ||
          clientY < rect.top ||
          clientY > rect.bottom
        ) {
          setHoverInfo(null);
          return;
        }

        const adjustX = clientX - rect.left;
        const adjustY = clientY - rect.top;
        const [rx, ry] = rvizCoord({
          displayX: adjustX,
          displayY: adjustY,
          mapResolution: data.mapResolution,
          mapOriginX: data.mapOriginX,
          mapOriginY: data.mapOriginY,
          mapHeight: data.mapHeight,
          scaleSize: scale,
        });

        const nearbyIds = roads
          .filter(
            (road) =>
              closestPointOnSegment(rx, ry, road.x1, road.y1, road.x2, road.y2)
                .distance <= DETECT_RADIUS,
          )
          .map((road) => road.roadId)
          .sort();

        if (nearbyIds.length === 0) {
          setHoverInfo(null);
          return;
        }

        setHoverInfo({
          x: adjustX / scale,
          y: adjustY / scale,
          roadIds: nearbyIds,
        });
      }),
    );

    const handleMouseLeave = () => setHoverInfo(null);
    mapEl.addEventListener("mouseleave", handleMouseLeave);

    const subscription = mouseMoveEvent$.subscribe();

    return () => {
      subscription.unsubscribe();
      mapEl.removeEventListener("mouseleave", handleMouseLeave);
      setHoverInfo(null);
    };
  }, [mapRef, mapImageRef, scale, showRoadTooltip, data, roads]);
};

export default useRoadHoverTooltip;
