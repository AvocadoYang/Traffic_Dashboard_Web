import React from "react";
import styled from "styled-components";
import { LoadingStation } from "../AllCargo/LoadingStation";
import { Conveyor_Info } from "@/types/peripheral";
import { useAtom, useSetAtom } from "jotai";
import {
  QuickMissionLoad,
  QuickMissionOffload,
  QuickMissionSettingMode,
  StartQuickMissionSetting,
} from "@/jotai.ts";

const ConveyorContainer = styled.div`
  position: relative;
  display: inline-block;
`;

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

const ConveyorIcon: React.FC<{
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
  info: Conveyor_Info | null;
}> = ({ translateX, translateY, rotate, scale, info }) => {
  const [selectMode, setQuickSettingMode] = useAtom(QuickMissionSettingMode);
  const [isStartSelecting, setStartQuickSetting] = useAtom(
    StartQuickMissionSetting,
  );
  const setLoad = useSetAtom(QuickMissionLoad);
  const setOffload = useSetAtom(QuickMissionOffload);

  const canBeClickInSelection =
    (isStartSelecting &&
      info &&
      !info?.disable &&
      selectMode === "load" &&
      info?.cargo.length > 0) ||
    (selectMode === "offload" && info?.cargo.length === 0);

  const handleQuickMissionPayload = () => {
    if (!isStartSelecting || !canBeClickInSelection || selectMode === null)
      return;

    if (selectMode === "load") {
      setLoad({
        missionType: "load",
        columnName: info.name,
        locationId: info.locationId,
        level: 0,
      });
    } else if (selectMode === "offload") {
      setOffload({
        missionType: "offload",
        columnName: info.name,
        locationId: info.locationId,
        level: 0,
      });
    }

    setStartQuickSetting(false);
    setQuickSettingMode(null);
  };

  if (!info) return <LoadingStation />;
  return (
    <ConveyorContainer
      style={{
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
      }}
    >
      <SvgStyle
        $isSelecting={isStartSelecting}
        $canBeClick={isStartSelecting ? canBeClickInSelection : true}
        $isHaveAction={info.booker as boolean}
        onClick={() => handleQuickMissionPayload()}
        $hasCargo={info.cargo.length > 0}
        $isDisable={info.disable}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <title>aurora</title>
        <path d="M2 3C2.55 3 3 3.45 3 4V13H5V5C5 4.45 5.45 4 6 4C6.55 4 7 4.45 7 5V13H9V6C9 5.45 9.45 5 10 5C10.55 5 11 5.45 11 6V13H12.5C12.67 13 12.84 13 13 13.05V7C13 6.45 13.45 6 14 6C14.55 6 15 6.45 15 7V15.5C15 16.88 13.88 18 12.5 18H11.5C11.22 18 11 18.22 11 18.5C11 18.78 11.22 19 11.5 19H17V8C17 7.45 17.45 7 18 7C18.55 7 19 7.45 19 8V19H21V9C21 8.45 21.45 8 22 8C22.55 8 23 8.45 23 9V20C23 20.55 22.55 21 22 21H11.5C10.12 21 9 19.88 9 18.5C9 17.12 10.12 16 11.5 16H12.5C12.78 16 13 15.78 13 15.5C13 15.22 12.78 15 12.5 15H2C1.45 15 1 14.55 1 14V4C1 3.45 1.45 3 2 3Z" />
      </SvgStyle>
    </ConveyorContainer>
  );
};

export default ConveyorIcon;
