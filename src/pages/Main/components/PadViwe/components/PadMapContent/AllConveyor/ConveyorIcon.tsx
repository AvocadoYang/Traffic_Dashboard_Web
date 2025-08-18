import React from "react";
import styled from "styled-components";
import { LoadingStation } from "../AllCargo/LoadingStation";
import { Conveyor_Info } from "@/types/peripheral";

type ConveyorStyle = {
  translate_x?: number;
  translate_y?: number;
  scale?: number;
  rotate?: number;
};

const ConveyorWrapper = styled.div<ConveyorStyle>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 1px 2px;
  background-color: #f0f0f0;
  border: 2px solid #555;
  border-radius: 12px;
  width: fit-content;
`;

const Belt = styled.div`
  width: 50px;
  height: 16px;
  background: repeating-linear-gradient(
    90deg,
    #888,
    #888 4px,
    #ccc 4px,
    #ccc 8px
  );
  border-radius: 8px;
  position: relative;
`;

const Box = styled.div`
  width: 24px;
  height: 24px;
  background-color: #d97706;
  border: 2px solid #92400e;
  border-radius: 4px;
  position: absolute;
  top: -20px;
`;
const ConveyorContainer = styled.div`
  position: relative;
  display: inline-block;
`;
const Arrow = styled.div<{ direction: "load" | "offload" }>`
  position: absolute;
  top: 50%;
  ${({ direction }) =>
    direction === "load"
      ? `
        left: -16px;
        transform: translate(-100%, -50%);
      `
      : `
        right: -16px;
        transform: translate(100%, -50%) rotate(180deg);
      `}
  width: 0;
  height: 0;
  border-left: 8px solid
    ${({ direction }) => (direction === "load" ? "#10b981" : "#ef4444")};
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
`;

const ConveyorIcon: React.FC<{
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
  info: Conveyor_Info | null;
}> = ({ translateX, translateY, rotate, scale, info }) => {
  if (!info) return <LoadingStation />;
  return (
    <ConveyorContainer
      style={{
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
      }}
    >
      {info.activeLoad && <Arrow direction="load" />}
      {info.activeOffload && <Arrow direction="offload" />}

      <ConveyorWrapper>
        <Belt>
          {info.cargo.length > 0 ? <Box style={{ left: "25%" }} /> : []}
        </Belt>
      </ConveyorWrapper>
    </ConveyorContainer>
  );
};

export default ConveyorIcon;
