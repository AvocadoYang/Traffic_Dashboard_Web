import useMap from "@/api/useMap";
import { nanoid } from "nanoid";
import { FC, memo, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { tooltipProp } from "@/utils/gloable";
import { draggableLineInitialPoint } from "@/pages/Setting/hooks/hook";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import {
  EditRoadPanelSwitch,
  EditZoneSwitch,
  isShowLocation,
} from "@/utils/siderGloble";
import { DraggableLine, Point } from "../AllLocation/components/PointAndLine";
import useLoc, { LocWithoutArr } from "@/api/useLoc";
import {
  IsEditingQuickRoads,
  QuickRoadsArray,
} from "@/pages/Setting/utils/settingJotai";
import styled from "styled-components";
import ChargeStation from "./ChargeStation";

const WrapperStation = styled.div.attrs<{
  left: number;
  top: number;
}>(({ left, top }) => ({
  style: { left, top },
}))<{
  left: number;
  top: number;
}>`
  position: absolute;
  width: 5px;
  height: 5px;
`;

const AllChargeStation: FC<{
  setInitPoint: React.Dispatch<draggableLineInitialPoint>;
  handleMouseDown: (startId: string) => void;
}> = ({ setInitPoint, handleMouseDown }) => {
  const showLocation = useAtomValue(isShowLocation);
  const openEditRoadPanel = useAtomValue(EditRoadPanelSwitch);
  const setTooltip = useSetAtom(tooltipProp);
  const { data } = useMap();
  const openEditZone = useAtomValue(EditZoneSwitch);
  const { data: locInfo } = useLoc(undefined);
  const quickRoad = useAtomValue(IsEditingQuickRoads);
  const setQuickRoadArr = useSetAtom(QuickRoadsArray);

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
    []
  );

  const handleLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  if (!data || !showLocation) return;
  return (
    <>
      {data.locations
        .filter(({ areaType }) => areaType === "CHARGING")
        .map((loc) => {
          const [displayX, displayY] = rosCoord2DisplayCoord({
            x: loc.x,
            y: loc.y,
            mapHeight: data?.mapHeight,
            mapOriginX: data?.mapOriginX,
            mapOriginY: data.mapOriginY,
            mapResolution: data.mapResolution,
          });

          const info = locInfo as LocWithoutArr[];

          const translateX =
            info?.find((i) => i.locationId === loc.locationId)?.translateX || 0;
          const translateY =
            info?.find((i) => i.locationId === loc.locationId)?.translateY || 0;
          const rotate =
            info?.find((i) => i.locationId === loc.locationId)?.rotate || 270;
          const LocScale =
            info?.find((i) => i.locationId === loc.locationId)?.scale || 1;

          return (
            <div
              draggable={false}
              key={loc.locationId}
              onDragStart={(event) => {
                event.preventDefault();
              }}
              style={{ borderRadius: "50%" }}
              id={loc.locationId.toString()}
              onClick={() => {
                handleQuickRoad(loc.locationId);
              }}
            >
              <Point
                id={loc.locationId.toString()}
                canrotate={`${loc.canRotate}`}
                left={displayX}
                top={displayY}
                key={nanoid()}
                onMouseEnter={() => handleEnter(loc.locationId, loc.x, loc.y)}
                onMouseLeave={() => handleLeave()}
                onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
                  if (!openEditRoadPanel || openEditZone) return;
                  setInitPoint({ clientX: e.clientX, clientY: e.clientY });
                  handleMouseDown((e.target as HTMLInputElement).id);
                }}
              ></Point>

              <WrapperStation left={displayX} top={displayY}>
                <ChargeStation
                  locationId={loc.locationId}
                  isAlive={true}
                  isDisable={false}
                  customName={""}
                  translateX={translateX}
                  translateY={translateY}
                  rotate={rotate}
                  scale={LocScale}
                />
              </WrapperStation>

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

export default memo(AllChargeStation);
