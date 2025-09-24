import { message } from "antd";
import { FC, memo, useCallback } from "react";

import { WrapperType } from "./types";
import styled from "styled-components";
import CargoDisplay from "./CargoDisplay";
import { CargoInfo } from "@/sockets/useCargoInfo";
import { useAtomValue, useSetAtom } from "jotai";
import { EditRoadPanelSwitch, EditZoneSwitch } from "@/utils/siderGloble";
import { LoadingStation } from "./LoadingStation";
import {
  IsEditingQuickRoads,
  QuickRoadsArray,
} from "@/pages/Setting/utils/settingJotai";
import { prefixLevelName } from "@/utils/globalFunction";
import { BaseGlobalCargoInfoModal, GlobalCargoData } from "./jotaiState";
import { useCargoMutations } from "@/api/useCargoMutations";

const Wrapper = styled.div<WrapperType>`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: ${({ flex_direction }) => flex_direction};
  width: max-content;
  gap: 0.35px;
  border-radius: 1px;
  transform: ${(props) =>
    `translate(${props.translatex}em, ${props.translatey}em) scale(${props.scale}) rotate(${props.rotate}deg)`};
`;

const MemoizedCargo = memo(CargoDisplay, (prevProps, nextProps) => {
  return (
    prevProps.level == nextProps.level &&
    prevProps.levelName == nextProps.levelName &&
    prevProps.cargoValue == nextProps.cargoValue &&
    prevProps.isDisable == nextProps.isDisable &&
    prevProps.rotate == nextProps.rotate
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
  shelfInfo,
  flex_direction,
}) => {
  const [messageApi, contextHolder] = message.useMessage();
  const openEditZone = useAtomValue(EditZoneSwitch);
  const openEditRoadPanel = useAtomValue(EditRoadPanelSwitch);
  const { editColumnMutation } = useCargoMutations(messageApi);
  const quickRoad = useAtomValue(IsEditingQuickRoads);
  const setQuickRoadArr = useSetAtom(QuickRoadsArray);

  const setBaseModal = useSetAtom(BaseGlobalCargoInfoModal);
  const setGlobalData = useSetAtom(GlobalCargoData);

  const handleQuickRoad = (locationId: string) => {
    if (!quickRoad) return;

    setQuickRoadArr((prev) => [...prev, locationId]);
  };

  const handleCargo = (data: {
    id: string;
    locationId: string;
    shelfInfo: CargoInfo;
  }) => {
    if (quickRoad) {
      handleQuickRoad(locId);
      return;
    }
    //console.log(data.shelfInfo.layer, ' cargo gloabl');
    if (openEditRoadPanel || openEditZone) return;
    setBaseModal(true);
    setGlobalData(data);
  };

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
  //console.log(shelfInfo);
  if (!shelfInfo || !shelfInfo.layer) return <LoadingStation />;
  return (
    <>
      {contextHolder}
      <Wrapper
        flex_direction={flex_direction}
        translatex={translateX}
        translatey={translateY}
        scale={scale}
        rotate={rotate}
        onClick={() => {
          handleCargo({
            id,
            locationId: locId,
            shelfInfo,
          });
        }}
      >
        {" "}
        {Object.entries(shelfInfo.layer).map(([levelStr, info]) => {
          const level = Number(levelStr);
          const cargoValue = info.cargo.length > 0;
          const isDisable = info.disable;

          return (
            <MemoizedCargo
              key={`${locId}-${level}`}
              level={level}
              levelName={prefixLevelName(info.levelName)}
              cargoValue={cargoValue}
              isDisable={isDisable}
              locId={locId}
              rotate={0}
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
      </Wrapper>
    </>
  );
};

export default memo(Cargo, (prev, next) => {
  return prev.locId !== next.locId;
});
