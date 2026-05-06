import {
  EEM,
  IsEditingQuickRoads,
  QuickRoadsArray,
} from "@/pages/Setting/utils/settingJotai";
import { Tooltip } from "antd";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import React, { FC } from "react";
import styled from "styled-components";

const SvgStyle = styled.svg<{
  $hasCargo: boolean;
  $isDisable: boolean;
}>`
  width: 24px;
  height: 24px;
  padding: 2px;
  border-radius: 4px;
  transition: all 0.2s ease;
  opacity: ${({ $isDisable }) => ($isDisable ? 0.6 : 1)};
  fill: ${({ $hasCargo }) => ($hasCargo ? "#ffe73c" : "#999")};

  border: ${({ $isDisable }) =>
    $isDisable ? "2px solid #1890ff" : "1px dashed #727272"};

  box-shadow: ${({ $isDisable }) =>
    $isDisable ? "0 0 8px rgba(24, 144, 255, 0.3)" : "none"};

  &:hover {
    transform: scale(1.05);
    background-color: ${({ $hasCargo }) =>
      $hasCargo ? "rgba(255, 231, 60, 0.5)" : "rgba(200,200,200,0.3)"};
  }
`;

const Elevator: FC<{
  locationId: string;
  hasCargo: boolean;
  isDisable: boolean;
  customName: string;
}> = ({ locationId, hasCargo, isDisable, customName }) => {
  const setElevatorModal = useSetAtom(EEM);
  const quickRoad = useAtomValue(IsEditingQuickRoads);
  const setQuickRoadArr = useSetAtom(QuickRoadsArray);

  const handleQuickRoad = (locationId: string) => {
    if (!quickRoad) return;

    setQuickRoadArr((prev) => [...prev, locationId]);
  };

  const handleEdit = () => {
    if (quickRoad) {
      handleQuickRoad(locationId);
      return;
    }
    setElevatorModal({ locationId, isOpen: true });
  };

  return (
    <>
      {/* {hasCargo ? <CargoLight></CargoLight> : null} */}
      <Tooltip title={customName}>
        <SvgStyle
          $hasCargo={hasCargo}
          $isDisable={isDisable}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          onClick={() => handleEdit()}
        >
          <path d="M9 9V11H7V9H5V11H3V9H1V21H3V19H5V21H7V19H9V21H11V19H13V21H15V19H17V21H19V19H21V21H23V9H21V11H19V9H17V11H15V9H13V11H11V9H9M3 13H5V17H3V13M7 13H9V17H7V13M11 13H13V17H11V13M15 13H17V17H15V13M19 13H21V17H19V13M7 4H11V2L17 5H13V7L7 4Z" />
        </SvgStyle>
      </Tooltip>
    </>
  );
};

export default Elevator;
