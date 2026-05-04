import {
  QuickMissionLoad,
  QuickMissionOffload,
  QuickMissionSettingMode,
  StartQuickMissionSetting,
} from "@/jotai.ts";
import { useAtom, useSetAtom } from "jotai";
import { FC } from "react";
import styled from "styled-components";
import { Button } from "antd";

// Styled components for enhanced UI
const Block = styled(Button)<{
  $hasCargo: boolean;
  $isDisable: boolean;
  $isSelecting: boolean;
  $canBeClick: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ $hasCargo }) =>
    $hasCargo ? "#ffe73c80" : "#f5f5f580"};
  border: ${({ $isSelecting, $canBeClick }) =>
    $isSelecting && $canBeClick ? "2px solid #1890ff" : "1px dashed #727272"};
  border-radius: 3px;
  min-width: 15px;
  max-height: 15px;
  max-width: 100%;
  padding: 0 2px;
  transition: all 0.2s ease;
  position: relative;
  z-index: ${({ $isSelecting }) => ($isSelecting ? 50 : 1)};
  cursor: ${({ $isDisable, $isSelecting, $canBeClick }) =>
    $isDisable
      ? "not-allowed"
      : $isSelecting && !$canBeClick
        ? "not-allowed"
        : "pointer"};
  opacity: ${({ $isDisable }) => ($isDisable ? 0.6 : 1)};
  box-shadow: ${({ $isSelecting, $canBeClick }) =>
    $isSelecting && $canBeClick ? "0 0 8px rgba(24, 144, 255, 0.3)" : "none"};

  &:hover:not(:disabled) {
    background-color: ${({ $hasCargo }) =>
      $hasCargo ? "#ffe73cb3" : "#e8e8e8b3"};
    transform: scale(1.05);
  }

  &:disabled::after {
    content: "X";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #fff;
    font-size: 16px;
    font-weight: bold;
    background-color: rgba(113, 113, 113, 0.7);
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const BlockSpan = styled.span<{ rotate: number; $hasCargo: boolean }>`
  font-size: 12px;
  font-weight: 500;
  color: ${({ $hasCargo }) => ($hasCargo ? "#000" : "#333")};
  transform: ${({ rotate }) => `rotate(${-rotate}deg)`};
  white-space: nowrap;
  user-select: none;
  text-align: center;
`;

interface CargoDisplayProps {
  level: number;
  levelName: string;
  cargoValue: boolean;
  isDisable: boolean;
  locId: string;
  rotate: number;
  handleMouseDown: (
    e: React.MouseEvent<HTMLElement>,
    locId: string,
    level: number,
  ) => void;
}

const CargoDisplay: FC<CargoDisplayProps> = ({
  level,
  levelName,
  cargoValue,
  isDisable,
  locId,
  rotate,
  handleMouseDown,
}) => {
  const [selectMode, setQuickSettingMode] = useAtom(QuickMissionSettingMode);
  const [isStartSelecting, setStartQuickSetting] = useAtom(
    StartQuickMissionSetting,
  );
  const setLoad = useSetAtom(QuickMissionLoad);
  const setOffload = useSetAtom(QuickMissionOffload);

  const canBeClickInSelection =
    isStartSelecting &&
    !isDisable &&
    ((selectMode === "load" && cargoValue) ||
      (selectMode === "offload" && !cargoValue));

  const handleQuickMissionPayload = () => {
    if (!isStartSelecting || !canBeClickInSelection || selectMode === null)
      return;

    if (selectMode === "load") {
      setLoad({
        missionType: "load",
        columnName: levelName,
        locationId: locId,
        level,
      });
    } else if (selectMode === "offload") {
      setOffload({
        missionType: "offload",
        columnName: levelName,
        locationId: locId,
        level,
      });
    }

    setStartQuickSetting(false);
    setQuickSettingMode(null);
  };

  return (
    <Block
      $hasCargo={cargoValue}
      $isDisable={isDisable}
      $isSelecting={isStartSelecting}
      $canBeClick={isStartSelecting ? canBeClickInSelection : true}
      onMouseDown={(e) => handleMouseDown(e, locId, level)}
      onClick={isStartSelecting ? handleQuickMissionPayload : undefined}
      role="button"
    >
      <BlockSpan $hasCargo={cargoValue} rotate={rotate} id={locId}>
        {levelName}
      </BlockSpan>
    </Block>
  );
};

export default CargoDisplay;
