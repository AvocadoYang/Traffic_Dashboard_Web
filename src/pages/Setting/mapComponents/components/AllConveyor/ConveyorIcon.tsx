import React from "react";
import styled from "styled-components";
import { LoadingStation } from "../AllCargo.tsx/LoadingStation";
import { useAtomValue, useSetAtom } from "jotai";
import { IsEditPeripheralModal } from "../../../formComponent/forms/peripheralModal/jotai";
import { Conveyor_Info } from "@/types/peripheral";
import {
  IsEditingQuickRoads,
  QuickRoadsArray,
} from "@/pages/Setting/utils/settingJotai";

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
  width: 20px; /* Reduced size for better proportion */
  height: 20px;
  background-color: #ffd9ad;
  border: 2px solid #92400e;
  border-radius: 4px;
  position: absolute;
  top: -18px; /* Slightly closer to the belt */
  left: 50%; /* Center horizontally */
  transform: translateX(-50%); /* Adjust for true centering */
`;

const ConveyorContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const Arrow = styled.div<{ direction: "load" | "offload" }>`
  position: absolute;
  top: -6px; /* Position above the conveyor */
  ${({ direction }) =>
    direction === "load"
      ? `
        left: 18%; /* Offset to the left of center */
        transform: translate(-50%, -100%) rotate(0deg);
      `
      : `
        left: 82%; /* Offset to the right of center */
        transform: translate(-50%, -100%) rotate(180deg);
      `}
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 8px solid
    ${({ direction }) => (direction === "load" ? "#10b981" : "#ef4444")};
`;

const ConveyorIcon: React.FC<{
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
  info: Conveyor_Info | null;
}> = ({ translateX, translateY, rotate, scale, info }) => {
  const setIsEdit = useSetAtom(IsEditPeripheralModal);
  const quickRoad = useAtomValue(IsEditingQuickRoads);
  const setQuickRoadArr = useSetAtom(QuickRoadsArray);

  const handleCon = () => {
    if (!info) return;
    if (quickRoad) {
      setQuickRoadArr((prev) => [...prev, info.locationId]);
      return;
    }

    setIsEdit({
      stationType: "CONVEYOR",
      name: info.name,
      disable: info.disable,
      stationId: info.locationId,
      forkHeight: info.forkHeight,
      activeLoad: info.activeLoad,
      activeOffload: info.activeOffload,
      loadMissionId: info.loadMissionId,
      offloadMissionId: info.offloadMissionId,
      placement_priority: info.placement_priority,
      relationships: info.relationships,
      cargo: info.cargo,
    });
  };

  if (!info) return <LoadingStation />;
  return (
    <ConveyorContainer
      style={{
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
      }}
    >
      {info.activeLoad && <Arrow direction="load" />}
      {info.activeOffload && <Arrow direction="offload" />}

      <ConveyorWrapper onClick={handleCon}>
        <Belt>{info.cargo.length > 0 ? <Box /> : []}</Belt>
      </ConveyorWrapper>
    </ConveyorContainer>
  );
};

export default ConveyorIcon;
