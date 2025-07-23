import { FC, memo } from "react";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import useMap from "@/api/useMap";
import { useClaimedRoads } from "@/sockets/useClaimedResources";
import Road from "./Road";
import { hoverRoad } from "@/utils/gloable";
import { useAtomValue } from "jotai";

const MemoizedRoad = memo(Road, (prevProps, nextProps) => {
  return (
    prevProps.isClaimedBy === nextProps.isClaimedBy &&
    prevProps.isRoadOnHover === nextProps.isRoadOnHover
  );
});

const AllRoads: FC<{}> = () => {
  const { data } = useMap();
  const claimedRoads = useClaimedRoads();
  const roadOnHover = useAtomValue(hoverRoad);

  if (!data?.roads) return [];
  return (
    <div draggable={false}>
      {data.roads.map(
        ({
          roadId,
          roadType,
          x1,
          y1,
          x2,
          y2,
          validYawList,
          disabled,
          limit,
        }) => {
          const [displayX1, displayY1] = rosCoord2DisplayCoord({
            x: x1,
            y: y1,
            mapHeight: data.mapHeight,
            mapOriginX: data.mapOriginX,
            mapOriginY: data.mapOriginY,
            mapResolution: data.mapResolution,
          });

          const [displayX2, displayY2] = rosCoord2DisplayCoord({
            x: x2,
            y: y2,
            mapHeight: data.mapHeight,
            mapOriginX: data.mapOriginX,
            mapOriginY: data.mapOriginY,
            mapResolution: data.mapResolution,
          });

          const currentClaimedStatus = claimedRoads.get(roadId);

          return (
            <MemoizedRoad
              key={roadId}
              roadId={roadId}
              roadType={roadType}
              x1={displayX1}
              y1={displayY1}
              x2={displayX2}
              y2={displayY2}
              limit={limit}
              disabled={disabled}
              validYawList={validYawList}
              isClaimedBy={currentClaimedStatus}
              isRoadOnHover={roadOnHover === roadId}
            />
          );
        },
      )}
    </div>
  );
};

export default memo(AllRoads);
