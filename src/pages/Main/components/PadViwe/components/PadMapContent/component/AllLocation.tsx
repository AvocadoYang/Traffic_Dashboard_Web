import useMap from "@/api/useMap";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import {
  Fragment,
  memo,
  RefObject,
  useCallback,
  useEffect,
  useState,
} from "react";
import { nanoid } from "nanoid";
import {
  Label,
  LabelTooltip,
  LabelWrapper,
  Line,
  Point,
} from "@/pages/Setting/mapComponents/components/AllLocation/components/PointAndLine";
import { useAtomValue, useSetAtom } from "jotai";
import { mouseDetectLoc, tooltipProp } from "@/utils/gloable";
import { OpenDirect } from "@/pages/Main/global/jotai";
import useMouseMove from "@/pages/Main/components/WebView/hooks/useMoseMove";
import { mousePosition } from "@/utils/siderGloble";

const AllLocation: React.FC<{
  mapRef: RefObject<HTMLDivElement>;
}> = ({ mapRef }) => {
  const { data } = useMap();
  const setTooltip = useSetAtom(tooltipProp);
  const setOpen = useSetAtom(OpenDirect);
  const [roadInfo, setRoadInfo] =
    useState<{ spot1Id: string; spot2Id: string; roadId: string }[]>();
  const mouseDetectLocArr = useAtomValue(mouseDetectLoc);
  const { clientX, clientY } = useAtomValue(mousePosition);

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

  useEffect(() => {
    const roads = data?.roads.map((road) => {
      return {
        spot1Id: road.spot1Id,
        spot2Id: road.spot2Id,
        roadId: road.roadId,
      };
    });
    setRoadInfo(roads);
  }, [data]);

  const handleLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleDireMove = (locationId: string) => {
    console.log("???");
    setOpen({ open: true, locationId });
  };

  useMouseMove(mapRef);

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

          let angleDeg = 0;
          let labelX = displayX;
          let labelY = displayY;

          const index = [...mouseDetectLocArr].indexOf(
            loc.locationId.toString()
          );
          const total = mouseDetectLocArr.size;

          const dx = clientX - displayX;
          const dy = clientY - displayY;

          const baseRad = Math.atan2(dy, dx);
          const FAN_ANGLE = total > 6 ? 360 : 240;

          // 平均分配角度
          const spreadRad = (FAN_ANGLE * (Math.PI / 180)) / total;
          const rad = baseRad + spreadRad * (index - total / 2);

          labelX = displayX + Math.cos(rad) * 70;
          labelY = displayY + Math.sin(rad) * 70;
          angleDeg = (rad * 180) / Math.PI;

          return (
            <Fragment key={loc.locationId}>
              <Point
                id={loc.locationId.toString()}
                canrotate={`${loc.canRotate}`}
                onMouseDown={() => handleDireMove(loc.locationId.toString())}
                onMouseEnter={() => handleEnter(loc.locationId, loc.x, loc.y)}
                onMouseLeave={() => handleLeave()}
                left={displayX}
                top={displayY}
                key={nanoid()}
              ></Point>
              {mouseDetectLocArr.has(loc.locationId.toString()) ? (
                <>
                  <Line
                    id={loc.locationId}
                    x={displayX}
                    y={displayY}
                    progress={
                      mouseDetectLocArr.has(loc.locationId.toString()) ? 1 : 0
                    }
                    angle={angleDeg}
                  />
                  <LabelWrapper
                    x={labelX}
                    y={labelY}
                    key={nanoid()}
                    id={loc.locationId}
                  >
                    <Label>{loc.locationId}</Label>
                    <LabelTooltip className="tooltip">
                      {roadInfo
                        ?.filter(({ spot1Id, spot2Id }) => {
                          return (
                            spot1Id == loc.locationId ||
                            spot2Id == loc.locationId
                          );
                        })
                        .map((road) => {
                          return (
                            <p
                              key={nanoid()}
                              style={{
                                whiteSpace: "nowrap",
                                zIndex: "999999999",
                              }}
                            >{`${road.roadId}`}</p>
                          );
                        })}
                    </LabelTooltip>
                  </LabelWrapper>
                </>
              ) : (
                <></>
              )}
            </Fragment>
          );
        })}
    </>
  );
};

export default memo(AllLocation);
