import useMap from "@/api/useMap";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import { memo, useCallback } from "react";
import { nanoid } from "nanoid";
import { Point } from "@/pages/Setting/mapComponents/components/AllLocation/components/PointAndLine";
import { useSetAtom } from "jotai";
import { tooltipProp } from "@/utils/gloable";
import { OpenDirect } from "@/pages/Main/global/jotai";

const AllLocation = () => {
  const { data } = useMap();
  const setTooltip = useSetAtom(tooltipProp);
  const setOpen = useSetAtom(OpenDirect);
  const handleEnter = useCallback(
    (locationId: string, x: number, y: number) => {
      setTooltip({
        x,
        y,
        locationId,
      });
    },
    []
  );

  const handleLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleDireMove = (locationId: string) => {
    setOpen({ open: true, locationId });
  };

  if (!data) return;

  return (
    <>
      {data.locations
        .filter(
          ({ areaType }) => areaType === "EXTRA" || areaType === "DISPATCH"
        )
        .map((loc) => {
          const [displayX, displayY] = rosCoord2DisplayCoord({
            x: loc.x,
            y: loc.y,
            mapHeight: data?.mapHeight,
            mapOriginX: data?.mapOriginX,
            mapOriginY: data.mapOriginY,
            mapResolution: data.mapResolution,
          });

          return (
            <Point
              id={loc.locationId.toString()}
              canrotate={`${loc.canRotate}`}
              onClick={() => handleDireMove(loc.locationId.toString())}
              onMouseEnter={() => handleEnter(loc.locationId, loc.x, loc.y)}
              onMouseLeave={() => handleLeave()}
              left={displayX}
              top={displayY}
              key={nanoid()}
            ></Point>
          );
        })}
    </>
  );
};

export default memo(AllLocation);
