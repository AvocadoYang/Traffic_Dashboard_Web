import useMap from "@/api/useMap";
import { nanoid } from "nanoid";
import { FC, memo, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { tooltipProp } from "@/utils/gloable";
import { draggableLineInitialPoint } from "@/pages/Setting/hooks/hook";
import { Point, DraggableLine } from "./components/PointAndLine";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import {
  EditRoadPanelSwitch,
  EditZoneSwitch,
  isShowLocation,
} from "@/utils/siderGloble";
import {
  EBLM,
  IsEditingQuickRoads,
  QuickRoadsArray,
} from "@/pages/Setting/utils/settingJotai";

const AllLocation: FC<{
  setInitPoint: React.Dispatch<draggableLineInitialPoint>;
  handleMouseDown: (startId: string) => void;
}> = ({ setInitPoint, handleMouseDown }) => {
  const showLocation = useAtomValue(isShowLocation);
  const openEditRoadPanel = useAtomValue(EditRoadPanelSwitch);
  const setTooltip = useSetAtom(tooltipProp);
  const { data } = useMap();
  const openEditZone = useAtomValue(EditZoneSwitch);
  const quickRoad = useAtomValue(IsEditingQuickRoads);
  const setQuickRoadArr = useSetAtom(QuickRoadsArray);
  const setOpenEBLM = useSetAtom(EBLM);

  const handleQuickRoad = (locationId: string) => {
    if (!quickRoad) return;

    setQuickRoadArr((prev) => [...prev, locationId]);
  };

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

  const handleClick = (e: any, locationId: string) => {
    if (quickRoad) {
      handleQuickRoad(locationId);
      return;
    }

    if (!openEditRoadPanel || openEditZone) {
      setOpenEBLM({ locationId: locationId, isOpen: true });
    } else {
      setInitPoint({ clientX: e.clientX, clientY: e.clientY });
      handleMouseDown((e.target as HTMLInputElement).id);
    }
  };

  if (!data || !showLocation) return;
  return (
    <>
      {data.locations
        .filter(
          ({ areaType }) => areaType === "EXTRA" || areaType === "Dispatch",
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
              onDragStart={(event) => {
                event.preventDefault();
              }}
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
                onMouseDown={(e) => handleClick(e, loc.locationId)}
              ></Point>
              <DraggableLine
                locId={loc.locationId.toString()}
                left={displayX}
                top={displayY}
                key={nanoid()}
              ></DraggableLine>
            </div>
          );
        })}
    </>
  );
};

export default memo(AllLocation);
