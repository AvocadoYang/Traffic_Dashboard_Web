import {
  IsEditingQuickRoads,
  QuickRoadsArray,
} from "@/pages/Setting/utils/settingJotai";
import { Lift_Gate_Status } from "@/types/peripheral";
import { useAtomValue, useSetAtom } from "jotai";
import React, { FC } from "react";
import styled from "styled-components";

const GateContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const SvgStyle = styled.svg<{
  $status: Lift_Gate_Status;
}>`
  width: 24px;
  height: 24px;
  padding: 2px;
  border-radius: 4px;
  transition: all 0.2s ease;

  /* Change fill color based on status */
  fill: ${({ $status }) => {
    switch ($status) {
      case Lift_Gate_Status.OPENED:
        return "#52c41a"; // green
      case Lift_Gate_Status.OPENING:
        return "#1890ff"; // blue
      case Lift_Gate_Status.CLOSING:
        return "#faad14"; // orange
      case Lift_Gate_Status.CLOSED:
        return "#999"; // gray
      case Lift_Gate_Status.E_STOP:
      case Lift_Gate_Status.VFD_Alarm:
      case Lift_Gate_Status.System_Error:
        return "#ff4d4f"; // red
      default:
        return "#076aff";
    }
  }};

  /* Border changes */
  border: ${({ $status }) => {
    switch ($status) {
      case Lift_Gate_Status.E_STOP:
      case Lift_Gate_Status.VFD_Alarm:
      case Lift_Gate_Status.System_Error:
        return "2px solid #ff4d4f";
      case Lift_Gate_Status.OPENING:
      case Lift_Gate_Status.CLOSING:
        return "2px dashed #1890ff";
      default:
        return "1px dashed #727272";
    }
  }};

  /* Glow for errors */
  box-shadow: ${({ $status }) =>
    [
      Lift_Gate_Status.E_STOP,
      Lift_Gate_Status.VFD_Alarm,
      Lift_Gate_Status.System_Error,
    ].includes($status)
      ? "0 0 8px rgba(255, 77, 79, 0.4)"
      : "none"};

  &:hover {
    transform: scale(1.05);
    background-color: rgba(200, 200, 200, 0.3);
  }
`;

const LiftGate: FC<{
  locationId: string;
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
  status: Lift_Gate_Status;
}> = ({ locationId, translateX, translateY, rotate, scale, status }) => {
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
        $status={status}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <title>rolling door</title>
        <path d="M10 13H8V11H10V13M16 11H14V13H16V11M21 19V21H3V19H4V5C4 3.9 4.9 3 6 3H18C19.1 3 20 3.9 20 5V19H21M11 5H6V19H11V5M18 5H13V19H18V5Z" />
      </SvgStyle>
    </GateContainer>
  );
};

export default LiftGate;
