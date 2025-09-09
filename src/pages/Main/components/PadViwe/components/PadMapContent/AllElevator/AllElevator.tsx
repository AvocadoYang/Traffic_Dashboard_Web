import useLoc, { LocWithoutArr } from "@/api/useLoc";
import useMap from "@/api/useMap";
import ToolTip from "@/pages/Setting/components/ToolTip";
import {
  EEM,
  IsEditingQuickRoads,
  QuickRoadsArray,
} from "@/pages/Setting/utils/settingJotai";
import useElevatorSocket from "@/sockets/useElevatorSocket";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import { Tooltip } from "antd";
import { useAtomValue, useSetAtom } from "jotai";
import { FC, memo } from "react";
import styled, { keyframes } from "styled-components";
import Elevator from "./Elevator";

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

const ContainerElevator = styled.div`
  position: relative;
  display: inline-block;
`;

const AllElevator: FC = () => {
  const { data } = useMap();
  const { data: locInfo } = useLoc(undefined);
  const eleSocket = useElevatorSocket();

  if (!data || !eleSocket) return [];
  return (
    <>
      {data.locations
        .filter(({ areaType }) => areaType === "ELEVATOR")
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

          const cargo = eleSocket[loc.locationId]?.cargo || [];
          const customName = eleSocket[loc.locationId].name || "";
          const isDisable = eleSocket[loc.locationId].disable;
          const isBook = eleSocket[loc.locationId].booker;
          return (
            <div
              draggable={false}
              key={loc.locationId}
              onDragStart={(event) => {
                event.preventDefault();
              }}
              style={{ borderRadius: "50%" }}
            >
              <PointDiv
                id={loc.locationId.toString()}
                canrotate={`${loc.canRotate}`}
                left={displayX}
                top={displayY}
                key={loc.locationId}
              ></PointDiv>
              <WrapperStation left={displayX} top={displayY}>
                <ContainerElevator
                  style={{
                    transform: `translate(${translateX}px, ${translateY}px) scale(${LocScale}) rotate(${rotate}deg)`,
                  }}
                >
                  <Elevator
                    locationId={loc.locationId}
                    hasCargo={cargo.length > 0}
                    isDisable={isDisable}
                    isBook={isBook}
                    customName={customName}
                  />
                </ContainerElevator>
              </WrapperStation>
            </div>
          );
        })}
    </>
  );
};

export default AllElevator;
