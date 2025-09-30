import {
  QuickMissionLoad,
  QuickMissionOffload,
  QuickMissionSettingMode,
  StartQuickMissionSetting,
} from "@/pages/Main/global/jotai";
import { Tooltip } from "antd";
import { useAtom, useSetAtom } from "jotai";
import React, { FC } from "react";
import styled from "styled-components";

interface ElevatorProps {
  locationId: string;
  hasCargo: boolean;
  isDisable: boolean;
  customName: string;
  isHaveAction?: boolean; // optional: for pulse effect
}

const SvgStyle = styled.svg<{
  $hasCargo: boolean;
  $isDisable: boolean;
  $isSelecting: boolean;
  $canBeClick: boolean;
  $isHaveAction: boolean;
}>`
  width: 24px;
  height: 24px;
  padding: 2px;
  border-radius: 4px;
  transition: all 0.2s ease;
  cursor: ${({ $isDisable, $isSelecting, $canBeClick }) =>
    $isDisable
      ? "not-allowed"
      : $isSelecting && !$canBeClick
        ? "not-allowed"
        : "pointer"};
  opacity: ${({ $isDisable }) => ($isDisable ? 0.6 : 1)};
  fill: ${({ $hasCargo }) => ($hasCargo ? "#ffe73c" : "#999")};

  border: ${({ $isSelecting, $canBeClick }) =>
    $isSelecting && $canBeClick ? "2px solid #1890ff" : "1px dashed #727272"};

  box-shadow: ${({ $isSelecting, $canBeClick }) =>
    $isSelecting && $canBeClick ? "0 0 8px rgba(24, 144, 255, 0.3)" : "none"};

  ${({ $isHaveAction, $isDisable }) =>
    $isHaveAction && !$isDisable
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
    transform: scale(1.05);
    background-color: ${({ $hasCargo }) =>
      $hasCargo ? "rgba(255, 231, 60, 0.5)" : "rgba(200,200,200,0.3)"};
  }
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
    /* Right face shadow */ 5px 5px 10px rgba(0, 0, 0, 0.5),
    /* Bottom face shadow */ -5px -5px 10px rgba(0, 0, 0, 0.3);
  /* 3D Box effect end */
`;

const Elevator: FC<{
  locationId: string;
  hasCargo: boolean;
  isDisable: boolean;
  isBook: boolean;
  customName: string;
}> = ({ locationId, hasCargo, isDisable, isBook, customName }) => {
  const [selectMode, setQuickSettingMode] = useAtom(QuickMissionSettingMode);
  const [isStartSelecting, setStartQuickSetting] = useAtom(
    StartQuickMissionSetting,
  );
  const setLoad = useSetAtom(QuickMissionLoad);
  const setOffload = useSetAtom(QuickMissionOffload);

  const canBeClickInSelection =
    isStartSelecting &&
    !isDisable &&
    ((selectMode === "load" && hasCargo) ||
      (selectMode === "offload" && !hasCargo));

  const handleQuickMissionPayload = () => {
    if (!isStartSelecting || !canBeClickInSelection || selectMode === null)
      return;

    if (selectMode === "load") {
      setLoad({
        missionType: "load",
        columnName: customName,
        locationId: locationId,
        level: 0,
      });
    } else if (selectMode === "offload") {
      setOffload({
        missionType: "offload",
        columnName: customName,
        locationId: locationId,
        level: 0,
      });
    }

    setStartQuickSetting(false);
    setQuickSettingMode(null);
  };

  return (
    <>
      {/* {hasCargo ? <CargoLight></CargoLight> : null} */}
      <Tooltip title={customName}>
        <SvgStyle
          $hasCargo={hasCargo}
          $isDisable={isDisable}
          $isSelecting={isStartSelecting}
          $canBeClick={isStartSelecting ? canBeClickInSelection : true}
          $isHaveAction={isBook} // or pass some condition
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          onClick={() => handleQuickMissionPayload()}
        >
          <path d="M9 9V11H7V9H5V11H3V9H1V21H3V19H5V21H7V19H9V21H11V19H13V21H15V19H17V21H19V19H21V21H23V9H21V11H19V9H17V11H15V9H13V11H11V9H9M3 13H5V17H3V13M7 13H9V17H7V13M11 13H13V17H11V13M15 13H17V17H15V13M19 13H21V17H19V13M7 4H11V2L17 5H13V7L7 4Z" />
        </SvgStyle>
      </Tooltip>
    </>
  );
};

export default Elevator;
