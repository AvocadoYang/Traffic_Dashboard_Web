import useMap from "@/api/useMap";
import { amrId2ColorRainbow, rosCoord2DisplayCoord } from "@/utils/utils";
import { memo, RefObject, useCallback, useMemo } from "react";
import { PointMain } from "@/pages/Setting/mapComponents/components/AllLocation/components/PointAndLine";
import {
  MirAreaTypeMarker,
  isMirAreaType,
} from "@/pages/Setting/mapComponents/components/AllLocation/components/MirAreaTypeMarker";
import { useAtomValue, useSetAtom } from "jotai";
import { nearbyLocationIdSet, tooltipProp } from "@/utils/gloable";
import { OpenDirect } from "@/pages/Main/global/jotai";
import { useAllAmrDestinations } from "@/sockets/useAMRInfo";

// 單一個點位。props 全部是基本型別或穩定的 callback,所以游標靠近 / 離開時
// 只有 isNear 真的變了的那幾個點會重繪,其他點位被 memo 擋掉。
const LocationPoint: React.FC<{
  locationId: string;
  areaType: string;
  x: number;
  y: number;
  displayX: number;
  displayY: number;
  rotate: number | undefined;
  canRotate: boolean | undefined;
  isNear: boolean;
  destinationAmr: string | undefined;
  onEnter: (locationId: string, x: number, y: number) => void;
  onLeave: () => void;
  onDirectMove: (locationId: string) => void;
}> = memo(
  ({
    locationId,
    areaType,
    x,
    y,
    displayX,
    displayY,
    rotate,
    canRotate,
    isNear,
    destinationAmr,
    onEnter,
    onLeave,
    onDirectMove,
  }) => {
    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        onDirectMove(locationId);
      },
      [locationId, onDirectMove],
    );
    const handleMouseEnter = useCallback(() => {
      onEnter(locationId, x, y);
    }, [locationId, x, y, onEnter]);

    if (isMirAreaType(areaType)) {
      return (
        <MirAreaTypeMarker
          id={locationId}
          areaType={areaType}
          left={displayX}
          top={displayY}
          rotation={rotate}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={onLeave}
        />
      );
    }

    return (
      <PointMain
        id={locationId}
        canrotate={`${canRotate}`}
        isNear={isNear}
        $destinationLabel={destinationAmr ? locationId : undefined}
        $amrColor={
          destinationAmr ? amrId2ColorRainbow(destinationAmr) : undefined
        }
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={onLeave}
        left={displayX}
        top={displayY}
      ></PointMain>
    );
  },
);

const AllLocation: React.FC<{
  mapRef: RefObject<HTMLDivElement>;
}> = () => {
  const { data } = useMap();
  const setTooltip = useSetAtom(tooltipProp);
  const setOpen = useSetAtom(OpenDirect);
  // 游標附近(偵測半徑內)的點位 id 集合，用來讓這些點稍微放大，方便使用者辨識與點擊。
  // 只在名單變動時才會換新,游標在同一群點位附近移動不會觸發重繪。
  const nearbyLocationIds = useAtomValue(nearbyLocationIdSet);

  const destinations = useAllAmrDestinations();

  const amrByDestination = useMemo(() => {
    const index = new Map<string, string>();

    Object.entries(destinations).forEach(
      ([amrId, { finalLocationId, locationId }]) => {
        const destinationId = (finalLocationId || locationId)?.trim();
        if (!destinationId || destinationId === "0") return;

        index.set(destinationId, amrId);
      },
    );

    return index;
  }, [destinations]);

  // 座標換算只跟地圖資料有關,不用每次重繪都對每個點位重算一次
  const points = useMemo(() => {
    if (!data) return [];
    return data.locations
      .filter(
        ({ areaType }) =>
          areaType === "EXTRA" ||
          areaType === "DISPATCH" ||
          isMirAreaType(areaType),
      )
      .map((loc) => {
        const [displayX, displayY] = rosCoord2DisplayCoord({
          x: loc.x,
          y: loc.y,
          mapHeight: data.mapHeight,
          mapOriginX: data.mapOriginX,
          mapOriginY: data.mapOriginY,
          mapResolution: data.mapResolution,
        });
        return { loc, id: loc.locationId.toString(), displayX, displayY };
      });
  }, [data]);

  const handleEnter = useCallback(
    (locationId: string, x: number, y: number) => {
      setTooltip({
        x,
        y,
        locationId,
      });
    },
    [],
  );

  const handleLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleDireMove = useCallback((locationId: string) => {
    setOpen({ open: true, locationId });
  }, []);

  if (!data) return;

  return (
    <>
      {points.map(({ loc, id, displayX, displayY }) => (
        <LocationPoint
          key={loc.locationId}
          locationId={id}
          areaType={loc.areaType}
          x={loc.x}
          y={loc.y}
          displayX={displayX}
          displayY={displayY}
          rotate={loc.rotate}
          canRotate={loc.canRotate}
          isNear={nearbyLocationIds.has(id)}
          destinationAmr={amrByDestination.get(id)}
          onEnter={handleEnter}
          onLeave={handleLeave}
          onDirectMove={handleDireMove}
        />
      ))}
    </>
  );
};

export default memo(AllLocation);
