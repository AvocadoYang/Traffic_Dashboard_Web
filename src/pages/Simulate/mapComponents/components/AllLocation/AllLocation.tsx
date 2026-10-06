import useMap from "@/api/useMap";
import { nanoid } from "nanoid";
import { FC, memo, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { tooltipProp } from "@/utils/gloable";
import { Point } from "./components/PointAndLine";
import {
  MirAreaTypeMarker,
  isMirAreaType,
} from "@/pages/Setting/mapComponents/components/AllLocation/components/MirAreaTypeMarker";
import {
  isPointAreaType,
  isStandbyAreaType,
} from "@/pages/Setting/mapComponents/components/AllLocation/pointAreaTypes";
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
        .filter(({ areaType }) => isPointAreaType(areaType))
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
              {isMirAreaType(loc.areaType) ? (
                <MirAreaTypeMarker
                  id={loc.locationId.toString()}
                  areaType={loc.areaType}
                  left={displayX}
                  top={displayY}
                  rotation={loc.rotate}
                  onMouseEnter={() => handleEnter(loc.locationId, loc.x, loc.y)}
                  onMouseLeave={() => handleLeave()}
                />
              ) : (
                <Point
                  id={loc.locationId.toString()}
                  canrotate={`${loc.canRotate}`}
                  left={displayX}
                  top={displayY}
                  key={nanoid()}
                  $standby={isStandbyAreaType(loc.areaType)}
                  onMouseEnter={() => handleEnter(loc.locationId, loc.x, loc.y)}
                  onMouseLeave={() => handleLeave()}
                ></Point>
              )}
            </div>
          );
        })}
    </>
  );
};

export default memo(AllLocation);
