import React from "react";
import styled, { keyframes, css } from "styled-components";
import { Stack_Info } from "@/types/peripheral";
import { useAtom, useSetAtom } from "jotai";
import {
  QuickMissionLoad,
  QuickMissionOffload,
  QuickMissionSettingMode,
  StartQuickMissionSetting,
} from "@/pages/Main/global/jotai";

const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.7);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(82, 196, 26, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(82, 196, 26, 0);
  }
`;

const StackContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const StackSvg = styled.svg<{
  $cargoCount: number;
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

  /* Dynamic background based on cargo count */
  background: ${({ $cargoCount }) => {
    if ($cargoCount === 0) return "#999"; // Gray - empty
    if ($cargoCount === 1) return "#52c41a"; // Full green - 1 cargo
    if ($cargoCount === 2)
      return "linear-gradient(90deg, #52c41a 50%, #1890ff 50%)"; // Green + Blue
    if ($cargoCount === 3)
      return "linear-gradient(90deg, #52c41a 33.33%, #1890ff 33.33%, #faad14 66.66%)"; // Green + Blue + Orange
    if ($cargoCount >= 4)
      return "linear-gradient(90deg, #52c41a 25%, #1890ff 25%, #faad14 50%, #722ed1 75%)"; // Green + Blue + Orange + Purple
    return "#999";
  }};

  border: ${({ $isSelecting, $canBeClick }) =>
    $isSelecting && $canBeClick ? "2px solid #1890ff" : "1px solid #727272"};

  box-shadow: ${({ $isSelecting, $canBeClick }) =>
    $isSelecting && $canBeClick ? "0 0 8px rgba(24, 144, 255, 0.3)" : "none"};

  ${({ $isHaveAction, $isDisable }) =>
    $isHaveAction && !$isDisable
      ? css`
          animation: ${pulse} 2s infinite;
        `
      : ""}

  &:hover {
    transform: scale(1.1);
    filter: brightness(1.1);
  }

  /* Icon color - white for visibility on colored backgrounds */
  fill: ${({ $cargoCount }) => ($cargoCount > 0 ? "#ffffff" : "#666666")};
`;

const CargoCountBadge = styled.div<{ $count: number }>`
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: ${({ $count }) => {
    if ($count === 0) return "#8c8c8c";
    if ($count === 1) return "#52c41a";
    if ($count === 2) return "#1890ff";
    if ($count === 3) return "#faad14";
    return "#ff4d4f";
  }};
  border: 2px solid #ffffff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 10;
`;

const Stack: React.FC<{ info: Stack_Info | undefined }> = ({ info }) => {
  const [selectMode, setQuickSettingMode] = useAtom(QuickMissionSettingMode);
  const [isStartSelecting, setStartQuickSetting] = useAtom(
    StartQuickMissionSetting,
  );
  const setLoad = useSetAtom(QuickMissionLoad);
  const setOffload = useSetAtom(QuickMissionOffload);

  const cargoCount = info?.cargo?.length || 0;

  const canBeClickInSelection =
    (isStartSelecting &&
      info &&
      !info?.disable &&
      selectMode === "load" &&
      cargoCount > 0) ||
    (selectMode === "offload" && cargoCount < 4); // Assuming max 4 cargo

  const handleQuickMissionPayload = () => {
    if (!isStartSelecting || !canBeClickInSelection || selectMode === null)
      return;

    if (selectMode === "load") {
      setLoad({
        missionType: "load",
        columnName: info?.name as string,
        locationId: info?.locationId as string,
        level: 0,
      });
    } else if (selectMode === "offload") {
      setOffload({
        missionType: "offload",
        columnName: info?.name as string,
        locationId: info?.locationId as string,
        level: 0,
      });
    }

    setStartQuickSetting(false);
    setQuickSettingMode(null);
  };

  if (!info) {
    return (
      <StackContainer>
        <StackSvg
          $cargoCount={0}
          $isDisable={true}
          $isSelecting={false}
          $canBeClick={false}
          $isHaveAction={false}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <path d="M2,2H4V20H2V2M22,2H20V20H22V2M6,10V14H18V10H6M6,2V6H18V2H6M6,18V22H18V18H6Z" />
        </StackSvg>
      </StackContainer>
    );
  }

  return (
    <StackContainer>
      {cargoCount > 0 && (
        <CargoCountBadge $count={cargoCount}>{cargoCount}</CargoCountBadge>
      )}
      <StackSvg
        $cargoCount={cargoCount}
        $isDisable={info.disable}
        $isSelecting={isStartSelecting}
        $canBeClick={isStartSelecting ? canBeClickInSelection : true}
        $isHaveAction={!!info.booker}
        onClick={handleQuickMissionPayload}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <title>Stack - {cargoCount} cargo(s)</title>
        <path d="M2,2H4V20H2V2M22,2H20V20H22V2M6,10V14H18V10H6M6,2V6H18V2H6M6,18V22H18V18H6Z" />
      </StackSvg>
    </StackContainer>
  );
};

export default Stack;
