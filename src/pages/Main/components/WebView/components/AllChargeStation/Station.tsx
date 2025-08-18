import { chargeStationModelProp } from "@/utils/gloable";
import { useSetAtom } from "jotai";
import { FC } from "react";
import styled, { keyframes } from "styled-components";

type ChargeStyle = {
  $is_in_service: boolean;
  translate_x?: number;
  translate_y?: number;
  scale?: number;
  rotate?: number;
};

const pulse = keyframes`
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
`;

const CStation = styled.div<ChargeStyle>`
  width: 21px;
  height: 26px;
  background-color: ${({ $is_in_service }) =>
    $is_in_service ? "#2581ffc2" : "#3d3d3d"};
  z-index: 20;
  text-align: center;
  position: absolute;
  display: flex;
  border-radius: 5px;
  font-weight: bolder;
  justify-content: center;
  align-content: center;
  align-items: center;
  opacity: ${({ $is_in_service }) => ($is_in_service ? 1 : 0.5)};
  transform: ${({ translate_x, translate_y, scale, rotate }) =>
    `translate(${translate_x}em, ${translate_y}em) scale(${scale || 1}) rotate(${rotate || 0}deg)`};
  animation: ${({ $is_in_service }) =>
    $is_in_service ? "none" : `${pulse} 1.5s infinite`};
  cursor: pointer; /* Indicate clickability */
`;

const Svg = styled.svg`
  width: 20px;
  color: white;
`;

const PathStyle = styled.path<ChargeStyle>`
  fill: ${({ $is_in_service }) => ($is_in_service ? "#ffffff" : "#b30000")};
`;

const Station: FC<{
  locationId: string;
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
}> = ({ locationId, translateX, translateY, rotate, scale }) => {
  const setOpen = useSetAtom(chargeStationModelProp);

  return (
    <CStation
      onClick={() => setOpen({ open: true, location: locationId })}
      $is_in_service={true}
      translate_x={translateX}
      translate_y={translateY}
      scale={scale}
      rotate={rotate}
    >
      <Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <PathStyle
          $is_in_service={true}
          d="M19.77,7.23L19.78,7.22L16.06,3.5L15,4.56L17.11,6.67C16.17,7.03 15.5,7.93 15.5,9A2.5,2.5 0 0,0 18,11.5C18.36,11.5 18.69,11.42 19,11.29V18.5A1,1 0 0,1 18,19.5A1,1 0 0,1 17,18.5V14A2,2 0 0,0 15,12H14V5A2,2 0 0,0 12,3H6A2,2 0 0,0 4,5V21H14V13.5H15.5V18.5A2.5,2.5 0 0,0 18,21A2.5,2.5 0 0,0 20.5,18.5V9C20.5,8.31 20.22,7.68 19.77,7.23M18,10A1,1 0 0,1 17,9A1,1 0 0,1 18,8A1,1 0 0,1 19,9A1,1 0 0,1 18,10M8,18V13.5H6L10,6V11H12L8,18Z"
        />
      </Svg>
    </CStation>
  );
};

export default Station;
