import useLoc, { LocWithoutArr } from "@/api/useLoc";
import useMap from "@/api/useMap";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import React, { FC } from "react";
import styled from "styled-components";
import Stack from "./Stack";
import useStackSocket from "@/sockets/useStackSocket";

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
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: ${(props) =>
    props.canrotate === "true" ? "#ebac5b" : "#1904be"};
  position: absolute;
  left: ${(p) => p.left}px;
  top: ${(p) => p.top}px;
  z-index: 300000;
  box-shadow: 0 0 4px rgba(13, 91, 236, 0.6);
  transform: translate(-50%, -50%);
  &:hover {
    background: red;
    width: 5px;
    height: 5px;
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

const AllStack: FC = () => {
  const { data } = useMap();
  const { data: locInfo } = useLoc(undefined);
  const s = useStackSocket();

  if (!data) return [];
  return (
    <>
      {data.locations
        .filter(({ areaType }) => areaType === "STACK")
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
                canrotate={`${false}`}
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
                  <Stack info={s?.[loc.locationId]} />
                </ContainerElevator>
              </WrapperStation>
            </div>
          );
        })}
    </>
  );
};

export default AllStack;
