import React from "react";
import styled from "styled-components";
import { LoadingStation } from "../AllCargo/LoadingStation";
import { Conveyor_Info } from "@/types/peripheral";
import { useAtom, useSetAtom } from "jotai";
import {
  CargoPanelTarget,
  QuickMissionLoad,
  QuickMissionOffload,
  QuickMissionSettingMode,
  StartQuickMissionSetting,
} from "@/pages/Main/global/jotai";

const ConveyorContainer = styled.div`
  position: relative;
  display: inline-block;

  /* 圖示只有 24px,手指不好點,往外多留一圈點擊範圍 */
  &::before {
    content: "";
    position: absolute;
    inset: -6px;
  }
`;

const MAX_VISIBLE_CARGO = 5;

// 輸送帶上堆了幾筆貨就顯示幾個方塊,最左邊是下一個會被取走的(先進先出)
const CargoQueue = styled.div`
  position: absolute;
  left: calc(100% + 3px);
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
`;

const CargoSquare = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 1px;
  background: #ffe73c;
  border: 1px solid #b39a00;
  box-sizing: border-box;
`;

const CargoOverflow = styled.span`
  font-size: 9px;
  line-height: 1;
  font-weight: 600;
  color: #7a6800;
`;

const SvgStyle = styled.svg<{
  $hasCargo: boolean;
  $isDisable: boolean;
  $isSelecting: boolean;
  $canBeClick: boolean;
  $isHaveAction: boolean;
}>`
  /* 疊在外圈點擊範圍上面,hover 效果才吃得到 */
  position: relative;
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
  const openCargoPanel = useSetAtom(CargoPanelTarget);

  const canBeClickInSelection =
    isStartSelecting &&
    !!info &&
    !info.disable &&
    ((selectMode === "load" && info.cargo.length > 0) ||
      (selectMode === "offload" && info.cargo.length === 0));

  const handleQuickMissionPayload = () => {
    if (!isStartSelecting) {
      if (info) openCargoPanel({ type: "CONVEYOR", locationId: info.locationId });
      return;
    }
    if (!canBeClickInSelection || selectMode === null) return;

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

  const queuedCargo = [...info.cargo].sort(
    (a, b) => a.placement_order - b.placement_order,
  );
  const hiddenCount = queuedCargo.length - MAX_VISIBLE_CARGO;

  return (
    <ConveyorContainer
      style={{
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
      }}
      // 點旁邊的貨物方塊也算點到輸送帶
      onClick={() => handleQuickMissionPayload()}
    >
      <SvgStyle
        $isSelecting={isStartSelecting}
        $canBeClick={isStartSelecting ? canBeClickInSelection : true}
        $isHaveAction={info.booker as boolean}
        $hasCargo={info.cargo.length > 0}
        $isDisable={info.disable}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <title>aurora</title>
        <path d="M2 3C2.55 3 3 3.45 3 4V13H5V5C5 4.45 5.45 4 6 4C6.55 4 7 4.45 7 5V13H9V6C9 5.45 9.45 5 10 5C10.55 5 11 5.45 11 6V13H12.5C12.67 13 12.84 13 13 13.05V7C13 6.45 13.45 6 14 6C14.55 6 15 6.45 15 7V15.5C15 16.88 13.88 18 12.5 18H11.5C11.22 18 11 18.22 11 18.5C11 18.78 11.22 19 11.5 19H17V8C17 7.45 17.45 7 18 7C18.55 7 19 7.45 19 8V19H21V9C21 8.45 21.45 8 22 8C22.55 8 23 8.45 23 9V20C23 20.55 22.55 21 22 21H11.5C10.12 21 9 19.88 9 18.5C9 17.12 10.12 16 11.5 16H12.5C12.78 16 13 15.78 13 15.5C13 15.22 12.78 15 12.5 15H2C1.45 15 1 14.55 1 14V4C1 3.45 1.45 3 2 3Z" />
      </SvgStyle>
      {queuedCargo.length > 0 && (
        <CargoQueue>
          {queuedCargo.slice(0, MAX_VISIBLE_CARGO).map((c, i) => (
            <CargoSquare
              key={c.cargoInfoId ?? i}
              title={c.customId ?? undefined}
            />
          ))}
          {hiddenCount > 0 && <CargoOverflow>+{hiddenCount}</CargoOverflow>}
        </CargoQueue>
      )}
    </ConveyorContainer>
  );
};

export default ConveyorIcon;
