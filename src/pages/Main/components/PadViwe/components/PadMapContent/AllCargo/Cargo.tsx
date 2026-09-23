import { message, Popover } from "antd";
import { FC, memo, useCallback, useMemo } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { WrapperType } from "./types";
import styled from "styled-components";
import CargoDisplay from "./CargoDisplay";
import { CargoInfo } from "@/sockets/useCargoInfo";
import { LoadingStation } from "./LoadingStation";
import { useCargoMutations } from "@/api/useCargoMutations";
import { prefixLevelName } from "@/utils/globalFunction";
import {
  QuickMissionHoverCell,
  QuickMissionLoad,
  QuickMissionOffload,
  QuickMissionPickerLoc,
  QuickMissionSettingMode,
  StartQuickMissionSetting,
} from "@/pages/Main/global/jotai";
import ShelfLevelPicker, {
  getModeColor,
  isLevelSelectable,
  PickLevel,
} from "./ShelfLevelPicker";

const Wrapper = styled.div<
  WrapperType & { $dim: boolean; $glow: string | null }
>`
  position: relative;
  z-index: ${({ $glow }) => ($glow ? 40 : 1)};
  display: flex;
  flex-direction: ${({ flex_direction }) => flex_direction};
  width: max-content;
  align-items: center;
  gap: 0.35px;
  border-radius: 1px;
  transform: ${(props) =>
    `translate(${props.translatex}em, ${props.translatey}em) scale(${props.scale}) rotate(${props.rotate}deg)`};
  transition: opacity 0.2s;

  /* 選取儲位時，沒有可選層的貨架壓暗並且不吃點擊，避免擋到旁邊重疊的貨架 */
  ${({ $dim }) =>
    $dim
      ? `
        opacity: 0.3;
        pointer-events: none;
      `
      : ""}

  ${({ $glow }) =>
    $glow
      ? `
        outline: 2px solid ${$glow};
        outline-offset: 2px;
        border-radius: 4px;
      `
      : ""}
`;

// 多層貨架在選取模式下蓋一層，整個貨架變成一個大的點擊目標
const PickOverlay = styled.div<{ $color: string }>`
  position: absolute;
  inset: -3px;
  z-index: 60;
  cursor: pointer;
  border-radius: 4px;

  &:hover {
    background: ${({ $color }) => $color}22;
    box-shadow: 0 0 0 3px ${({ $color }) => $color}88;
  }
`;

const MemoizedCargo = memo(CargoDisplay, (prevProps, nextProps) => {
  return (
    prevProps.level == nextProps.level &&
    prevProps.levelName == nextProps.levelName &&
    prevProps.cargoValue == nextProps.cargoValue &&
    prevProps.isDisable == nextProps.isDisable &&
    prevProps.rotate == nextProps.rotate &&
    prevProps.isHaveAction === nextProps.isHaveAction
  );
});

const Cargo: FC<{
  id: string;
  locId: string;
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
  flex_direction: string;
  shelfInfo: CargoInfo | undefined;
}> = ({
  id,
  locId,
  translateX,
  translateY,
  rotate,
  scale,
  flex_direction,
  shelfInfo,
}) => {
  const [messageApi, contextHolder] = message.useMessage();

  const isSelecting = useAtomValue(StartQuickMissionSetting);
  const [selectMode, setQuickSettingMode] = useAtom(QuickMissionSettingMode);
  const setStartQuickSetting = useSetAtom(StartQuickMissionSetting);
  const setLoad = useSetAtom(QuickMissionLoad);
  const setOffload = useSetAtom(QuickMissionOffload);
  const [pickerLoc, setPickerLoc] = useAtom(QuickMissionPickerLoc);
  const setHoverCell = useSetAtom(QuickMissionHoverCell);

  const { editColumnMutation } = useCargoMutations(messageApi);
  const handleMouseDown = useCallback(
    (
      event: React.MouseEvent<HTMLDivElement>,
      targetId: string,
      targetLevel: number
    ) => {
      if (event.button !== 1) return;
      editColumnMutation.mutate({
        id,
        locationId: targetId,
        level: targetLevel,
      });
    },
    [editColumnMutation]
  );

  const levels: PickLevel[] = useMemo(
    () =>
      Object.entries(shelfInfo?.layer ?? {}).map(([levelStr, info]) => ({
        level: Number(levelStr),
        levelName: info.levelName,
        hasCargo: info.cargo.length > 0,
        disable: info.disable,
        booker: info.booker,
      })),
    [shelfInfo?.layer]
  );

  const isMultiLevel = levels.length > 1;
  const selectableCount = levels.filter((l) =>
    isLevelSelectable(selectMode, l.hasCargo, l.disable)
  ).length;
  const isPicking = isSelecting && selectMode !== null;
  const modeColor = selectMode ? getModeColor(selectMode).main : null;

  const handlePick = (level: number) => {
    const target = levels.find((l) => l.level === level);
    if (!target || !selectMode) return;
    const payload = {
      missionType: selectMode,
      columnName: prefixLevelName(target.levelName),
      locationId: locId,
      level,
    };
    if (selectMode === "load") setLoad(payload);
    else setOffload(payload);

    setStartQuickSetting(false);
    setQuickSettingMode(null);
    setPickerLoc(null);
    setHoverCell(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      if (isPicking && isMultiLevel && selectableCount > 0) setPickerLoc(locId);
      return;
    }
    setPickerLoc((cur) => (cur === locId ? null : cur));
  };

  if (!shelfInfo || !shelfInfo.layer) return <LoadingStation />;

  const wrapper = (
    <Wrapper
      flex_direction={flex_direction}
      translatex={translateX}
      translatey={translateY}
      scale={scale}
      rotate={rotate}
      $dim={isPicking && selectableCount === 0}
      $glow={isPicking && selectableCount > 0 ? modeColor : null}
    >
      {" "}
      {Object.entries(shelfInfo.layer).map(([levelStr, info]) => {
        const level = Number(levelStr);
        const cargoValue = info.cargo.length > 0;
        const isDisable = info.disable;
        const isHaveAction = info.booker !== null;

        return (
          <MemoizedCargo
            key={`${locId}-${level}`}
            level={level}
            levelName={prefixLevelName(info.levelName)}
            cargoValue={cargoValue}
            isDisable={isDisable}
            booker={info.booker === null ? "nobody" : info.booker}
            locId={locId}
            rotate={0}
            isHaveAction={isHaveAction}
            handleMouseDown={(e) =>
              handleMouseDown(
                e as React.MouseEvent<HTMLDivElement>,
                locId,
                level
              )
            }
          />
        );
      })}
      {isPicking && isMultiLevel && selectableCount > 0 && modeColor && (
        <PickOverlay $color={modeColor} />
      )}
    </Wrapper>
  );

  return (
    <>
      {contextHolder}
      {isMultiLevel ? (
        <Popover
          open={isPicking && pickerLoc === locId}
          onOpenChange={handleOpenChange}
          trigger="click"
          placement="right"
          arrow
          content={
            <ShelfLevelPicker
              locId={locId}
              mode={selectMode ?? "load"}
              levels={levels}
              onSelect={handlePick}
              onHover={(level) =>
                setHoverCell(level === null ? null : { locationId: locId, level })
              }
            />
          }
        >
          {wrapper}
        </Popover>
      ) : (
        wrapper
      )}
    </>
  );
};

export default memo(Cargo, (prev, next) => {
  return (
    prev.locId !== next.locId && prev.flex_direction !== next.flex_direction
  );
});
