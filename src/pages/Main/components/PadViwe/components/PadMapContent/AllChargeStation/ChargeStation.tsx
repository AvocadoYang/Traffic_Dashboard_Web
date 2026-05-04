import { OpenChargeStationModal } from "@/pages/Main/jotai.ts";
import {
  ECSM,
  IsEditingQuickRoads,
  QuickRoadsArray,
} from "@/pages/Setting/utils/settingJotai";
import { Tooltip } from "antd";
import { useAtomValue, useSetAtom } from "jotai";
import React, { FC } from "react";
import styled from "styled-components";

const SvgStyle = styled.svg<{
  $isDisable: boolean;
  $isAlive: boolean;
  $booker: string;
  translate_x: number;
  translate_y: number;
  scale: number;
  rotate: number;
  left?: number;
  top?: number;
}>`
  width: 24px;
  height: 24px;
  padding: 2px;
  border-radius: 4px;
  transition: all 0.2s ease;
  opacity: ${({ $isDisable }) => ($isDisable ? 0.6 : 1)};
  fill: ${({ $isAlive }) => ($isAlive ? "#3c8aff" : "#999")};

  border: ${({ $isDisable }) =>
    $isDisable ? "2px solid #1890ff" : "1px dashed #727272"};

  box-shadow: ${({ $isDisable }) =>
    $isDisable ? "0 0 8px rgba(24, 144, 255, 0.3)" : "none"};

  transform: ${(props) =>
    `translate(${props.translate_x}em, ${props.translate_y}em) scale(${props.scale}) rotate(${props.rotate}deg)`};

  ${({ $booker, $isDisable }) =>
    $booker && !$isDisable
      ? `
        animation: pulse 2s infinite;
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.7);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(82, 196, 26, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(82, 196, 26, 0);
          }
        }
      `
      : ""}

  &:hover {
    transform: ${(props) =>
      `translate(${props.translate_x}em, ${props.translate_y}em) scale(${props.scale * 1.1}) rotate(${props.rotate}deg)`};

    background-color: "rgba(154, 255, 60, 0.5)";
  }
`;

const ChargeStation: FC<{
  locationId: string;
  isAlive: boolean;
  isDisable: boolean;
  customName: string;
  booker: string;
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
}> = ({
  locationId,
  isAlive,
  booker,
  isDisable,
  customName,
  translateX,
  translateY,
  rotate,
  scale,
}) => {
  const setLoc = useSetAtom(OpenChargeStationModal);

  return (
    <Tooltip title={customName}>
      <SvgStyle
        $isAlive={isAlive}
        $isDisable={isDisable}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        onClick={() => setLoc(locationId)}
        $booker={booker} // or pass some condition
        translate_x={translateX}
        translate_y={translateY}
        scale={scale}
        rotate={rotate}
      >
        <path d="M19.77,7.23L19.78,7.22L16.06,3.5L15,4.56L17.11,6.67C16.17,7.03 15.5,7.93 15.5,9A2.5,2.5 0 0,0 18,11.5C18.36,11.5 18.69,11.42 19,11.29V18.5A1,1 0 0,1 18,19.5A1,1 0 0,1 17,18.5V14A2,2 0 0,0 15,12H14V5A2,2 0 0,0 12,3H6A2,2 0 0,0 4,5V21H14V13.5H15.5V18.5A2.5,2.5 0 0,0 18,21A2.5,2.5 0 0,0 20.5,18.5V9C20.5,8.31 20.22,7.68 19.77,7.23M18,10A1,1 0 0,1 17,9A1,1 0 0,1 18,8A1,1 0 0,1 19,9A1,1 0 0,1 18,10M8,18V13.5H6L10,6V11H12L8,18Z" />
      </SvgStyle>
    </Tooltip>
  );
};

export default ChargeStation;
