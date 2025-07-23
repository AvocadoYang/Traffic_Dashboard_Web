import useMap from "@/api/useMap";
import { nanoid } from "nanoid";
import { FC, memo, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { tooltipProp } from "@/utils/gloable";
import { Point } from "./components/PointAndLine";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import { isShowLocation } from "@/utils/siderGloble";

const AllLocation: FC = () => {
  const showLocation = useAtomValue(isShowLocation);
  const setTooltip = useSetAtom(tooltipProp);
  const { data } = useMap();

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

  if (!data || !showLocation) return;
  return (
    <>
      {data.locations
        .filter(
          ({ areaType }) => areaType === "Extra" || areaType === "Dispatch",
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
            <div
              draggable={false}
              key={loc.locationId}
              style={{ borderRadius: "50%" }}
              id={loc.locationId.toString()}
            >
              <Point
                id={loc.locationId.toString()}
                canrotate={`${loc.canRotate}`}
                left={displayX}
                top={displayY}
                key={nanoid()}
                onMouseEnter={() => handleEnter(loc.locationId, loc.x, loc.y)}
                onMouseLeave={() => handleLeave()}
              ></Point>
            </div>
          );
        })}
    </>
  );
};

export default memo(AllLocation);
