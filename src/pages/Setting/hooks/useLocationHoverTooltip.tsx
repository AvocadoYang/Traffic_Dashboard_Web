import { useEffect, useMemo, RefObject } from "react";
import { useAtom, useAtomValue } from "jotai";
import { fromEvent, throttleTime, map, tap } from "rxjs";
import { rvizCoord } from "@/utils/utils";
import useMap from "@/api/useMap";
import { locationHoverInfo } from "@/utils/gloable";
import { isShowLocationTooltip } from "@/utils/siderGloble";

// 偵測半徑(公尺)：游標所在的 ROS 座標範圍內的點位都會浮出提示
const DETECT_RADIUS = 2;

const isTooltipTarget = ({ areaType }: { areaType: string }) =>
  areaType === "EXTRA" || areaType === "Dispatch";

// 控制「地點提示」開啟時，游標移動附近點位浮出 tooltip
const useLocationHoverTooltip = (
  mapRef: RefObject<HTMLDivElement>,
  mapImageRef: RefObject<HTMLImageElement>,
  scale: number,
) => {
  const showLocationToolTip = useAtomValue(isShowLocationTooltip);
  const [, setHoverInfo] = useAtom(locationHoverInfo);
  const { data } = useMap();

  // 只保留會顯示提示的點位類型，並在 data 變動時才重新計算一次，
  // 避免每次 mousemove 都對「全部」點位(含充電站/儲位等)做過濾。
  const tooltipTargets = useMemo(
    () => data?.locations.filter(isTooltipTarget) ?? [],
    [data],
  );

  useEffect(() => {
    if (
      !mapRef.current ||
      !mapImageRef.current ||
      !showLocationToolTip ||
      !data ||
      tooltipTargets.length === 0
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

        const nearbyIds = tooltipTargets
          .filter((loc) => Math.hypot(rx - loc.x, ry - loc.y) <= DETECT_RADIUS)
          .map((loc) => loc.locationId.toString())
          .sort((a, b) => Number(a) - Number(b));

        if (nearbyIds.length === 0) {
          setHoverInfo(null);
          return;
        }

        setHoverInfo({
          x: adjustX / scale,
          y: adjustY / scale,
          locationIds: nearbyIds,
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
  }, [mapRef, mapImageRef, scale, showLocationToolTip, data, tooltipTargets]);
};

export default useLocationHoverTooltip;
