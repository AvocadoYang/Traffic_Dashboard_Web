import {
  QuickMissionLoad,
  QuickMissionOffload,
  QuickMissionSettingMode,
  StartQuickMissionSetting,
} from "@/pages/Main/jotai.ts";
import { useAtom, useSetAtom } from "jotai";
import { FC } from "react";
import styled from "styled-components";
import { Button } from "antd";

const InfoBlock = styled.div`
  position: absolute;
  z-index: 200;
  top: -70px;
  left: 50%;
  transform: translateX(-50%);
  min-width: 120px;
  padding: 8px 12px;
  background-color: rgba(255, 255, 255, 0.98);
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  box-shadow:
    0 3px 6px -4px rgba(0, 0, 0, 0.12),
    0 6px 16px 0 rgba(0, 0, 0, 0.08),
    0 9px 28px 8px rgba(0, 0, 0, 0.05);
  display: none;
  pointer-events: none;
  font-size: 12px;
  color: #595959;

  &::before {
    content: "";
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    width: 10px;
    height: 10px;
    background-color: white;
    border-right: 1px solid #e8e8e8;
    border-bottom: 1px solid #e8e8e8;
  }

  .label {
    color: #8c8c8c;
    margin-right: 8px;
  }

  .value {
    font-weight: 500;
    color: #262626;
  }
`;

const Block = styled(Button)<{
  $hasCargo: boolean;
  $isDisable: boolean;
  $isSelecting: boolean;
  $canBeClick: boolean;
  $isHaveAction: boolean;
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
  flex-grow: 1;
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

  &:hover + ${InfoBlock} {
    display: block;
  }

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

const BlockContainer = styled.div`
  position: relative;
  display: inline-block;
`;

interface CargoDisplayProps {
  level: number;
  levelName: string;
  cargoValue: boolean;
  isDisable: boolean;
  isHaveAction: boolean;
  booker: string;
  locId: string;
  rotate: number;
  handleMouseDown: (
    e: React.MouseEvent<HTMLElement>,
    locId: string,
    level: number
  ) => void;
}

const CargoDisplay: FC<CargoDisplayProps> = ({
  level,
  levelName,
  cargoValue,
  isDisable,
  isHaveAction,
  booker,
  locId,
  rotate,
  handleMouseDown,
}) => {
  const [selectMode, setQuickSettingMode] = useAtom(QuickMissionSettingMode);
  const [isStartSelecting, setStartQuickSetting] = useAtom(
    StartQuickMissionSetting
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
    <BlockContainer>
      <Block
        $hasCargo={cargoValue}
        $isDisable={isDisable}
        $isSelecting={isStartSelecting}
        $canBeClick={isStartSelecting ? canBeClickInSelection : true}
        $isHaveAction={isHaveAction}
        disabled={isDisable}
        onMouseDown={(e) => handleMouseDown(e, locId, level)}
        onClick={isStartSelecting ? handleQuickMissionPayload : undefined}
        role="button"
      >
        <BlockSpan $hasCargo={cargoValue} rotate={rotate} id={locId}>
          {levelName}
        </BlockSpan>
      </Block>
      <InfoBlock>
        <div>
          <span className="label">Booker:</span>
          <span className="value">{booker || "None"}</span>
        </div>
        <div>
          <span className="label">Disable:</span>
          <span className="value">{isDisable ? "yes" : "none"}</span>
        </div>
      </InfoBlock>
    </BlockContainer>
  );
};

export default CargoDisplay;
