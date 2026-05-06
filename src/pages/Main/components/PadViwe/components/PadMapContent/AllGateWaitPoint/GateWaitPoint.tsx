import {
  IsEditingQuickRoads,
  QuickRoadsArray,
} from "@/pages/Setting/utils/settingJotai";
import { useAtomValue, useSetAtom } from "jotai";
import React, { FC } from "react";
import styled from "styled-components";

const GateContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const SvgStyle = styled.svg<{}>`
  width: 24px;
  height: 24px;
  padding: 2px;
  border-radius: 4px;
  transition: all 0.2s ease;

  fill: #076aff;
  border: 1px dashed #727272;
  box-shadow: none;

  &:hover {
    transform: scale(1.05);
    background-color: "rgba(200,200,200,0.3)";
  }
`;

const GateWaitPoint: FC<{
  locationId: string;
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
}> = ({ locationId, translateX, translateY, rotate, scale }) => {
  const quickRoad = useAtomValue(IsEditingQuickRoads);
  const setQuickRoadArr = useSetAtom(QuickRoadsArray);

  const handleCon = () => {
    if (quickRoad) {
      setQuickRoadArr((prev) => [...prev, locationId]);
      return;
    }
  };

  return (
    <GateContainer
      style={{
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
      }}
    >
      <SvgStyle
        onClick={() => handleCon()}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <title>gate wait point</title>
        <path d="M19.5,18A1.5,1.5 0 0,1 21,19.5A1.5,1.5 0 0,1 19.5,21A1.5,1.5 0 0,1 18,19.5A1.5,1.5 0 0,1 19.5,18M17,5.92L11,9V18.03C13.84,18.19 16,19 16,20C16,21.1 13.31,22 10,22C6.69,22 4,21.1 4,20C4,19.26 5.21,18.62 7,18.27V20H9V2L17,5.92Z" />
      </SvgStyle>
    </GateContainer>
  );
};

export default GateWaitPoint;
