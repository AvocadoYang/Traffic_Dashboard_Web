import useLoc, { LocWithoutArr } from "@/api/useLoc";
import useMap from "@/api/useMap";
import { EEM } from "@/pages/Setting/utils/settingJotai";
import useElevatorSocket from "@/sockets/useElevatorSocket";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import { useSetAtom } from "jotai";
import { FC, memo } from "react";
import styled, { keyframes } from "styled-components";

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
    
    /* Right face shadow */
    5px 5px 10px rgba(0, 0, 0, 0.5),
    
    /* Bottom face shadow */
    -5px -5px 10px rgba(0, 0, 0, 0.3);
  /* 3D Box effect end */


  
`;

const ContainerElevator = styled.div`
  position: relative;
  display: inline-block;
`;

const AllElevator: FC = () => {
  const { data } = useMap();
  const { data: locInfo } = useLoc(undefined);
  const eleSocket = useElevatorSocket()
  const setElevatorModal = useSetAtom(EEM);

  const handleEdit = (locationId: string) => {
    setElevatorModal({ locationId, isOpen: true });
  };

  if (!data || !eleSocket) return [];
  return (
    <>
      {data.locations
        .filter(({ areaType }) => areaType === "Elevator")
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

            const cargo = eleSocket[loc.locationId].cargo

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
              ></Point>
              <WrapperStation left={displayX} top={displayY}>
                <ContainerElevator
                  style={{
                    transform: `translate(${translateX}px, ${translateY}px) scale(${LocScale}) rotate(${rotate}deg)`,
                  }}
                >
                  {cargo.length > 0 ? (  <CargoLight></CargoLight>):null}
                
                  <svg
                    width={20}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    onClick={() => handleEdit(loc.locationId.toString())}
                  >
                    <title>fence-electric</title>
                    <path d="M9 9V11H7V9H5V11H3V9H1V21H3V19H5V21H7V19H9V21H11V19H13V21H15V19H17V21H19V19H21V21H23V9H21V11H19V9H17V11H15V9H13V11H11V9H9M3 13H5V17H3V13M7 13H9V17H7V13M11 13H13V17H11V13M15 13H17V17H15V13M19 13H21V17H19V13M7 4H11V2L17 5H13V7L7 4Z" />
                  </svg>
                </ContainerElevator>
              </WrapperStation>
            </div>
          );
        })}
    </>
  );
};

export default AllElevator;
