import { FC, memo, RefObject } from "react";
import useScriptRobot from "@/api/useScriptRobot";
import AmrIcon from "./AmrIcon";
import { amrId2Color, rosCoord2DisplayCoord } from "@/utils/utils";
import useMap from "@/api/useMap";

const AllInMapAMRs: FC<{
  mapRef: RefObject<HTMLDivElement>;
  mapWrapRef: RefObject<HTMLDivElement>;
}> = ({ mapRef, mapWrapRef }) => {
  const { data: robot } = useScriptRobot();
  const { data: map } = useMap();
  if (!map) return null;

  if (!robot) return null;
  return (
    <>
      {robot
        .filter((v) => v?.script_placement_location !== "unset")
        .map((b) => {
          const detail = map.locations.find(
            (v) => v.locationId === b?.script_placement_location,
          );

          const [left, top] = rosCoord2DisplayCoord({
            x: detail?.x as number,
            y: detail?.y as number,
            mapResolution: map.mapResolution,
            mapOriginX: map.mapOriginX,
            mapOriginY: map.mapOriginY,
            mapHeight: map.mapHeight,
          });

          return (
            <AmrIcon
              amrId={b?.full_name as string}
              key={b?.id}
              color={amrId2Color(b?.id as string)}
              id={b?.id as string}
              mapRef={mapRef}
              mapWrapRef={mapWrapRef}
              left={left - 6}
              top={top - 5}
              placement={b?.script_placement_location as string}
            />
          );
        })}
    </>
  );
};

export default memo(AllInMapAMRs, () => true);
