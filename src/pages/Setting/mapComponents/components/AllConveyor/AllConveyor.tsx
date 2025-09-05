import useLoc, { LocWithoutArr } from "@/api/useLoc";
import useMap from "@/api/useMap";
import { tooltipProp } from "@/utils/gloable";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import { useSetAtom } from "jotai";
import { FC, memo } from "react";
import styled from "styled-components";
import ConveyorIcon from "./ConveyorIcon";
import useConveyorSocket from "@/sockets/useConveyorSocket";

const PointDiv = styled.div.attrs<{
  left: number;
  top: number;
  canrotate: string;
}>(({ left, top, canrotate }) => ({
  style: { left, top, canrotate },
}))<{
  left: number;
  top: number;
  canrotate: string;
}>`
  position: absolute;
  width: 5px;
  height: 5px;
  background: ${(props) =>
    props.canrotate === "true" ? "#ebac5b" : "#71ce00"};
  border-radius: 50%;
  z-index: 10;
  transition-duration: 200ms;
  &:hover {
    background: red;
    scale: 1.8;
  }
`;

export const Point = memo(PointDiv);

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

const AllConveyor: FC = () => {
  const { data } = useMap();
  const { data: locInfo } = useLoc(undefined);
  const conveyorData = useConveyorSocket();
  const setTooltip = useSetAtom(tooltipProp);

  const handleEnter = (locationId: string, x: number, y: number) => {
    setTooltip({
      x,
      y,
      locationId,
    });
  };
  // console.log(conveyorData, 'kkk');
  const handleLeave = () => {
    setTooltip(null);
  };
  if (!data) return [];
  return (
    <>
      {data.locations
        .filter(({ areaType }) => areaType === "CONVEYOR")
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
            info?.find((i) => i.locationId === loc.locationId)?.rotate || 0.1;
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
            >
              <Point
                id={loc.locationId.toString()}
                canrotate={`${loc.canRotate}`}
                left={displayX}
                top={displayY}
                key={loc.locationId}
                onMouseEnter={() => handleEnter(loc.locationId, loc.x, loc.y)}
                onMouseLeave={() => handleLeave()}
              ></Point>
              <WrapperStation left={displayX} top={displayY}>
                <ConveyorIcon
                  translateX={translateX}
                  translateY={translateY}
                  rotate={rotate}
                  scale={LocScale}
                  info={
                    conveyorData?.find(
                      (s) => s.locationId === loc.locationId,
                    ) || null
                  }
                />
              </WrapperStation>
            </div>
          );
        })}
    </>
  );
};

export default AllConveyor;
