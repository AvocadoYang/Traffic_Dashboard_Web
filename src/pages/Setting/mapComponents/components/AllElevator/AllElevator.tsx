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

const CargoLight = styled.div`
  width: 1em;
  height: 1em;
  /* Use a small border-radius for a slightly rounded cube edge */
  border-radius: 4px;
  position: absolute;
  left: 15px;
  bottom: 15px;

  /* 3D Box effect start */
  background-color: #ff5555; /* Base color for the front face */

  box-shadow:
    /* Top face highlight (light source from top-left) */
    inset 2px 2px 5px rgba(255, 255, 255, 0.7),
    /* Right face shadow */ 5px 5px 10px rgba(0, 0, 0, 0.5),
    /* Bottom face shadow */ -5px -5px 10px rgba(0, 0, 0, 0.3);
  /* 3D Box effect end */
`;

const ContainerElevator = styled.div`
  position: relative;
  display: inline-block;
`;

const AllElevator: FC = () => {
  const { data } = useMap();
  const { data: locInfo } = useLoc(undefined);
  const eleSocket = useElevatorSocket();
  const setElevatorModal = useSetAtom(EEM);
  const quickRoad = useAtomValue(IsEditingQuickRoads);
  const setQuickRoadArr = useSetAtom(QuickRoadsArray);

  const handleQuickRoad = (locationId: string) => {
    if (!quickRoad) return;

    setQuickRoadArr((prev) => [...prev, locationId]);
  };

  const handleEdit = (locationId: string) => {
    if (quickRoad) {
      handleQuickRoad(locationId);
      return;
    }
    setElevatorModal({ locationId, isOpen: true });
  };

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
          const customName = eleSocket[loc.locationId]?.name || "";
          const isDisable = eleSocket[loc.locationId]?.disable;

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
