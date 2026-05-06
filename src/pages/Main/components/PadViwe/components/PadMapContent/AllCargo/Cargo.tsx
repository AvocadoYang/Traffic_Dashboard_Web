import { message } from "antd";
import { FC, memo, useCallback } from "react";

import { WrapperType } from "./types";
import styled from "styled-components";
import CargoDisplay from "./CargoDisplay";
import { CargoInfo } from "@/sockets/useCargoInfo";
import { LoadingStation } from "./LoadingStation";
import { useCargoMutations } from "@/api/useCargoMutations";
import { prefixLevelName } from "@/utils/globalFunction";

const Wrapper = styled.div<WrapperType>`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: ${({ flex_direction }) => flex_direction};
  width: max-content;
  align-items: center;
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
      </Wrapper>
    </>
  );
};

export default memo(Cargo, (prev, next) => {
  return (
    prev.locId !== next.locId && prev.flex_direction !== next.flex_direction
  );
});
