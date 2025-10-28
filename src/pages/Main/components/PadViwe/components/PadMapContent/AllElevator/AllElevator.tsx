import useLoc, { LocWithoutArr } from "@/api/useLoc";
import useMap from "@/api/useMap";
import useElevatorSocket from "@/sockets/useElevatorSocket";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import { FC } from "react";
import styled from "styled-components";
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

          const translateX = info?.find((i) => i.locationId === loc.locationId)
            ?.translateX as number;
          const translateY = info?.find((i) => i.locationId === loc.locationId)
            ?.translateY as number;
          const rotate = info?.find((i) => i.locationId === loc.locationId)
            ?.rotate as number;
          const LocScale = info?.find((i) => i.locationId === loc.locationId)
            ?.scale as number;

          const cargo = eleSocket[loc.locationId]?.cargo || [];
          const customName = eleSocket[loc.locationId]?.name || "";
          const isDisable = eleSocket[loc.locationId]?.disable;
          const isBook = eleSocket[loc.locationId]?.booker;
          const isManual = eleSocket[loc.locationId].isManualMode;
          const isRunning = eleSocket[loc.locationId].isRunning;
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
                    isManual={isManual}
                    isRunning={isRunning}
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
